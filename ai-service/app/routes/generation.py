# Content generation routes
from fastapi import APIRouter, HTTPException, Depends
from app.models import (
    ContentRequest, ContentResponse, 
    RewriteRequest, RewriteResponse, 
    KeywordOptimizationRequest, KeywordOptimizationResponse,
    ImageGenerationRequest, ImageGenerationResponse,
    ImageModelsResponse, CaptionBatchRequest
)
from app.services.ai_service import AIService
from app.utils.logger import setup_logger
from app.prompts import format_content_generation_prompt, format_rewrite_prompt, format_optimization_prompt

logger = setup_logger(__name__)

router = APIRouter(tags=["generation"])

def get_ai_service() -> AIService:
    """Get AI service singleton"""
    from app.main import ai_service
    return ai_service

@router.post("/generate-caption-batch")
async def generate_caption_batch(request: CaptionBatchRequest, ai_service: AIService = Depends(get_ai_service)):
    """Generate batch of 3 captions using 3-step pipeline"""
    logger.info(f"Batch generation requested for brand: {request.brand_id}")
    try:
        captions = await ai_service.generate_caption_batch(
            brand_id=request.brand_id,
            platforms=request.platforms,
            category=request.category,
            tone=request.tone,
            user_brief=request.user_brief,
            scheduled_time=request.scheduled_time,
            provider=request.provider,
            model=request.model,
            use_rag=request.use_rag
        )
        return captions
    except Exception as e:
        logger.error(f"Batch generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-content", response_model=ContentResponse)
async def generate_content(request: ContentRequest, ai_service: AIService = Depends(get_ai_service)) -> ContentResponse:
    """
    Main content generation endpoint
    Uses dual provider strategy (Groq primary, OpenRouter fallback)
    """
    
    logger.info("Content generation requested")
    logger.info(f"   Prompt: {request.prompt[:50]}...")
    logger.info(f"   Tone: {request.tone}")
    logger.info(f"   Platform: {request.platform}")
    logger.info(f"   Max Words: {request.max_words}")
    
    # Build full prompt with context using formatter
    full_prompt = format_content_generation_prompt(request.prompt, request.platform, request.tone)
    
    # Generate content with optional provider/model selection
    result = await ai_service.generate_content(
        full_prompt,
        provider=request.provider,
        model=request.model,
        max_words=request.max_words
    )
    
    if not result["success"]:
        logger.error(f"Content generation failed: {result['error']}")
        raise HTTPException(status_code=500, detail=result["error"])
    
    logger.info(f"Success | Provider: {result['provider']} | Model: {result.get('model', 'N/A')} | Cost: ${result['cost']:.6f}")
    
    return ContentResponse(**result)

@router.post("/rewrite-content", response_model=RewriteResponse)
async def rewrite_content(request: RewriteRequest, ai_service: AIService = Depends(get_ai_service)) -> RewriteResponse:
    """
    Rewrite content with specified tone adjustment
    Supported tones: professional, casual, humorous, inspirational, technical
    """
    
    logger.info("Content rewrite requested")
    logger.info(f"   Original: {request.content[:50]}...")
    logger.info(f"   Tone: {request.tone}")
    logger.info(f"   Platform: {request.platform}")
    logger.info(f"   Max Words: {request.max_words}")
    
    result = await ai_service.rewrite_content(
        content=request.content,
        tone=request.tone,
        provider=request.provider,
        model=request.model,
        max_words=request.max_words
    )
    
    if not result["success"]:
        logger.error(f"Content rewrite failed: {result['error']}")
        raise HTTPException(status_code=500, detail=result["error"])
    
    logger.info(f"Rewrite success | Tone: {result['tone_applied']} | Cost: ${result['cost']:.6f}")
    
    return RewriteResponse(**result)

@router.post("/optimize-keywords", response_model=KeywordOptimizationResponse)
async def optimize_keywords(request: KeywordOptimizationRequest, ai_service: AIService = Depends(get_ai_service)) -> KeywordOptimizationResponse:
    """
    Suggest hashtags and keywords for content optimization
    """
    
    logger.info("Keyword optimization requested")
    logger.info(f"   Content: {request.content[:50]}...")
    logger.info(f"   Platform: {request.platform}")
    logger.info(f"   Max hashtags: {request.max_hashtags}")
    logger.info(f"   Max Words: {request.max_words}")
    
    result = await ai_service.optimize_keywords(
        content=request.content,
        keywords=request.keywords,
        platform=request.platform,
        max_hashtags=request.max_hashtags,
        provider=request.provider,
        model=request.model,
        max_words=request.max_words
    )
    
    if not result["success"]:
        logger.error(f"Keyword optimization failed: {result['error']}")
        raise HTTPException(status_code=500, detail=result["error"])
    
    logger.info(f"Optimization success | Hashtags: {len(result['hashtags'])} | Keywords: {len(result['keywords'])} | Cost: ${result['cost']:.6f}")
    
    return KeywordOptimizationResponse(**result)

@router.post("/test")
async def test_endpoint(ai_service: AIService = Depends(get_ai_service)):
    """Quick test endpoint"""
    logger.info("Test endpoint called")
    result = await ai_service.generate_content("Say hello in one word!")
    return result

@router.post("/generate-image", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest, ai_service: AIService = Depends(get_ai_service)) -> ImageGenerationResponse:
    """
    Image generation endpoint
    Supports: Pixazo (FREE primary), OpenRouter (paid fallback)
    """
    
    logger.info("Image generation requested")
    logger.info(f"   Prompt: {request.prompt[:50]}...")
    logger.info(f"   Style: {request.style}")
    logger.info(f"   Provider: {request.provider or 'auto (Pixazo primary)'}")
    logger.info(f"   Size: {request.width}x{request.height}")
    logger.info(f"   Count: {request.count}")
    
    result = await ai_service.generate_image(
        prompt=request.prompt,
        style=request.style,
        platform=request.platform,
        width=request.width,
        height=request.height,
        count=request.count,
        provider=request.provider,
        model=request.model
    )
    
    # Handle both dict and Pydantic model responses
    if hasattr(result, 'dict'):
        result = result.dict()
    
    if not result["success"]:
        logger.error(f"Image generation failed: {result['error']}")
        raise HTTPException(status_code=500, detail=result["error"])
    
    image_count = result.get("image_count", len(result.get("images", [])))
    provider = result.get("provider", "unknown")
    cost = result.get("cost", 0.0)
    logger.info(f"Image generation success | Images: {image_count} | Provider: {provider} | Cost: ${cost:.6f}")
    
    return ImageGenerationResponse(**result)

@router.get("/image-models", response_model=ImageModelsResponse)
async def get_image_models(ai_service: AIService = Depends(get_ai_service)) -> ImageModelsResponse:
    """
    Get available image generation models
    - Pixazo: 100% FREE Stable Diffusion (SD 3.5, 3, XL, Lightning, 1.5)
    - OpenRouter: Paid fallback ($0.10/image)
    """
    
    logger.info("Fetching available image models (Pixazo + OpenRouter)")
    
    models = ai_service.get_available_image_models()
    
    return ImageModelsResponse(**models)
