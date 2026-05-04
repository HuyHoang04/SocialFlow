# Groq provider implementation
import httpx
from typing import Dict, Any, List
from groq import Groq
from app.config import GROQ_API_KEY, GROQ_MODELS, GROQ_MAX_TOKENS, DEFAULT_TEMPERATURE
from app.providers.base import BaseProvider
from app.utils.logger import setup_logger
from app.models import TextResponse

logger = setup_logger(__name__)

class GroqProvider(BaseProvider):
    """Groq AI Provider"""
    
    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)
        self.models_cache = None
        self.hardcoded_models = GROQ_MODELS
    
    async def fetch_models(self) -> Dict[str, Any]:
        """Fetch available models from Groq API"""
        try:
            logger.info("Fetching Groq models from API...")
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"}
                )
                response.raise_for_status()
                data = response.json()
                
                models = {}
                for model in data.get("data", []):
                    model_id = model.get("id")
                    if model_id:
                        # Try to get pricing from config, fallback to generic pricing
                        if model_id in self.hardcoded_models:
                            models[model_id] = self.hardcoded_models[model_id].copy()
                        else:
                            models[model_id] = {
                                "name": model.get("object", "Model"),
                                "input_cost": 0.27 / 1_000_000,
                                "output_cost": 0.81 / 1_000_000,
                                "is_free": False,
                                "context_window": 8192
                            }
                
                self.models_cache = models
                logger.info(f"Fetched {len(models)} models from Groq API")
                return models
        
        except Exception as e:
            logger.warning(f"Failed to fetch Groq models from API: {e}")
            logger.info("Using fallback hardcoded models from config")
            self.models_cache = self.hardcoded_models
            return self.hardcoded_models
    
    async def generate(self, prompt: str, model: str, max_tokens: int = 500) -> TextResponse:
        """Generate content using Groq"""
        try:
            logger.info(f"Attempting Groq provider ({model}, max_tokens={max_tokens})...")
            logger.info(f"  API Key length: {len(GROQ_API_KEY) if GROQ_API_KEY else 0}")
            
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=DEFAULT_TEMPERATURE
            )
            
            content = response.choices[0].message.content
            cost = self.calculate_cost(response.usage.prompt_tokens, response.usage.completion_tokens, model)
            
            logger.info(f"Groq success | Model: {model} | Cost: ${cost:.6f} | Tokens: {response.usage.completion_tokens}")
            
            return TextResponse(
                content=content,
                provider="groq",
                model=model,
                cost=cost,
                token_count=response.usage.completion_tokens,
                success=True,
                error=None
            )
        
        except Exception as e:
            logger.error(f"Groq failed ({model}): {e}")
            raise
    
    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate cost for Groq model"""
        models = self.models_cache or self.hardcoded_models
        if model in models:
            model_info = models[model]
            return (input_tokens * model_info["input_cost"]) + (output_tokens * model_info["output_cost"])
        else:
            # Fallback to average Groq pricing
            return (input_tokens * 0.27/1_000_000) + (output_tokens * 0.81/1_000_000)

    async def fetch_embedding_models(self) -> Dict[str, Any]:
        """Groq does not have embedding models, return empty"""
        logger.info("Groq does not provide embedding models")
        return {}

    async def embed(self, texts: List[str], model: str, images: List[str] = None) -> Dict[str, Any]:
        """Groq does not support embeddings"""
        logger.error("Groq does not provide embedding models")
        raise NotImplementedError("Groq does not provide embedding services")

    def calculate_embedding_cost(self, token_count: int, model: str) -> float:
        """Groq embeddings not supported"""
        return 0.0
