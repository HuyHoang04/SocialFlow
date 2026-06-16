# app/routes/keys.py
"""API key management and status endpoints"""
from fastapi import APIRouter

router = APIRouter(prefix="/keys", tags=["Key Management"])

# Will be set by app startup
_ai_service = None


def set_ai_service(ai_service):
    global _ai_service
    _ai_service = ai_service


@router.get("/status")
async def get_key_status():
    """Get status of all OpenRouter API keys (active, cooldown, request counts)"""
    if not _ai_service:
        return {"error": "AI service not initialized"}

    rotator = _ai_service.openrouter_provider.rotator
    return {
        "success": True,
        **rotator.get_status()
    }


@router.post("/reset")
async def reset_cooldowns():
    """Reset all key cooldowns (emergency recovery)"""
    if not _ai_service:
        return {"error": "AI service not initialized"}

    rotator = _ai_service.openrouter_provider.rotator
    rotator.reset_cooldowns()
    return {
        "success": True,
        "message": "All key cooldowns have been reset",
        **rotator.get_status()
    }
