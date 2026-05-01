from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class SuggestReplyRequest(BaseModel):
    brand_id: str = Field(..., description="UUID of the brand")
    message_content: str = Field(..., description="The incoming message or comment content")
    platform: str = Field("generic", description="Social media platform (facebook, twitter, etc.)")
    message_type: str = Field("message", description="Type of interaction (message or comment)")
    customer_name: Optional[str] = Field(None, description="Name of the customer")
    brand_name: Optional[str] = Field(None, description="Name of the brand")
    brand_description: Optional[str] = Field(None, description="Description/Bio of the brand")
    provider: Optional[str] = None
    model: Optional[str] = None
    max_words: int = 100

class SuggestReplyResponse(BaseModel):
    success: bool
    suggestion: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    rag_used: bool = False
    error: Optional[str] = None
