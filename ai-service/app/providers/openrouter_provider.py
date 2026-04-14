# OpenRouter provider implementation
import httpx
from typing import Dict, Any, List
from openai import OpenAI
from app.config import OPENROUTER_API_KEY, OPENROUTER_MODELS, OPENROUTER_MAX_TOKENS, DEFAULT_TEMPERATURE, KNOW_MUTI_MODAL_EMBEDDING_MODELS
from app.providers.base import BaseProvider
from app.utils.logger import setup_logger
from app.models import TextResponse, ImageResponse, EmbeddingResponse

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
        self.embedding_models_cache = None
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
    
    async def generate(self, prompt: str, model: str, max_tokens: int = 500) -> TextResponse:
        """Generate content using OpenRouter"""
        try:
            logger.info(f"Attempting OpenRouter provider ({model}, max_tokens={max_tokens})...")
            logger.info(f"  API Key length: {len(OPENROUTER_API_KEY) if OPENROUTER_API_KEY else 0}")
            
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=DEFAULT_TEMPERATURE,
                extra_body={"reasoning": {"enabled": False}}
            )
            
            content = response.choices[0].message.content
            cost = self.calculate_cost(response.usage.prompt_tokens, response.usage.completion_tokens, model)
            
            logger.info(f"OpenRouter success | Model: {model} | Cost: ${cost:.6f} | Tokens: {response.usage.completion_tokens}")
            
            return TextResponse(
                content=content,
                provider="openrouter",
                model=model,
                cost=cost,
                token_count=response.usage.completion_tokens,
                success=True,
                error=None
            )
        
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
    
    async def generate_image(self, prompt: str, style: str = None, model: str = None, count: int = 1) -> ImageResponse:
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
            
            return ImageResponse(
                images=images,
                provider="openrouter",
                model=model,
                cost=total_cost,
                image_count=len(images),
                success=True,
                error=None
            )
        
        except Exception as e:
            logger.error(f"OpenRouter image generation failed: {e}")
            raise

    async def fetch_embedding_models(self) -> Dict[str, Any]:
        """Fetch available embedding models from OpenRouter API"""
        try:
            logger.info("Fetching OpenRouter embedding models from API...")
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    "https://openrouter.ai/api/v1/embeddings/models",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
                )
                response.raise_for_status()
                data = response.json()
                
                embedding_models = {}
                for model in data.get("data", []):
                    model_id = model.get("id")
                    if model_id:
                        # Parse pricing dynamically from API response
                        pricing = model.get("pricing", {})
                        cost_per_1m = float(pricing.get("prompt", pricing.get("completion", 0)))
                        
                        # Detect multimodal support from architecture
                        supports_images = False
                        architecture = model.get("architecture", {})
                        input_modalities = architecture.get("input_modalities", [])
                        if "image" in input_modalities:
                            supports_images = True
                        
                        # Dimension will be extracted from actual embedding response
                        embedding_models[model_id] = {
                            "name": model.get("name", model_id),
                            "supports_images": supports_images,
                            "cost_per_1m": cost_per_1m,
                            "context_length": model.get("context_length", 0)
                        }
                        logger.info(f"  {model_id} | Multimodal: {supports_images} | Cost: ${cost_per_1m:.2e}")
                
                self.embedding_models_cache = embedding_models
                logger.info(f"Fetched {len(embedding_models)} embedding models from OpenRouter")
                return embedding_models
        
        except Exception as e:
            logger.warning(f"Failed to fetch OpenRouter embedding models from API: {e}")
            logger.info("Using empty fallback")
            self.embedding_models_cache = {}
            return {}

    async def embed(self, texts: List[str], model: str, images: List[str] = None) -> EmbeddingResponse:
        """Generate embeddings for texts (and optionally images) using OpenRouter
        
        Supports both text-only and multimodal embeddings.
        Automatically checks if model supports images before attempting.
        """
        try:
            # Normalize inputs to prevent None errors
            if texts is None:
                texts = []
            if images is None:
                images = []
            
            if not texts and not images:
                raise Exception("At least one of texts or images must be provided")
            
            logger.info(f"Generating embeddings via OpenRouter ({model})...")
            logger.info(f"  Texts: {len(texts)}")
            if images:
                logger.info(f"  Images: {len(images)}")
            
            # Known multimodal embedding models
            known_multimodal_models = KNOW_MUTI_MODAL_EMBEDDING_MODELS
            
            # Check if model supports images
            model_supports_images = False
            
            # First check known multimodal models
            if model in known_multimodal_models:
                model_supports_images = True
            # Then check cache if available
            elif self.embedding_models_cache and model in self.embedding_models_cache:
                model_supports_images = self.embedding_models_cache[model].get("supports_images", False)
            
            # Validate: if images provided but model doesn't support images
            if images and not model_supports_images:
                logger.error(f"Model {model} does not support image embeddings")
                raise Exception(f"Model {model} does not support image embeddings. Use a multimodal model like nvidia/llama-nemotron-embed-vl-1b-v2 or other multimodal embedding model.")
            
            # Build input based on whether we have multimodal content
            if images and model_supports_images:
                # Multimodal format: each text can have associated images
                embedding_input = []
                for i, text in enumerate(texts):
                    content = [{"type": "text", "text": text}]
                    
                    # Add associated image if available
                    if i < len(images):
                        image_url = images[i]
                        content.append({
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        })
                    
                    embedding_input.append({"content": content})
            else:
                # Text-only format
                embedding_input = texts
            
            # Call embeddings API via OpenAI SDK configured for OpenRouter
            response = self.client.embeddings.create(
                model=model,
                input=embedding_input,
                encoding_format="float"
            )
            
            # Check for API error response
            if response and hasattr(response, 'error') and response.error:
                error_msg = response.error.get('message', 'Unknown error') if isinstance(response.error, dict) else str(response.error)
                logger.error(f"OpenRouter API error: {error_msg}")
                raise Exception(f"OpenRouter API error: {error_msg}")
            
            if not response or not response.data:
                logger.info(f"OpenRouter embedding API returned empty response: {response}")
                raise Exception("Empty response from OpenRouter API")
            
            embeddings = []
            for item in response.data:
                if item and hasattr(item, 'embedding'):
                    embeddings.append(item.embedding)
            
            if not embeddings:
                raise Exception("No embeddings returned from API")
            
            cost = self.calculate_embedding_cost(response.usage.prompt_tokens, model)
            # Dimension extracted from actual embedding response
            dimension = len(embeddings[0]) if embeddings else 0
            
            logger.info(f"OpenRouter embeddings success | Model: {model} | Texts: {len(texts)} | Images: {len(images)} | Dimension: {dimension} | Cost: ${cost:.6f}")
            
            return EmbeddingResponse(
                embeddings=embeddings,
                provider="openrouter",
                model=model,
                dimension=dimension,
                embedding_count=len(embeddings),
                token_count=response.usage.prompt_tokens,
                cost=cost,
                success=True,
                error=None
            )
        
        except Exception as e:
            logger.error(f"OpenRouter embedding failed: {e}")
            raise

    def calculate_embedding_cost(self, token_count: int, model: str) -> float:
        """Calculate cost for OpenRouter embedding using dynamic pricing from cached models"""
        # Try to get pricing from cached models first
        if self.embedding_models_cache and model in self.embedding_models_cache:
            model_info = self.embedding_models_cache[model]
            cost_per_1m = model_info.get("cost_per_1m", 0)
            return (token_count / 1_000_000) * cost_per_1m
        
        # If model not found in cache, try lowercase or with variations
        if self.embedding_models_cache:
            for model_key, model_info in self.embedding_models_cache.items():
                if model_key.lower() == model.lower() or model in model_key or model_key in model:
                    cost_per_1m = model_info.get("cost_per_1m", 0)
                    return (token_count / 1_000_000) * cost_per_1m
        
        # Default fallback pricing
        logger.warning(f"Model {model} not found in embedding models cache, using default pricing")
        return (token_count / 1_000_000) * 0.00001
