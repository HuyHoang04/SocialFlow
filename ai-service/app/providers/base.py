# Base provider interface
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BaseProvider(ABC):
    """Abstract base class for AI providers"""
    
    @abstractmethod
    async def fetch_models(self) -> Dict[str, Any]:
        """Fetch available models from provider"""
        pass
    
    @abstractmethod
    async def generate(self, prompt: str, model: str) -> Dict[str, Any]:
        """Generate content using specified model"""
        pass
    
    @abstractmethod
    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate cost for token usage"""
        pass

    @abstractmethod
    async def fetch_embedding_models(self) -> Dict[str, Any]:
        """Fetch available embedding models from provider"""
        pass

    @abstractmethod
    async def embed(self, texts: List[str], model: str, images: List[str] = None) -> Dict[str, Any]:
        """Generate embeddings for texts (and optionally images) using specified model"""
        pass

    @abstractmethod
    def calculate_embedding_cost(self, token_count: int, model: str) -> float:
        """Calculate cost for embedding token usage"""
        pass
