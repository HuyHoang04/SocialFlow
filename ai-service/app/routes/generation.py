# Content generation routes
from fastapi import APIRouter, HTTPException, Depends
from app.models import ContentRequest, ContentResponse
from app.services.ai_service import AIService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(tags=["generation"])

def get_ai_service() -> AIService:
    """Get AI service singleton"""
    from app.main import ai_service
    return ai_service

@router.post("/generate-content", response_model=ContentResponse)
async def generate_content(request: ContentRequest, ai_service: AIService = Depends(get_ai_service)) -> ContentResponse:
    """
    Main content generation endpoint
    Uses dual provider strategy (Groq primary, OpenRouter fallback)
    """
    
    logger.info(f"📝 Content generation requested")
    logger.info(f"   Prompt: {request.prompt[:50]}...")
    logger.info(f"   Tone: {request.tone}")
    logger.info(f"   Platform: {request.platform}")
    
    # Build full prompt with context
    full_prompt = f"""
You are an expert social media content creator.

Platform: {request.platform}
Tone: {request.tone}

Task: {request.prompt}

Requirements:
- Create engaging, authentic content
- Match the specified tone
- Optimized for {request.platform}
- Keep it concise and impactful
"""
    
    # Generate content with optional provider/model selection
    result = await ai_service.generate_content(
        full_prompt,
        provider=request.provider,
        model=request.model
    )
    
    if not result["success"]:
        logger.error(f"Content generation failed: {result['error']}")
        raise HTTPException(status_code=500, detail=result["error"])
    
    logger.info(f"✅ Success | Provider: {result['provider']} | Model: {result.get('model', 'N/A')} | Cost: ${result['cost']:.6f}")
    
    return ContentResponse(**result)

@router.post("/test")
async def test_endpoint(ai_service: AIService = Depends(get_ai_service)):
    """Quick test endpoint"""
    logger.info("🧪 Test endpoint called")
    result = await ai_service.generate_content("Say hello in one word!")
    return result
