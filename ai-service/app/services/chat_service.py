# Chat Service - Conversational AI with Memory
from typing import Optional, List, Dict, Any
from app.services.rag_service import RagService
from app.utils.logger import setup_logger
from app.prompts import CHAT_SYSTEM_PROMPT, format_chat_rag_prompt, format_chat_reference_prompt
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import httpx
from app.config import JAVA_BACKEND_URL

logger = setup_logger(__name__)

# No longer using local Postgres history in Python service
# Java backend handles persistence

class ChatService:
    """Service for handling multi-turn conversations with RAG and memory"""
    
    def __init__(self):
        from app.services.ai_service import AIService
        self.rag_service = RagService()
        self.ai_service = AIService()
        
    async def chat(
        self, 
        brand_id: str, 
        user_id: str,
        session_id: str, 
        user_message: str,
        context_data: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        image_model: Optional[str] = None,
        image_provider: Optional[str] = None,
        embedding_model: Optional[str] = None,
        embedding_provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main chat function using LangChain.
        1. Retrieves context from RAG.
        2. Fetches history from Postgres (stateless read).
        3. Generates response using LangChain LLMChain.
        4. Backgrounds enrichment and Java notification.
        """
        try:
            logger.info(f"Chat request (LangChain) | User: {user_id} | Session: {session_id}")
            
            # 1. RAG Search
            context_chunks = await self.rag_service.search_similar_chunks(
                brand_id=brand_id,
                query_text=user_message,
                limit=3,
                threshold=0.1
            )
            context_text = "\n\n".join([c["text"] for c in context_chunks])
            
            # 2. Prepare LLM
            selected_provider = provider or "groq"
            from langchain_groq import ChatGroq
            from langchain_openai import ChatOpenAI
            from app.config import GROQ_API_KEY, OPENROUTER_API_KEY, DEFAULT_GROQ_MODEL, DEFAULT_OPENROUTER_MODEL
            
            if selected_provider == "groq":
                llm = ChatGroq(
                    groq_api_key=GROQ_API_KEY,
                    model_name=model or DEFAULT_GROQ_MODEL,
                    temperature=0.7
                )
            else:
                llm = ChatOpenAI(
                    openai_api_key=OPENROUTER_API_KEY,
                    openai_api_base="https://openrouter.ai/api/v1",
                    model_name=model or DEFAULT_OPENROUTER_MODEL,
                    temperature=0.7
                )
            
            # 3. Load History from Postgres (stateless read - Java handles writes)
            from langchain.memory import ConversationBufferMemory
            from langchain.schema import HumanMessage, AIMessage
            import psycopg
            from app.config import DB_URL
            
            history_messages = []
            try:
                async with await psycopg.AsyncConnection.connect(DB_URL, autocommit=True) as conn:
                    async with conn.cursor() as cur:
                        from uuid import UUID
                        # DEBUG: Check if any messages exist at all
                        await cur.execute("SELECT count(*) FROM chat_message")
                        total_msgs = (await cur.fetchone())[0]
                        logger.info(f"DEBUG: Total messages in chat_message table: {total_msgs}")
                        
                        if total_msgs > 0:
                            await cur.execute("SELECT session_id FROM chat_message LIMIT 1")
                            sample_sid = (await cur.fetchone())[0]
                            logger.info(f"DEBUG: Sample session_id in DB: {sample_sid} (Type: {type(sample_sid)})")

                        # Fetch last 10 messages for this session
                        await cur.execute(
                            "SELECT role, content FROM chat_message WHERE session_id = %s::uuid ORDER BY created_at DESC LIMIT 10",
                            (session_id,)
                        )
                        rows = await cur.fetchall()
                        logger.info(f"Loaded {len(rows)} messages from history for session {session_id}")
                        if not rows:
                            # Try one more time without the ::uuid cast just in case
                            await cur.execute("SELECT role, content FROM chat_message WHERE session_id = %s ORDER BY created_at DESC LIMIT 10", (session_id,))
                            rows = await cur.fetchall()
                            if rows:
                                logger.info(f"Loaded {len(rows)} messages using fallback query")
                        # Reverse to get chronological order
                        for role, content in reversed(rows):
                            logger.info(f"  - History: {role}: {content[:50]}...")
                            if role == "user":
                                history_messages.append(HumanMessage(content=content))
                            else:
                                history_messages.append(AIMessage(content=content))
                        
                        # Remove the last message if it's the same as the current user message
                        # (Java saves it before calling Python)
                        if history_messages and isinstance(history_messages[-1], HumanMessage):
                            if history_messages[-1].content == user_message:
                                logger.info("Removing duplicate current message from history")
                                history_messages.pop()
            except Exception as db_err:
                logger.warning(f"Could not load chat history: {db_err}")

            memory = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True
            )
            memory.chat_memory.add_messages(history_messages)
            
            # 4. Prepare Prompt & Chain
            from langchain.chains import LLMChain
            from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
            from app.prompts import CHAT_SYSTEM_PROMPT, format_chat_rag_prompt, format_chat_reference_prompt
            
            prompt_template = ChatPromptTemplate.from_messages([
                ("system", CHAT_SYSTEM_PROMPT),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}")
            ])
            
            # Build final human input with RAG context
            human_input = format_chat_rag_prompt(user_message, context_text)
            if context_data:
                reference_block = format_chat_reference_prompt(context_data)
                human_input = f"{reference_block}\n\n{human_input}"
                
            chain = LLMChain(llm=llm, prompt=prompt_template, memory=memory, verbose=False)
            
            # 5. Execute Chain
            response = await chain.ainvoke({"input": human_input})
            answer = response.get("text", response.get("answer", ""))
            
            # 6. Background Enrichment & Notification
            import asyncio
            asyncio.create_task(self._process_enrichment_and_notify(
                brand_id=brand_id,
                user_id=user_id,
                session_id=session_id,
                answer=answer,
                success=True,
                image_model=image_model,
                image_provider=image_provider
            ))
            
            # 7. Add processing hint if JSON is detected
            display_answer = answer
            if "```json" in answer:
                display_answer += "\n\n*(Hệ thống đang tiến hành khởi tạo nội dung và sinh ảnh minh họa. Bạn sẽ thấy các bản nháp xuất hiện trong mục Chiến dịch sau vài giây...)*"
            
            return {
                "answer": display_answer,
                "source_documents": context_chunks,
                "session_id": session_id,
                "success": True,
                "suggested_entities": None
            }
            
        except Exception as e:
            logger.error(f"Chat service error: {e}")
            return {
                "answer": "I'm sorry, I encountered an error processing your request.",
                "session_id": session_id,
                "success": False,
                "error": str(e)
            }

    async def _process_enrichment_and_notify(self, brand_id: str, user_id: str, session_id: str, answer: str, success: bool, image_model: str = None, image_provider: str = None):
        """Background task to extract JSON, generate images, and notify Java"""
        try:
            if not success:
                return

            # 1. Extract JSON entities (this might trigger image generation)
            suggested_entities = await self._extract_json_entities(brand_id, user_id, answer, image_model, image_provider)
            
            # 2. Notify Java Backend
            # Even if no entities, we notify so Java can confirm completion if needed
            # but usually we only callback if there's data to save (Campaigns/Posts)
            if suggested_entities:
                logger.info(f"Enrichment complete for {session_id}, notifying Java...")
                await self._notify_java_backend(brand_id, user_id, session_id, answer, suggested_entities)
            else:
                logger.info(f"No entities found to enrich for {session_id}")
                
        except Exception as e:
            logger.error(f"Error in background enrichment task: {e}")
            
    async def _extract_json_entities(self, brand_id: str, user_id: str, text: str, image_model: str = None, image_provider: str = None):
        """Extract JSON block and optionally generate images. Returns structured data for Java to save."""
        import json
        import re
        import uuid
        
        # Find json block
        match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if not match:
            return None
            
        try:
            raw_json = match.group(1).strip()
            data = json.loads(raw_json)
            
            # 1. Process Posts (Auto-image generation)
            posts_data = data.get("posts", [])
            if posts_data:
                for p in posts_data:
                    image_prompt = p.get("image_prompt")
                    media_filenames = p.get("mediaFilenames", [])
                    
                    # Auto-generate image if prompt is provided and no media yet
                    if image_prompt and not media_filenames:
                        try:
                            logger.info(f"Auto-generating image for post: {image_prompt[:50]}... | Model: {image_model} | Provider: {image_provider}")
                            img_result = await self.ai_service.generate_image(
                                prompt=image_prompt,
                                model=image_model,
                                provider=image_provider
                            )
                            if img_result.get("success") and img_result.get("images"):
                                new_files = [img.get("url") or img.get("filename") for img in img_result["images"]]
                                p["mediaFilenames"] = [f for f in new_files if f]
                        except Exception as img_err:
                            logger.error(f"Auto-image-gen error: {img_err}")
                            
            return data # Return the enriched JSON (with image filenames) to Java
            
        except Exception as e:
            logger.error(f"JSON extraction error: {e}")
            return None

    async def _notify_java_backend(self, brand_id: str, user_id: str, session_id: str, answer: str, entities: dict):
        """Push results to Java backend callback endpoint"""
        try:
            url = f"{JAVA_BACKEND_URL}/api/chat/callback"
            payload = {
                "brand_id": brand_id,
                "user_id": user_id,
                "session_id": session_id,
                "answer": answer,
                "suggested_entities": entities,
                "success": True
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                logger.info(f"Java callback status: {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to notify Java backend: {e}")

    async def clear_session(self, session_id: str):
        """History is managed by Java, so this is now a no-op in Python"""
        return True
