# OpenRouter provider implementation
import httpx
from typing import Dict, Any
from openai import OpenAI
from app.config import OPENROUTER_API_KEY, OPENROUTER_MODELS, OPENROUTER_MAX_TOKENS, DEFAULT_TEMPERATURE
from app.providers.base import BaseProvider
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

class OpenRouterProvider(BaseProvider):
    """OpenRouter AI Provider"""
    
    def __init__(self):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
            default_headers={
                "HTTP-Referer": "https://socialflow.com",
                "X-OpenRouter-Title": "SocialFlow"
            }
        )
        self.models_cache = None
        self.hardcoded_models = OPENROUTER_MODELS
    
    async def fetch_models(self) -> Dict[str, Any]:
        """Fetch available models from OpenRouter API"""
        try:
            logger.info("Fetching OpenRouter models from API...")
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    "https://openrouter.ai/api/v1/models",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
                )
                response.raise_for_status()
                data = response.json()
                
                models = {}
                for model in data.get("data", []):
                    model_id = model.get("id")
                    if model_id:
                        models[model_id] = {
                            "name": model.get("name", model_id),
                            "input_cost": float(model.get("pricing", {}).get("prompt", 0)),
                            "output_cost": float(model.get("pricing", {}).get("completion", 0)),
                            "is_free": float(model.get("pricing", {}).get("prompt", 1)) == 0,
                            "context_window": model.get("context_length", 8192)
                        }
                
                self.models_cache = models
                logger.info(f"✅ Fetched {len(models)} models from OpenRouter")
                return models
        
        except Exception as e:
            logger.warning(f"❌ Failed to fetch OpenRouter models: {e}")
            logger.info("Using fallback hardcoded models")
            self.models_cache = self.hardcoded_models
            return self.hardcoded_models
    
    async def generate(self, prompt: str, model: str) -> Dict[str, Any]:
        """Generate content using OpenRouter"""
        try:
            logger.info(f"Attempting OpenRouter provider ({model})...")
            logger.info(f"  API Key length: {len(OPENROUTER_API_KEY) if OPENROUTER_API_KEY else 0}")
            
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=OPENROUTER_MAX_TOKENS,
                temperature=DEFAULT_TEMPERATURE
            )
            
            content = response.choices[0].message.content
            cost = self.calculate_cost(response.usage.prompt_tokens, response.usage.completion_tokens, model)
            
            logger.info(f"✅ OpenRouter success | Model: {model} | Cost: ${cost:.6f} | Tokens: {response.usage.completion_tokens}")
            
            return {
                "content": content,
                "provider": "openrouter",
                "model": model,
                "cost": cost,
                "tokens": response.usage.completion_tokens,
                "success": True,
                "error": None
            }
        
        except Exception as e:
            logger.error(f"❌ OpenRouter failed ({model}): {e}")
            raise
    
    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate cost for OpenRouter model"""
        models = self.models_cache or self.hardcoded_models
        if model in models:
            model_info = models[model]
            return (input_tokens * model_info["input_cost"]) + (output_tokens * model_info["output_cost"])
        else:
            # Fallback to average OpenRouter pricing
            return (input_tokens * 3.0/1_000_000) + (output_tokens * 15.0/1_000_000)
