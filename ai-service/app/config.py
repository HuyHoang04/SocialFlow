import os
from dotenv import load_dotenv

load_dotenv()

# API Keys - strip whitespace
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()

# Debug prints
if not GROQ_API_KEY:
    print("⚠️  WARNING: GROQ_API_KEY not found in environment!")
else:
    print(f"✅ GROQ_API_KEY: {GROQ_API_KEY[:20]}... (len={len(GROQ_API_KEY)})")

if not OPENROUTER_API_KEY:
    print("⚠️  WARNING: OPENROUTER_API_KEY not found in environment!")
else:
    print(f"✅ OPENROUTER_API_KEY: {OPENROUTER_API_KEY[:20]}... (len={len(OPENROUTER_API_KEY)})")

# Default Models
DEFAULT_GROQ_MODEL = "mixtral-8x7b-32768"
DEFAULT_OPENROUTER_MODEL = "auto"
FALLBACK_OPENROUTER_MODEL = "qwen/qwen3.6-plus:free"  # Free model for fallback

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
OPENROUTER_MODELS = {
    "qwen/qwen3.6-plus:free": {
        "name": "Qwen 3.6 Plus (FREE)",
        "input_cost": 0,
        "output_cost": 0,
        "is_free": True,
        "context_window": 1000000,
        "note": "100% free - fully open source"
    },
    "auto": {
        "name": "Auto (Best Value)",
        "input_cost": 1.0 / 1_000_000,
        "output_cost": 5.0 / 1_000_000,
        "is_free": False,
        "context_window": 8192,
        "note": "OpenRouter auto-routes to best value model"
    },
    "meta-llama/llama-3-8b-instruct": {
        "name": "Llama 3 8B (OpenRouter)",
        "input_cost": 0.05 / 1_000_000,
        "output_cost": 0.1 / 1_000_000,
        "is_free": False,
        "context_window": 8192
    },
    "meta-llama/llama-3-70b-instruct": {
        "name": "Llama 3 70B (OpenRouter)",
        "input_cost": 0.59 / 1_000_000,
        "output_cost": 0.79 / 1_000_000,
        "is_free": False,
        "context_window": 8192
    },
    "anthropic/claude-3-5-sonnet": {
        "name": "Claude 3.5 Sonnet (Premium)",
        "input_cost": 3.0 / 1_000_000,
        "output_cost": 15.0 / 1_000_000,
        "is_free": False,
        "context_window": 200000
    },
    "google/gemma-4-31b-it": {
        "name": "Google Gemma 4 31B",
        "input_cost": 0.14 / 1_000_000,
        "output_cost": 0.4 / 1_000_000,
        "is_free": False,
        "context_window": 262144,
        "note": "Strong on coding & reasoning"
    }
}

# Costs (in USD per 1M tokens)
GROQ_INPUT_COST = 0.27 / 1_000_000
GROQ_OUTPUT_COST = 0.81 / 1_000_000
OPENROUTER_INPUT_COST = 3.0 / 1_000_000  # Claude avg
OPENROUTER_OUTPUT_COST = 15.0 / 1_000_000

# API Settings
GROQ_MAX_TOKENS = 500
OPENROUTER_MAX_TOKENS = 500
DEFAULT_TEMPERATURE = 0.7
