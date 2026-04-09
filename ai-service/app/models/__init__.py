# Models and DTOs
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# ========== Base Response Model ==========

class BaseResponse(BaseModel):
    """Base response model with common fields"""
    success: bool
    error: Optional[str] = None
    provider: str
    model: Optional[str] = None
    cost: float


class TextResponse(BaseResponse):
    """Response model for text generation (provider level)"""
    content: str
    token_count: int


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


class RewriteRequest(BaseModel):
    """Request model for content rewriting"""
    content: str
    tone: str  # "professional", "casual", "humorous", "inspirational", "technical"
    platform: str = "general"
    provider: Optional[str] = None
    model: Optional[str] = None


class RewriteResponse(BaseModel):
    """Response model for content rewriting"""
    original_content: str
    rewritten_content: str
    tone_applied: str
    provider: str
    model: Optional[str] = None
    cost: float
    tokens: int
    success: bool
    error: Optional[str] = None


class KeywordOptimizationRequest(BaseModel):
    """Request model for keyword/hashtag optimization"""
    content: str
    keywords: Optional[List[str]] = None  # Optional existing keywords to enhance
    platform: str = "general"
    max_hashtags: int = 10
    provider: Optional[str] = None
    model: Optional[str] = None


class KeywordOptimizationResponse(BaseModel):
    """Response model for keyword/hashtag optimization"""
    hashtags: List[str]  # Suggested hashtags
    keywords: List[str]  # Suggested keywords
    trending_topics: Optional[List[str]] = None  # Trending related topics
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


class ImageGenerationRequest(BaseModel):
    """Request model for image generation"""
    prompt: str
    style: Optional[str] = None  # "photorealistic", "illustration", "anime", "abstract", "3d", "sketch"
    platform: str = "general"  # "instagram", "twitter", "general", etc.
    width: int = 1024
    height: int = 1024
    count: int = 1  # Number of images to generate (1-10)
    provider: Optional[str] = None  # "stable_diffusion" or "openrouter"
    model: Optional[str] = None  # Specific model ID


class ImageGenerationResponse(BaseModel):
    """Response model for image generation"""
    images: List[Dict[str, Any]]  # List of {base64, seed, finish_reason}
    provider: str
    model: Optional[str] = None
    cost: float
    image_count: int
    success: bool
    error: Optional[str] = None


class ImageResponse(BaseResponse):
    """Response model for image generation (provider level)"""
    images: List[Dict[str, Any]]
    image_count: int


class ImageModelsResponse(BaseModel):
    """Response model for available image models"""
    pixazo: dict  # Pixazo FREE Stable Diffusion
    openrouter: Optional[dict] = None  # OpenRouter paid fallback


class EmbeddingRequest(BaseModel):
    """Request model for text embedding"""
    brand_id: str  # REQUIRED - which brand owns these embeddings
    texts: List[str]  # Texts to embed (required)
    images: Optional[List[str]] = None  # URLs or base64 images (for multimodal models)
    provider: Optional[str] = None  # "groq" or "openrouter", None for auto-fallback
    model: Optional[str] = None  # Specific model, None for default


class EmbeddingResponse(BaseModel):
    """Response model for text embedding"""
    embeddings: List[List[float]]  # List of embedding vectors
    provider: str  # Which provider was used
    model: Optional[str] = None  # Model name
    dimension: int  # Vector dimension (768, 1536, etc.)
    token_count: int  # Total tokens used
    embedding_count: int  # Number of embeddings generated
    cost: float  # Cost in USD
    success: bool
    error: Optional[str] = None


class EmbeddingModelsResponse(BaseModel):
    """Response model for available embedding models"""
    groq: dict  # {"model_name": {"dimension": 768, "supports_images": False, ...}}
    openrouter: dict  # Similar structure
    success: bool = True
