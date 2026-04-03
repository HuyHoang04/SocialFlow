# Base provider interface
from abc import ABC, abstractmethod
from typing import Dict, Any

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
