# Models and DTOs
from pydantic import BaseModel
from typing import Optional

class ContentRequest(BaseModel):
    """Request model for content generation"""
    prompt: str
    tone: str = "professional"
    platform: str = "general"
    provider: Optional[str] = None  # "groq" or "openrouter", None for auto-fallback
    model: Optional[str] = None  # Specific model, None for default


class ContentResponse(BaseModel):
    """Response model for content generation"""
    content: str
    provider: str
    model: Optional[str] = None
    cost: float
    tokens: int
    success: bool
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    service: str
    version: str


class ModelsResponse(BaseModel):
    """Response model for available models"""
    groq: dict
    openrouter: dict


class RefreshModelsResponse(BaseModel):
    """Response model for model refresh"""
    status: str
    message: str
    timestamp: str
