import os
from dotenv import load_dotenv

load_dotenv()

# API Keys - strip whitespace
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
PIXAZO_API_KEY = os.getenv("PIXAZO_API_KEY", "").strip()  # For Pixazo (FREE Stable Diffusion)

# Feature Flags & Fallback Configuration
ENABLE_FALLBACK = os.getenv("ENABLE_FALLBACK", "true").lower() in ("true", "1", "yes")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Default Models
DEFAULT_GROQ_MODEL = "mixtral-8x7b-32768"
DEFAULT_OPENROUTER_MODEL = "auto"
FALLBACK_OPENROUTER_MODEL = "qwen/qwen3.6-plus:free"  # Free model for fallback

# Pixazo Models - Stable Diffusion via Pixazo Gateway
# Only XL v1.0 and Inpainting are marked as FREE in UI
PIXAZO_MODELS = {
    "sd-xl-1-0": {
        "name": "Stable Diffusion XL 1.0 - FREE",
        "description": "SDXL 1.0 standard model",
        "cost_per_image": 0.0,  # 100% FREE
        "endpoint": "https://gateway.pixazo.ai/getImage/v1/getSDXLImage",
        "method": "POST",
        "has_negative_prompt": True,
        "free": True,
    },
    "sd-inpainting": {
        "name": "Stable Diffusion Inpainting - FREE",
        "description": "Inpainting - modify specific regions of images",
        "cost_per_image": 0.0,  # 100% FREE
        "endpoint": "https://gateway.pixazo.ai/inpainting/v1/getImage",
        "method": "POST",
        "has_negative_prompt": True,
        "free": True,
    },
    "flux-1-schnell": {
        "name": "Flux 1 Schnell - FREE",
        "description": "Fast Flux model - ultra-fast image generation",
        "cost_per_image": 0.0,  # 100% FREE
        "endpoint": "https://gateway.pixazo.ai/flux-1-schnell/v1/getData",
        "method": "POST",
        "has_negative_prompt": False,
        "free": True,
    },
    "sdxl-base-1-0": {
        "name": "SDXL Base 1.0 - FREE",
        "description": "Stable Diffusion XL Base 1.0",
        "cost_per_image": 0.0,  # 100% FREE
        "endpoint": "https://gateway.pixazo.ai/getImage/v1/getSDXLImage",
        "method": "POST",
        "has_negative_prompt": True,
        "free": True,
    },
}

# Groq Models (Free tier - generous limits)
GROQ_MODELS = {
    "llama-3-70b-8192": {
        "name": "Meta Llama 3 70B",
        "input_cost": 0.59 / 1_000_000,
        "output_cost": 0.79 / 1_000_000,
        "is_free": False,
        "context_window": 8192
    },
    "llama-3-8b-8192": {
        "name": "Meta Llama 3 8B",
        "input_cost": 0.05 / 1_000_000,
        "output_cost": 0.1 / 1_000_000,
        "is_free": False,
        "context_window": 8192
    },
    "mixtral-8x7b-32768": {
        "name": "Mixtral 8x7B",
        "input_cost": 0.27 / 1_000_000,
        "output_cost": 0.81 / 1_000_000,
        "is_free": False,
        "context_window": 32768
    },
    "gemma-7b-it": {
        "name": "Google Gemma 7B",
        "input_cost": 0.05 / 1_000_000,
        "output_cost": 0.1 / 1_000_000,
        "is_free": False,
        "context_window": 8192
    },
    "gemma2-9b-it": {
        "name": "Google Gemma 2 9B",
        "input_cost": 0.2 / 1_000_000,
        "output_cost": 0.6 / 1_000_000,
        "is_free": False,
        "context_window": 8192
    }
}

# OpenRouter Models (Popular ones - supports 200+ models)
OPENROUTER_MODELS = {}

# Costs (in USD per 1M tokens)
GROQ_INPUT_COST = 0.27 / 1_000_000
GROQ_OUTPUT_COST = 0.81 / 1_000_000
OPENROUTER_INPUT_COST = 3.0 / 1_000_000  # Claude avg
OPENROUTER_OUTPUT_COST = 15.0 / 1_000_000

# API Settings
GROQ_MAX_TOKENS = 500
OPENROUTER_MAX_TOKENS = 500
DEFAULT_TEMPERATURE = 0.7

# Image Model Defaults
DEFAULT_IMAGE_MODEL = "flux-1-schnell"  # Default to fastest FREE Pixazo model
DEFAULT_IMAGE_PROVIDER = "pixazo"  # Pixazo is primary (FREE)
ENABLE_IMAGE_FALLBACK = os.getenv("ENABLE_IMAGE_FALLBACK", "true").lower() in ("true", "1", "yes")
