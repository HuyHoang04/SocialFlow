# FastAPI Application
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.services.ai_service import AIService
from app.services.embedding_service import EmbeddingService
from app.routes import health, models, generation, embeddings, rag, chat, suggestion
from app.database import get_db_client, close_db_client
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# Singleton services
ai_service = AIService()
embedding_service = EmbeddingService()

# Create FastAPI app
app = FastAPI(
    title="SocialFlow AI Service",
    version="2.0.0",
    description="Dual-provider AI generation service (Groq + OpenRouter) with embeddings"
)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Startup: Loading models from provider APIs...")
    await ai_service.refresh_models()
    await embedding_service.fetch_and_cache_embedding_models()
    
    # Initialize database connection
    db_client = get_db_client()
    if db_client.connect():
        logger.info("PostgreSQL connection established")
    else:
        logger.warning("Failed to establish PostgreSQL connection")
    
    logger.info("AI Service + Embedding Service + Database ready!")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutdown: Closing database connection...")
    close_db_client()
    logger.info("Database connection closed")

# Include routers
app.include_router(health.router)
app.include_router(models.router)
app.include_router(generation.router)
app.include_router(embeddings.router)
app.include_router(rag.router)
app.include_router(chat.router)
app.include_router(suggestion.router)

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
            "test": "POST /test",
            "embedding_models": "GET /embedding-models",
            "embed": "POST /embed"
        },
        "docs": "http://localhost:5000/docs",
        "examples": {
            "list_models": "curl http://localhost:5000/models",
            "refresh_models": "curl -X POST http://localhost:5000/refresh-models",
            "generate_with_groq": "curl -X POST http://localhost:5000/generate-content -H 'Content-Type: application/json' -d '{\"prompt\": \"Hello\", \"provider\": \"groq\", \"model\": \"mixtral-8x7b-32768\"}'",
            "list_embedding_models": "curl http://localhost:5000/embedding-models",
            "embed": "curl -X POST http://localhost:5000/embed -H 'Content-Type: application/json' -d '{\"brand_id\": \"uuid-xxx\", \"texts\": [\"text1\", \"text2\"]}'"
        }
    }
