# FastAPI Application
from fastapi import FastAPI, Depends
from app.services.ai_service import AIService
from app.routes import health, models, generation
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# Singleton AI Service
ai_service = AIService()

# Create FastAPI app
app = FastAPI(
    title="SocialFlow AI Service",
    version="2.0.0",
    description="Dual-provider AI generation service (Groq + OpenRouter)"
)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Startup: Loading models from provider APIs...")
    await ai_service.refresh_models()
    logger.info("AI Service ready!")

# Include routers
app.include_router(health.router)
app.include_router(models.router)
app.include_router(generation.router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "service": "SocialFlow AI Service v2.0",
        "endpoints": {
            "health": "GET /health",
            "models": "GET /models",
            "refresh_models": "POST /refresh-models",
            "generate": "POST /generate-content",
            "test": "POST /test"
        },
        "docs": "http://localhost:5000/docs",
        "examples": {
            "list_models": "curl http://localhost:5000/models",
            "refresh_models": "curl -X POST http://localhost:5000/refresh-models",
            "generate_with_groq": "curl -X POST http://localhost:5000/generate-content -H 'Content-Type: application/json' -d '{\"prompt\": \"Hello\", \"provider\": \"groq\", \"model\": \"mixtral-8x7b-32768\"}'"
        }
    }
