# LangChain Service - Orchestration layer for AI models
from typing import Optional, Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from app.config import (
    OPENROUTER_API_KEY, 
    GROQ_API_KEY, 
    DEFAULT_GROQ_MODEL, 
    DEFAULT_OPENROUTER_MODEL,
    DEFAULT_TEMPERATURE
)
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

class LangChainService:
    """Service to provide standardized LangChain model instances"""
    
    def __init__(self):
        self.temperature = DEFAULT_TEMPERATURE
        
    def get_model(self, provider: str, model: str = "auto", streaming: bool = False):
        """
        Returns a LangChain-compatible chat model instance.
        Supports Groq and OpenRouter (via ChatOpenAI).
        """
        try:
            if provider == "groq":
                target_model = model if model != "auto" else DEFAULT_GROQ_MODEL
                logger.info(f"Initializing LangChain Groq model: {target_model}")
                return ChatGroq(
                    groq_api_key=GROQ_API_KEY,
                    model_name=target_model,
                    temperature=self.temperature,
                    streaming=streaming
                )
            
            elif provider == "openrouter":
                target_model = model if model != "auto" else DEFAULT_OPENROUTER_MODEL
                logger.info(f"Initializing LangChain OpenRouter model (via ChatOpenAI): {target_model}")
                return ChatOpenAI(
                    openai_api_key=OPENROUTER_API_KEY,
                    openai_api_base="https://openrouter.ai/api/v1",
                    model_name=target_model,
                    temperature=self.temperature,
                    streaming=streaming,
                    default_headers={
                        "HTTP-Referer": "https://socialflow.com",
                        "X-OpenRouter-Title": "SocialFlow"
                    },
                    timeout=300
                )
            
            else:
                raise ValueError(f"Unsupported provider for LangChain: {provider}")
                
        except Exception as e:
            logger.error(f"Failed to initialize LangChain model: {e}")
            raise
