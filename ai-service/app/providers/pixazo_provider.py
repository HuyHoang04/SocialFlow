# Pixazo provider - FREE Stable Diffusion via Pixazo Gateway
import httpx
from typing import Dict, Any
from app.config import PIXAZO_API_KEY, PIXAZO_MODELS
from app.providers.base import BaseProvider
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class PixazoProvider(BaseProvider):
    """Pixazo Image Generation Provider (FREE Stable Diffusion)"""
    
    def __init__(self):
        self.api_key = PIXAZO_API_KEY
        self.models_cache = None
    
    async def fetch_models(self) -> Dict[str, Any]:
        """Fetch Pixazo models - returns hardcoded list since no public discovery API exists"""
        logger.info("Loading Pixazo hardcoded models (10 Stable Diffusion + Flux models)...")
        self.models_cache = PIXAZO_MODELS.copy()
        logger.info(f"Loaded {len(self.models_cache)} Pixazo models")
        
        # Show which are free and which are paid
        free_count = 0
        paid_count = 0
        for model_id, model_info in self.models_cache.items():
            is_free = model_info.get("free", False)
            cost = model_info.get("cost_per_image", 0)
            if is_free:
                logger.info(f"   [FREE] {model_id}: {model_info['name']}")
                free_count += 1
            else:
                logger.info(f"   [PAID] {model_id}: {model_info['name']} - ${cost:.4f}/image")
                paid_count += 1
        
        logger.info(f"   Summary - Free: {free_count} | Paid: {paid_count}")
        return self.models_cache
    
    async def generate_image(self, prompt: str, model: str = None, style: str = None, 
                            width: int = 1024, height: int = 1024, count: int = 1) -> Dict[str, Any]:
        """Generate image using Pixazo API"""
        try:
            if not self.api_key:
                logger.error("PIXAZO_API_KEY not configured")
                return {
                    "success": False,
                    "error": "PIXAZO_API_KEY not configured",
                    "images": []
                }
            
            if model not in PIXAZO_MODELS:
                logger.error(f"Unknown Pixazo model: {model}")
                available = ", ".join(PIXAZO_MODELS.keys())
                return {
                    "success": False,
                    "error": f"Unknown model: {model}. Available: {available}",
                    "images": []
                }
            
            model_config = PIXAZO_MODELS[model]
            endpoint = model_config["endpoint"]
            
            logger.info(f"Generating image with Pixazo {model}...")
            logger.info(f"   Endpoint: {endpoint}")
            logger.info(f"   Prompt: {prompt[:80]}...")
            
            # Prepare request headers
            headers = {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "Ocp-Apim-Subscription-Key": self.api_key
            }
            
            # Build request payload based on model
            payload = self._build_payload(model, prompt, width, height, style)
            
            # Call Pixazo API
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    endpoint,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                # Extract image URL based on model response format
                image_url = self._extract_image_url(model, data)
                
                if image_url:
                    logger.info(f"Generated image: {image_url[:80]}...")
                    return {
                        "success": True,
                        "provider": "pixazo",
                        "model": model,
                        "images": [image_url for _ in range(count)],  # Repeat if multiple requested
                        "cost": self.calculate_cost(count, model),
                        "raw_response": data
                    }
                else:
                    logger.error(f"No image URL in response: {data}")
                    return {
                        "success": False,
                        "error": "No image_url in response",
                        "images": [],
                        "raw_response": data
                    }
        
        except Exception as e:
            logger.error(f"Pixazo generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "images": []
            }
    
    def _build_payload(self, model: str, prompt: str, width: int, height: int, style: str = None) -> Dict[str, Any]:
        """Build request payload based on model type"""
        base_payload = {
            "prompt": prompt,
            "height": height,
            "width": width,
            "num_steps": 20,
            "guidance": 5,
            "seed": 42
        }
        
        if model == "sd-3-5-large":
            return {
                "prompt": prompt,
                "aspect_ratio": f"{width}:{height}",
                "cfg": 4.5,
                "steps": 40,
                "output_format": "webp",
                "output_quality": 90,
                "prompt_strength": 0.85
            }
        elif model == "sd-3-0":
            return {
                "prompt": prompt,
                "negativePrompt": "",
                "steps": 28,
                "cfg": 4.0,
                "aspect_ratio": f"{width}:{height}",
                "output_format": "webp",
                "output_quality": 90,
                "prompt_strength": 0.85
            }
        elif model in ["sd-xl-lightning", "sd-xl-lightning-stream", "sd-xl-1-0"]:
            return {
                "prompt": prompt,
                "negativePrompt": "",
                "height": height,
                "width": width,
                "num_steps": 20,
                "guidance": 5,
                "seed": 42
            }
        elif model == "sd-1-5":
            return {
                "prompt": prompt,
                "inputImage": None  # Could be used for img2img
            }
        elif model == "sd-inpainting":
            return {
                "prompt": prompt,
                "imageUrl": None,  # Required for inpainting
                "maskUrl": None,    # Required for inpainting
                "negativePrompt": ""
            }
        elif model == "flux-1-schnell":
            return {
                "prompt": prompt,
                "num_steps": 4,  # Flux is very fast, max 8 steps
                "seed": 42,
                "height": height,
                "width": width
            }
        elif model == "sdxl-base-1-0":
            return {
                "prompt": prompt,
                "negative_prompt": "",
                "height": height,
                "width": width,
                "num_steps": 20,
                "guidance_scale": 5,
                "seed": 42
            }
        else:
            return base_payload
    
    def _extract_image_url(self, model: str, response: Dict[str, Any]) -> str:
        """Extract image URL based on response format"""
        # Different models return different response formats
        if "image_url" in response:
            return response["image_url"]
        elif "imageUrl" in response:
            return response["imageUrl"]
        elif "output" in response:
            return response["output"]
        elif "image" in response:
            return response["image"]
        else:
            logger.warning(f"Unknown response format for model {model}: {response.keys()}")
            return None
    
    async def generate(self, prompt: str, model: str) -> Dict[str, Any]:
        """Standard interface - use generate_image() for images"""
        raise NotImplementedError("Use generate_image() for image generation")
    
    def calculate_cost(self, count: int, model: str = None) -> float:
        """Calculate cost for Pixazo image generation - ALWAYS FREE!"""
        # Pixazo is 100% free
        return 0.0
