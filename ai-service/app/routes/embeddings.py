# Embedding generation routes
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from app.models import EmbeddingRequest, EmbeddingResponse, EmbeddingModelsResponse
from app.services.embedding_service import EmbeddingService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(tags=["embeddings"])

# Global embedding service instance
embedding_service: Optional[EmbeddingService] = None

def get_embedding_service() -> EmbeddingService:
    """Get embedding service singleton"""
    global embedding_service
    if embedding_service is None:
        embedding_service = EmbeddingService()
    return embedding_service


@router.get("/embedding-models", response_model=EmbeddingModelsResponse)
async def get_embedding_models(service: EmbeddingService = Depends(get_embedding_service)) -> EmbeddingModelsResponse:
    """
    Get available embedding models from all providers
    Includes metadata: dimension, supports_images, cost, etc.
    """
    try:
        logger.info("Fetching available embedding models...")
        
        models = await service.get_embedding_models()
        
        return EmbeddingModelsResponse(
            groq=models.get("groq", {}),
            openrouter=models.get("openrouter", {}),
            success=True
        )
    
    except Exception as e:
        logger.error(f"Failed to fetch embedding models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embed", response_model=EmbeddingResponse)
async def embed(request: EmbeddingRequest, service: EmbeddingService = Depends(get_embedding_service)) -> EmbeddingResponse:

    try:
        logger.info("Embedding request received")
        logger.info(f"   Brand: {request.brand_id}")
        logger.info(f"   Texts: {len(request.texts)}")
        logger.info(f"   Provider: {request.provider or 'openrouter (default)'}")
        logger.info(f"   Model: {request.model}")
        
        # Generate embeddings (OpenRouter only)
        # Provider will automatically check if model supports images
        result = await service.embed(
            brand_id=request.brand_id,
            texts=request.texts,
            provider=request.provider, 
            model=request.model,
            images=request.images
        )
        
        if not result["success"]:
            logger.error(f"Embedding failed: {result.get('error')}")
            raise HTTPException(status_code=500, detail=result.get("error"))
        
        logger.info(f"Embedding success | Provider: {result['provider']} | Model: {result.get('model')} | Dimension: {result.get('dimension')} | Cost: ${result['cost']:.6f}")
        
        return EmbeddingResponse(
            embeddings=result["embeddings"],
            provider=result["provider"],
            model=result.get("model"),
            dimension=result.get("dimension", 0),
            token_count=result.get("token_count", 0),
            embedding_count=result.get("embedding_count", len(result.get("embeddings", []))),
            cost=result["cost"],
            success=True
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
