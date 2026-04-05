# AI Service - Business logic layer
import asyncio
from typing import Dict, Any, Optional
from app.config import (
    DEFAULT_GROQ_MODEL, 
    DEFAULT_OPENROUTER_MODEL, 
    FALLBACK_OPENROUTER_MODEL,
    DEFAULT_IMAGE_MODEL,
    DEFAULT_IMAGE_PROVIDER,
    ENABLE_FALLBACK,
    ENABLE_IMAGE_FALLBACK,
)
from app.providers.groq_provider import GroqProvider
from app.providers.openrouter_provider import OpenRouterProvider
from app.providers.pixazo_provider import PixazoProvider
from app.utils.logger import setup_logger
from app.utils.formatting import format_model_info
from app.prompts import (
    VALID_TONES,
    get_tone_description,
    format_rewrite_prompt,
    format_optimization_prompt,
    format_content_generation_prompt,
)

logger = setup_logger(__name__)

class AIService:
    """Business logic for AI content generation"""
    
    def __init__(self):
        self.groq_provider = GroqProvider()
        self.openrouter_provider = OpenRouterProvider()
        self.pixazo_provider = PixazoProvider()
    
    async def refresh_models(self):
        """Refresh model lists from all providers (text and image)"""
        logger.info("Refreshing model lists from all providers...")
        await asyncio.gather(
            self.groq_provider.fetch_models(),
            self.openrouter_provider.fetch_models(),
            self.openrouter_provider.fetch_image_models(),
            self.pixazo_provider.fetch_models(),
            return_exceptions=True
        )
        logger.info("Model refresh complete")
    
    def get_available_models(self) -> Dict[str, Any]:
        """Get all available models with formatted pricing"""
        groq_models = self.groq_provider.models_cache or self.groq_provider.hardcoded_models
        openrouter_models = self.openrouter_provider.models_cache or self.openrouter_provider.hardcoded_models
        
        return {
            "groq": {
                model_id: format_model_info(model_info)
                for model_id, model_info in groq_models.items()
            },
            "openrouter": {
                model_id: format_model_info(model_info)
                for model_id, model_info in openrouter_models.items()
            }
        }
    
    async def generate_content(
        self,
        prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate content with specified provider and model
        Falls back to free OpenRouter model if primary fails
        """
        
        # Set defaults
        if provider is None:
            provider = "groq"
        if provider == "groq" and model is None:
            model = DEFAULT_GROQ_MODEL
        elif provider == "openrouter" and model is None:
            model = DEFAULT_OPENROUTER_MODEL
        
        # Generate with specified provider
        if provider == "groq":
            try:
                return await self.groq_provider.generate(prompt, model)
            except Exception as groq_error:
                logger.warning(f"Groq failed, trying fallback to OpenRouter...")
                try:
                    return await self.openrouter_provider.generate(prompt, FALLBACK_OPENROUTER_MODEL)
                except Exception as fallback_error:
                    logger.error(f"Both providers failed")
                    return {
                        "content": "I apologize, but I'm unable to generate content right now.",
                        "provider": "none",
                        "model": None,
                        "cost": 0,
                        "tokens": 0,
                        "success": False,
                        "error": f"Both providers failed: {str(groq_error)} | {str(fallback_error)}"
                    }
        
        elif provider == "openrouter":
            try:
                return await self.openrouter_provider.generate(prompt, model)
            except Exception as e:
                logger.error(f"OpenRouter failed: {e}")
                return {
                    "content": "I apologize, but I'm unable to generate content right now.",
                    "provider": "none",
                    "model": model,
                    "cost": 0,
                    "tokens": 0,
                    "success": False,
                    "error": f"OpenRouter failed: {str(e)}"
                }
        
        else:
            return {
                "content": "Invalid provider. Use 'groq' or 'openrouter'.",
                "provider": "none",
                "cost": 0,
                "tokens": 0,
                "success": False,
                "error": f"Unknown provider: {provider}"
            }
    
    async def rewrite_content(
        self,
        content: str,
        tone: str,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Rewrite content with specified tone
        Supported tones: professional, casual, humorous, inspirational, technical
        """
        tone_lower = tone.lower()
        
        if tone_lower not in VALID_TONES:
            return {
                "original_content": content,
                "rewritten_content": content,
                "tone_applied": tone,
                "provider": "none",
                "success": False,
                "cost": 0,
                "tokens": 0,
                "error": f"Invalid tone. Use one of: {', '.join(VALID_TONES)}"
            }
        
        # Build rewrite prompt using formatter
        rewrite_prompt = format_rewrite_prompt(content, tone_lower)
        
        # Set defaults
        if provider is None:
            provider = "groq"
        if provider == "groq" and model is None:
            model = DEFAULT_GROQ_MODEL
        elif provider == "openrouter" and model is None:
            model = DEFAULT_OPENROUTER_MODEL
        
        # Rewrite with specified provider
        if provider == "groq":
            try:
                result = await self.groq_provider.generate(rewrite_prompt, model)
                return {
                    "original_content": content,
                    "rewritten_content": result["content"],
                    "tone_applied": tone_lower,
                    "provider": result["provider"],
                    "model": result.get("model"),
                    "cost": result["cost"],
                    "tokens": result["tokens"],
                    "success": result["success"],
                    "error": result.get("error")
                }
            except Exception as groq_error:
                logger.warning(f"Groq rewrite failed, trying fallback...")
                try:
                    result = await self.openrouter_provider.generate(rewrite_prompt, FALLBACK_OPENROUTER_MODEL)
                    return {
                        "original_content": content,
                        "rewritten_content": result["content"],
                        "tone_applied": tone_lower,
                        "provider": result["provider"],
                        "model": result.get("model"),
                        "cost": result["cost"],
                        "tokens": result["tokens"],
                        "success": result["success"],
                        "error": result.get("error")
                    }
                except Exception as fallback_error:
                    return {
                        "original_content": content,
                        "rewritten_content": content,
                        "tone_applied": tone_lower,
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "tokens": 0,
                        "error": f"Both providers failed: {str(groq_error)} | {str(fallback_error)}"
                    }
        
        elif provider == "openrouter":
            try:
                result = await self.openrouter_provider.generate(rewrite_prompt, model)
                return {
                    "original_content": content,
                    "rewritten_content": result["content"],
                    "tone_applied": tone_lower,
                    "provider": result["provider"],
                    "model": result.get("model"),
                    "cost": result["cost"],
                    "tokens": result["tokens"],
                    "success": result["success"],
                    "error": result.get("error")
                }
            except Exception as e:
                return {
                    "original_content": content,
                    "rewritten_content": content,
                    "tone_applied": tone_lower,
                    "provider": "none",
                    "success": False,
                    "cost": 0,
                    "tokens": 0,
                    "error": f"OpenRouter failed: {str(e)}"
                }
        
        else:
            return {
                "original_content": content,
                "rewritten_content": content,
                "tone_applied": tone_lower,
                "provider": "none",
                "success": False,
                "cost": 0,
                "tokens": 0,
                "error": f"Unknown provider: {provider}"
            }
    
    async def optimize_keywords(
        self,
        content: str,
        keywords: Optional[list] = None,
        platform: str = "general",
        max_hashtags: int = 10,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Suggest relevant hashtags and keywords for content
        """
        
        # Build optimization prompt using formatter
        optimization_prompt = format_optimization_prompt(content, platform, keywords, max_hashtags)
        
        # Set defaults
        if provider is None:
            provider = "groq"
        if provider == "groq" and model is None:
            model = DEFAULT_GROQ_MODEL
        elif provider == "openrouter" and model is None:
            model = DEFAULT_OPENROUTER_MODEL
        
        # Generate with specified provider
        if provider == "groq":
            try:
                result = await self.groq_provider.generate(optimization_prompt, model)
                hashtags, keywords_list, topics = self._parse_optimization_response(result["content"])
                return {
                    "hashtags": hashtags[:max_hashtags],
                    "keywords": keywords_list,
                    "trending_topics": topics,
                    "provider": result["provider"],
                    "model": result.get("model"),
                    "cost": result["cost"],
                    "tokens": result["tokens"],
                    "success": result["success"],
                    "error": result.get("error")
                }
            except Exception as groq_error:
                logger.warning(f"Groq keyword optimization failed, trying fallback...")
                try:
                    result = await self.openrouter_provider.generate(optimization_prompt, FALLBACK_OPENROUTER_MODEL)
                    hashtags, keywords_list, topics = self._parse_optimization_response(result["content"])
                    return {
                        "hashtags": hashtags[:max_hashtags],
                        "keywords": keywords_list,
                        "trending_topics": topics,
                        "provider": result["provider"],
                        "model": result.get("model"),
                        "cost": result["cost"],
                        "tokens": result["tokens"],
                        "success": result["success"],
                        "error": result.get("error")
                    }
                except Exception as fallback_error:
                    return {
                        "hashtags": [],
                        "keywords": keywords or [],
                        "trending_topics": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "tokens": 0,
                        "error": f"Both providers failed: {str(groq_error)} | {str(fallback_error)}"
                    }
        
        elif provider == "openrouter":
            try:
                result = await self.openrouter_provider.generate(optimization_prompt, model)
                hashtags, keywords_list, topics = self._parse_optimization_response(result["content"])
                return {
                    "hashtags": hashtags[:max_hashtags],
                    "keywords": keywords_list,
                    "trending_topics": topics,
                    "provider": result["provider"],
                    "model": result.get("model"),
                    "cost": result["cost"],
                    "tokens": result["tokens"],
                    "success": result["success"],
                    "error": result.get("error")
                }
            except Exception as e:
                return {
                    "hashtags": [],
                    "keywords": keywords or [],
                    "trending_topics": [],
                    "provider": "none",
                    "success": False,
                    "cost": 0,
                    "tokens": 0,
                    "error": f"OpenRouter failed: {str(e)}"
                }
        
        else:
            return {
                "hashtags": [],
                "keywords": keywords or [],
                "trending_topics": [],
                "provider": "none",
                "success": False,
                "cost": 0,
                "tokens": 0,
                "error": f"Unknown provider: {provider}"
            }
    
    def _parse_optimization_response(self, response: str) -> tuple:
        """Parse AI response to extract hashtags, keywords, and topics"""
        hashtags = []
        keywords_list = []
        topics = []
        
        lines = response.split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("HASHTAGS:"):
                hashtags_str = line.replace("HASHTAGS:", "").strip()
                hashtags = [tag.strip() for tag in hashtags_str.split(",") if tag.strip()]
            elif line.startswith("KEYWORDS:"):
                keywords_str = line.replace("KEYWORDS:", "").strip()
                keywords_list = [kw.strip() for kw in keywords_str.split(",") if kw.strip()]
            elif line.startswith("TRENDING_TOPICS:"):
                topics_str = line.replace("TRENDING_TOPICS:", "").strip()
                topics = [t.strip() for t in topics_str.split(",") if t.strip()]
        
        return hashtags, keywords_list, topics
    
    async def generate_image(
        self,
        prompt: str,
        style: Optional[str] = None,
        platform: str = "general",
        width: int = 1024,
        height: int = 1024,
        count: int = 1,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate images using Pixazo (FREE) or OpenRouter (fallback)
        Priority: Pixazo (free) → OpenRouter (paid fallback)
        """
        
        # Set defaults
        if provider is None:
            provider = DEFAULT_IMAGE_PROVIDER  # "pixazo"
        if provider == "pixazo" and model is None:
            model = DEFAULT_IMAGE_MODEL
        
        logger.info(f"Image generation request: {prompt[:50]}... | Provider: {provider}")
        
        # Try Pixazo (PRIMARY - FREE)
        if provider == "pixazo":
            try:
                result = await self.pixazo_provider.generate_image(
                    prompt=prompt,
                    model=model,
                    style=style,
                    width=width,
                    height=height,
                    count=count
                )
                return result
            except Exception as e:
                if not ENABLE_IMAGE_FALLBACK:
                    logger.error(f"Pixazo failed, fallback disabled: {e}")
                    return {
                        "images": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "image_count": 0,
                        "error": f"Pixazo generation failed (fallback disabled): {str(e)}"
                    }
                
                logger.warning(f"Pixazo generation failed: {e}, trying OpenRouter fallback...")
                # Fallback to OpenRouter
                try:
                    result = await self.openrouter_provider.generate_image(
                        prompt=prompt,
                        style=style,
                        model=model,
                        count=count
                    )
                    logger.info(f"Used OpenRouter fallback (cost: ${result.get('cost', 0):.6f})")
                    return result
                except Exception as fallback_error:
                    return {
                        "images": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "image_count": 0,
                        "error": f"Both Pixazo (free) and OpenRouter (fallback) failed: {str(e)} | {str(fallback_error)}"
                    }
        
        # OpenRouter as primary (user explicitly chose)
        elif provider == "openrouter":
            try:
                result = await self.openrouter_provider.generate_image(
                    prompt=prompt,
                    style=style,
                    model=model,
                    count=count
                )
                logger.info(f"Used OpenRouter | Cost: ${result.get('cost', 0):.6f}")
                return result
            except Exception as e:
                logger.error(f"OpenRouter image generation failed: {e}")
                
                if not ENABLE_IMAGE_FALLBACK:
                    logger.error(f"OpenRouter failed, fallback disabled")
                    return {
                        "images": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "image_count": 0,
                        "error": f"OpenRouter generation failed (fallback disabled): {str(e)}"
                    }
                
                # Try Pixazo as emergency fallback
                try:
                    logger.warning(f"OpenRouter failed, trying Pixazo emergency fallback...")
                    result = await self.pixazo_provider.generate_image(
                        prompt=prompt,
                        style=style,
                        width=width,
                        height=height,
                        count=count
                    )
                    logger.info(f"Used Pixazo emergency fallback (FREE)")
                    return result
                except Exception as fallback_error:
                    return {
                        "images": [],
                        "provider": "none",
                        "success": False,
                        "cost": 0,
                        "image_count": 0,
                        "error": f"Both providers failed: {str(e)} | {str(fallback_error)}"
                    }
        
        else:
            return {
                "images": [],
                "provider": "none",
                "success": False,
                "cost": 0,
                "image_count": 0,
                "error": f"Unknown image provider: {provider}"
            }
    
    def get_available_image_models(self) -> Dict[str, Any]:
        """Get all available image models from both providers (dynamically fetched)"""
        pixazo_models = self.pixazo_provider.models_cache or {}
        openrouter_models = self.openrouter_provider.image_models_cache or {}
        
        return {
            "pixazo": pixazo_models,
            "openrouter": openrouter_models
        }
