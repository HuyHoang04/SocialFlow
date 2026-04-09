# Embedding service - orchestrate embeddings across providers
import httpx
from typing import Dict, Any, List, Optional
from app.providers.groq_provider import GroqProvider
from app.providers.openrouter_provider import OpenRouterProvider
from app.config import ENABLE_EMBBED_FALLBACK
from app.database import get_db_client
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

class EmbeddingService:
    """Orchestrate embeddings with dual-provider strategy and PostgreSQL storage"""
    
    def __init__(self):
        self.groq_provider = GroqProvider()
        self.openrouter_provider = OpenRouterProvider()
        self.embedding_models_cache = None
        self.db_client = get_db_client()  # Initialize DB connection
    
    async def fetch_and_cache_embedding_models(self) -> Dict[str, Any]:
        """Fetch available embedding models from all providers"""
        try:
            logger.info("Fetching embedding models from all providers...")
            
            groq_models = await self.groq_provider.fetch_embedding_models()
            openrouter_models = await self.openrouter_provider.fetch_embedding_models()
            
            self.embedding_models_cache = {
                "groq": groq_models,
                "openrouter": openrouter_models
            }
            
            logger.info(f"Cached embedding models: Groq={len(groq_models)}, OpenRouter={len(openrouter_models)}")
            return self.embedding_models_cache
        
        except Exception as e:
            logger.error(f"Failed to fetch embedding models: {e}")
            return {"groq": {}, "openrouter": {}}
    
    async def get_embedding_models(self) -> Dict[str, Any]:
        """Get cached or fresh embedding models"""
        if not self.embedding_models_cache:
            return await self.fetch_and_cache_embedding_models()
        return self.embedding_models_cache
    
    def get_model_info(self, provider: Optional[str], model: Optional[str]) -> Optional[Dict[str, Any]]:
        """Get metadata for a specific embedding model"""
        if not self.embedding_models_cache:
            logger.warning("Embedding models cache is empty")
            return None
        
        if provider and model:
            if provider in self.embedding_models_cache:
                models = self.embedding_models_cache[provider]
                if model in models:
                    return models[model]
        
        return None
    
    async def embed(
        self,
        brand_id: str,
        texts: List[str],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        images: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate embeddings with OpenRouter (Groq doesn't support embeddings)
        Supports both text-only and multimodal (text + images) embeddings.
        When images are provided, text context is required.
        """
        try:
            # Validate images have text context
            if images and not texts:
                raise Exception("Images require text context. Please provide 'texts' along with 'images'")
            
            # Only OpenRouter supports embeddings (Groq doesn't)
            if provider == "groq":
                logger.error("Groq does not support embedding models")
                raise Exception("Groq does not support embeddings. Use 'openrouter' or None (default)")
            
            # Use OpenRouter (primary and only option)
            logger.info("Using OpenRouter for embeddings")
            
            # Determine which model to use based on ENABLE_EMBBED_FALLBACK flag
            if not model:
                if ENABLE_EMBBED_FALLBACK:
                    model = "nvidia/llama-nemotron-embed-vl-1b-v2"  # FREE multimodal model
                    logger.info("Using FREE default embedding model (ENABLE_EMBBED_FALLBACK=true)")
                else:
                    logger.error("Model not specified and ENABLE_EMBBED_FALLBACK is disabled")
                    raise Exception("Model is required when ENABLE_EMBBED_FALLBACK=false. Please specify a model explicitly.")
            
            result = await self.openrouter_provider.embed(
                texts,
                model,
                images=images
            )
            
            if result.success:
                # Save to PostgreSQL directly
                self._save_embeddings_to_db(brand_id, texts, result)
                return result.dict()
            
            raise Exception(result.error or "OpenRouter embedding failed")
        
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            raise
    
    def _save_embeddings_to_db(
        self,
        brand_id: str,
        texts: List[str],
        embedding_result: Any
    ) -> Optional[Dict[str, Any]]:
        """Save embeddings to PostgreSQL database"""
        try:
            logger.info(f"Saving {len(texts)} embeddings to PostgreSQL...")
            
            # Ensure database connection is alive
            if not self.db_client.ensure_connected():
                logger.error("Failed to establish database connection")
                return None
            
            embeddings = embedding_result.embeddings if hasattr(embedding_result, 'embeddings') else embedding_result.get("embeddings", [])
            model = embedding_result.model if hasattr(embedding_result, 'model') else embedding_result.get("model")
            provider = embedding_result.provider if hasattr(embedding_result, 'provider') else embedding_result.get("provider")
            
            # Call database client to save
            save_result = self.db_client.save_embeddings(
                brand_id=brand_id,
                texts=texts,
                embeddings=embeddings,
                model=model,
                provider=provider
            )
            
            if save_result and save_result.get("success"):
                logger.info(f"Successfully saved embeddings to PostgreSQL: {save_result}")
                return save_result
            else:
                logger.warning(f"Failed to save embeddings to PostgreSQL: {save_result}")
                return None
        
        except Exception as e:
            logger.error(f"Failed to save embeddings to PostgreSQL: {e}")
            return None
    