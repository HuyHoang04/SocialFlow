# Health check routes
from fastapi import APIRouter
from app.models import HealthResponse
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(tags=["health"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    logger.info("Health check requested")
    return {
        "status": "ok",
        "service": "ai-service",
        "version": "2.0.0"
    }
