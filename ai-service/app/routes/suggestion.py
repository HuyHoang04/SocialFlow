from fastapi import APIRouter, Depends, HTTPException
from app.models.suggestion_models import SuggestReplyRequest, SuggestReplyResponse
from app.services.suggestion_service import SuggestionService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(tags=["suggestion"])

def get_suggestion_service() -> SuggestionService:
    return SuggestionService()

@router.post("/suggest-reply", response_model=SuggestReplyResponse)
async def suggest_reply(
    request: SuggestReplyRequest, 
    service: SuggestionService = Depends(get_suggestion_service)
) -> SuggestReplyResponse:
    """
    Generate an AI-powered reply suggestion for an inbox message or comment.
    Leverages RAG context if available for the brand.
    """
    logger.info(f"Route: /suggest-reply called for brand {request.brand_id}")
    
    result = await service.suggest_reply(request)
    
    if not result.success:
        logger.error(f"Suggestion failed: {result.error}")
        raise HTTPException(status_code=500, detail=result.error)
        
    return result
