# app/services/brand_context_service.py
from typing import Dict, Any, Optional

class BrandContextService:
    """Service to load brand metadata and analytics to build AI context"""
    
    def __init__(self):
        # We assume standard DB connections or API clients are available here
        pass
        
    async def get_brand_metadata(self, brand_id: str) -> Dict[str, Any]:
        """Load brand metadata including AI preferences"""
        # In a real scenario, this would query the Java backend or shared DB
        # For this implementation, we will mock or call the backend API
        # To make it simple for the AI service, we assume the frontend passes 
        # the required context, or we fetch from backend API.
        
        import httpx
        from app.config import JAVA_BACKEND_URL
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{JAVA_BACKEND_URL}/api/brands/public/{brand_id}/ai-context", timeout=5.0)
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "name": data.get("name", "SocialFlow Brand"),
                        "voice_guidelines": data.get("voice_guidelines", ""),
                        "content_guardrails": data.get("content_guardrails", ""),
                        "product_description": data.get("product_description", "")
                    }
        except Exception as e:
            from app.utils.logger import setup_logger
            logger = setup_logger(__name__)
            logger.error(f"Failed to fetch brand context from backend: {e}")
            
        return {
            "name": "Generic Brand",
            "voice_guidelines": "Professional",
            "content_guardrails": "None",
            "product_description": ""
        }

    async def get_analytics_summary(self, brand_id: str, date_range: int = 30) -> Dict[str, Any]:
        """Fetch analytics data to find golden hours and audience insights"""
        # Mocking analytics data
        return {
            "golden_hour": "8:00 AM - 10:00 AM",
            "target_audience": "Millennials and Gen Z professionals",
            "top_content_type": "Video"
        }

    async def build_context_with_analytics(self, brand_id: str, scheduled_time: Optional[str] = None) -> Dict[str, Any]:
        """Build rich context for AI prompts"""
        brand_meta = await self.get_brand_metadata(brand_id)
        analytics = await self.get_analytics_summary(brand_id)
        
        return {
            "brand_name": brand_meta.get("name"),
            "voice": brand_meta.get("voice_guidelines"),
            "guardrails": brand_meta.get("content_guardrails"),
            "product_desc": brand_meta.get("product_description"),
            "golden_hour": analytics.get("golden_hour"),
            "target_audience": analytics.get("target_audience"),
            "scheduled_time": scheduled_time
        }
