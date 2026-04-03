# AI Service - Business logic layer
import asyncio
from typing import Dict, Any, Optional
from app.config import DEFAULT_GROQ_MODEL, DEFAULT_OPENROUTER_MODEL, FALLBACK_OPENROUTER_MODEL
from app.providers.groq_provider import GroqProvider
from app.providers.openrouter_provider import OpenRouterProvider
from app.utils.logger import setup_logger
from app.utils.formatting import format_model_info

logger = setup_logger(__name__)

class AIService:
    """Business logic for AI content generation"""
    
    def __init__(self):
        self.groq_provider = GroqProvider()
        self.openrouter_provider = OpenRouterProvider()
    
    async def refresh_models(self):
        """Refresh model lists from both providers"""
        logger.info("🔄 Refreshing model lists from providers...")
        await asyncio.gather(
            self.groq_provider.fetch_models(),
            self.openrouter_provider.fetch_models(),
            return_exceptions=True
        )
        logger.info("✅ Model refresh complete")
    
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
