# app/routes/stream.py
"""SSE streaming endpoints for real-time AI generation"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import asyncio

router = APIRouter(prefix="/stream", tags=["Streaming"])

# Will be set by app startup
_ai_service = None


def set_ai_service(ai_service):
    global _ai_service
    _ai_service = ai_service


class StreamCaptionRequest(BaseModel):
    brand_id: str
    platforms: List[str] = ["general"]
    category: str = "Promotional"
    tone: str = "casual"
    user_brief: str = ""
    use_rag: bool = False
    scheduled_time: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None


@router.post("/generate-captions")
async def stream_generate_captions(request: StreamCaptionRequest):
    """
    Stream caption generation via Server-Sent Events (SSE).
    Sends progress events during generation, then the final captions.
    
    Event types:
    - status: Progress updates (e.g., "Building brand context...", "Generating captions...")
    - chunk: Partial text as it arrives (for streaming models)
    - result: Final JSON array of captions
    - error: Error message
    - done: Stream complete
    """

    async def event_generator():
        try:
            if not _ai_service:
                yield f"data: {json.dumps({'type': 'error', 'data': 'AI service not initialized'})}\n\n"
                return

            # Step 1: Brand context
            yield f"data: {json.dumps({'type': 'status', 'data': 'Building brand context...'})}\n\n"
            await asyncio.sleep(0.05)  # Small delay to ensure client receives

            brand_ctx = await _ai_service.brand_context.build_context_with_analytics(
                request.brand_id, request.scheduled_time
            )

            # Step 2: RAG context (if enabled)
            if request.use_rag:
                yield f"data: {json.dumps({'type': 'status', 'data': 'Searching brand knowledge base...'})}\n\n"
                try:
                    from app.services.rag_service import RagService
                    rag_service = RagService()
                    rag_results = await rag_service.search_similar_chunks(
                        brand_id=request.brand_id,
                        query_text=request.user_brief,
                        limit=3,
                        threshold=0.3,
                        provider=request.provider,
                        model=request.model
                    )
                    if rag_results:
                        rag_text = "\n\n".join([f"- {r.get('text', '')}" for r in rag_results])
                        brand_ctx += f"\n\n[Brand Content Library Guidelines / Reference Data]:\n{rag_text}"
                        yield f"data: {json.dumps({'type': 'status', 'data': f'Found {len(rag_results)} brand references'})}\n\n"
                except Exception:
                    pass

            # Step 3: Refine prompt
            yield f"data: {json.dumps({'type': 'status', 'data': 'Crafting AI prompt...'})}\n\n"
            refined_prompt = await _ai_service.prompt_refiner.refine_caption_prompt(
                user_brief=request.user_brief,
                platforms=request.platforms,
                category=request.category,
                tone=request.tone,
                brand_context=brand_ctx,
                analytics_context=brand_ctx
            )

            # Step 4: Generate with AI
            yield f"data: {json.dumps({'type': 'status', 'data': 'AI is writing captions...'})}\n\n"

            from app.config import DEFAULT_GROQ_MODEL
            provider = request.provider or "groq"
            model = request.model or DEFAULT_GROQ_MODEL

            raw_result = await _ai_service.generate_content(
                prompt=refined_prompt,
                provider=provider,
                model=model,
                max_words=300
            )

            if not raw_result.get("success"):
                yield f"data: {json.dumps({'type': 'error', 'data': raw_result.get('error', 'Generation failed')})}\n\n"
                return

            # Step 5: Filter and return
            yield f"data: {json.dumps({'type': 'status', 'data': 'Polishing captions...'})}\n\n"
            clean_captions = _ai_service.response_filter.filter_caption_response(raw_result["content"])

            yield f"data: {json.dumps({'type': 'result', 'data': clean_captions})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
