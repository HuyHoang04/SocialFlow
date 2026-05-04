# Model listing routes
from fastapi import APIRouter, Depends
from app.models import ModelsResponse, RefreshModelsResponse
from app.services.ai_service import AIService
from app.utils.logger import setup_logger
from datetime import datetime

logger = setup_logger(__name__)

router = APIRouter(tags=["models"])

def get_ai_service() -> AIService:
    """Get AI service singleton"""
    from app.main import ai_service
    return ai_service

@router.get("/models", response_model=ModelsResponse)
async def list_models(ai_service: AIService = Depends(get_ai_service)):
    """List all available models from both providers with pricing info"""
    logger.info("Listing available models")
    models = ai_service.get_available_models()
    return ModelsResponse(
        groq=models["groq"],
        openrouter=models["openrouter"]
    )

@router.post("/refresh-models", response_model=RefreshModelsResponse)
async def refresh_models(ai_service: AIService = Depends(get_ai_service)):
    """Manually refresh model lists from provider APIs"""
    logger.info(" Manual model refresh triggered")
    await ai_service.refresh_models()
    return {
        "status": "success",
        "message": "Models refreshed from provider APIs",
        "timestamp": datetime.now().isoformat()
    }
