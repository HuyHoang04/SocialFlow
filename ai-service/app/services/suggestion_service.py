from typing import Optional, Dict, Any, List
from app.models.suggestion_models import SuggestReplyRequest, SuggestReplyResponse
from app.services.ai_service import AIService
from app.services.rag_service import RagService
from app.prompts import format_suggest_reply_prompt
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

class SuggestionService:
    def __init__(self):
        self.ai_service = AIService()
        self.rag_service = RagService()

    async def suggest_reply(self, request: SuggestReplyRequest) -> SuggestReplyResponse:
        """
        Generate an AI-powered reply suggestion using Brand context and RAG
        """
        try:
            logger.info(f"Generating AI reply suggestion for brand: {request.brand_id}")
            
            # 1. Search RAG library for context
            rag_context = ""
            rag_used = False
            
            try:
                # Search with the incoming message to find relevant FAQ or guidelines
                search_results = await self.rag_service.search_similar_chunks(
                    brand_id=request.brand_id,
                    query_text=request.message_content,
                    limit=3,
                    threshold=0.3
                )
                
                if search_results:
                    rag_used = True
                    rag_context = "\n\nRelevant Context from Brand Knowledge Base:\n"
                    for i, res in enumerate(search_results):
                        rag_context += f"[{i+1}] {res['text']}\n"
                    logger.info(f"✓ RAG context found (results: {len(search_results)})")
            except Exception as e:
                logger.warning(f"RAG search failed for suggestion, proceeding without context: {e}")

            # 2. Build the specialized prompt
            prompt = format_suggest_reply_prompt(
                brand_name=request.brand_name or "our brand",
                brand_description=request.brand_description or "a professional business",
                platform=request.platform,
                message_type=request.message_type,
                customer_name=request.customer_name or "the customer",
                message_content=request.message_content,
                rag_context=rag_context
            )

            # 3. Call AI Service
            result = await self.ai_service.generate_content(
                prompt=prompt,
                provider=request.provider,
                model=request.model,
                max_words=request.max_words
            )

            if not result.get("success"):
                return SuggestReplyResponse(
                    success=False,
                    error=result.get("error", "AI generation failed")
                )

            return SuggestReplyResponse(
                success=True,
                suggestion=result.get("content"),
                provider=result.get("provider"),
                model=result.get("model"),
                rag_used=rag_used
            )

        except Exception as e:
            logger.error(f"Error in suggest_reply service: {e}")
            return SuggestReplyResponse(
                success=False,
                error=str(e)
            )
