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
        self.image_models_cache = None
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
                logger.info(f"Fetched {len(models)} models from OpenRouter")
                return models
        
        except Exception as e:
            logger.warning(f"Failed to fetch OpenRouter models: {e}")
            logger.info("Using fallback hardcoded models")
            self.models_cache = self.hardcoded_models
            return self.hardcoded_models
    
    async def fetch_image_models(self) -> Dict[str, Any]:
        """Fetch available image generation models from OpenRouter API"""
        try:
            if not OPENROUTER_API_KEY:
                logger.warning("OPENROUTER_API_KEY not set, cannot fetch image models")
                self.image_models_cache = {}
                return {}
            
            logger.info("Fetching OpenRouter image generation models...")
            async with httpx.AsyncClient(timeout=10) as client:
                # Use OpenRouter's modality filter for image generation models
                response = await client.get(
                    "https://openrouter.ai/api/v1/models?output_modality=image",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
                )
                response.raise_for_status()
                data = response.json()
                
                image_models = {}
                
                for model in data.get("data", []):
                    model_id = model.get("id", "")
                    if model_id:
                        # Get completion price from pricing - try different field names
                        pricing = model.get("pricing", {})
                        completion_price = pricing.get("completion", 0.0)
                        
                        # Convert string to float if needed
                        if isinstance(completion_price, str):
                            completion_price = float(completion_price)
                        
                        image_models[model_id] = {
                            "name": model.get("name", model_id),
                            "cost_per_image": completion_price,
                            "description": f"{model.get('name', model_id)} via OpenRouter",
                            "context_length": model.get("context_length", 0),
                        }
                        logger.info(f"  Found image model: {model_id} (${completion_price:.2e}/image)")
                
                if image_models:
                    self.image_models_cache = image_models
                    logger.info(f"Fetched {len(image_models)} image models from OpenRouter")
                    return image_models
                else:
                    logger.warning("No image models found from OpenRouter API")
                    self.image_models_cache = {}
                    return {}
        
        except Exception as e:
            logger.warning(f"Failed to fetch OpenRouter image models: {e}")
            self.image_models_cache = {}
            return {}
    
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
            
            logger.info(f"OpenRouter success | Model: {model} | Cost: ${cost:.6f} | Tokens: {response.usage.completion_tokens}")
            
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
            logger.error(f"OpenRouter failed ({model}): {e}")
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
    
    async def generate_image(self, prompt: str, style: str = None, model: str = None, count: int = 1) -> Dict[str, Any]:
        """Generate image using OpenRouter chat completions with image modality"""
        try:
            # Set default model if not provided
            if not model:
                model = "stabilityai/stable-diffusion-3-large:extended"
            
            logger.info(f"Generating image via OpenRouter...")
            logger.info(f"  Model: {model}")
            logger.info(f"  Prompt: {prompt[:100]}...")
            logger.info(f"  Count: {count}")
            
            # Build prompt with style
            full_prompt = prompt
            if style:
                style_prompts = {
                    "photorealistic": "photorealistic, detailed, high quality, professional photography",
                    "illustration": "artistic illustration, digital art, painted, stylized",
                    "anime": "anime style, manga, vibrant colors, detailed",
                    "abstract": "abstract art, creative, experimental, surreal",
                    "3d": "3D render, CGI, cinematic, high detail",
                    "sketch": "sketch, pencil drawing, line art, minimalist"
                }
                style_suffix = style_prompts.get(style, "")
                if style_suffix:
                    full_prompt = f"{prompt}, {style_suffix}"
            
            # Use chat completions endpoint with image modality (OpenRouter native format)
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": full_prompt
                    }
                ],
                modalities=["image"],  # Enable image generation
                temperature=0.7
            )
            
            # Process response
            images = []
            total_cost = 0.10 * count  # Estimate for API call
            
            # Extract images from response
            if response.choices and len(response.choices) > 0:
                message = response.choices[0].message
                
                # Check for images in message
                if hasattr(message, 'images') and message.images:
                    for img in message.images:
                        images.append({
                            "url": img.image_url.url if hasattr(img.image_url, 'url') else str(img.image_url),
                            "seed": None,
                            "finish_reason": "success"
                        })
                
                # Fallback: check for image content in text (base64 data URL)
                elif message.content and "data:image" in str(message.content):
                    images.append({
                        "url": str(message.content),
                        "seed": None,
                        "finish_reason": "success"
                    })
            
            if not images:
                logger.warning("No images found in response")
            
            logger.info(f"Generated {len(images)} images via OpenRouter | Cost: ${total_cost:.6f}")
            
            return {
                "images": images,
                "provider": "openrouter",
                "model": model,
                "cost": total_cost,
                "image_count": len(images),
                "success": True,
                "error": None
            }
        
        except Exception as e:
            logger.error(f"OpenRouter image generation failed: {e}")
            raise
