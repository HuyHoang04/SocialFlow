# Chat Routes - API Endpoints for conversational AI
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.services.chat_service import ChatService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# ============= REQUEST/RESPONSE MODELS =============

class ChatRequest(BaseModel):
    brand_id: str = Field(..., description="Brand UUID")
    user_id: str = Field(..., description="User UUID")
    session_id: str = Field(..., description="Session UUID for memory")
    message: str = Field(..., description="User message")
    context_data: Optional[str] = Field(None, description="Additional context or referenced content (e.g. from Send to Chat)")
    provider: Optional[str] = "groq"
    model: Optional[str] = "auto"
    image_model: Optional[str] = None
    image_provider: Optional[str] = None
    embedding_model: Optional[str] = None
    embedding_provider: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    session_id: str
    success: bool
    source_documents: Optional[List[Dict[str, Any]]] = None
    suggested_entities: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============= DEPENDENCY =============

def get_chat_service():
    return ChatService()

# ============= ENDPOINTS =============

@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Send a message to the AI and get a conversational response with memory and RAG"""
    try:
        response = await chat_service.chat(
            brand_id=request.brand_id,
            user_id=request.user_id,
            session_id=request.session_id,
            user_message=request.message,
            context_data=request.context_data,
            provider=request.provider,
            model=request.model,
            image_model=request.image_model,
            image_provider=request.image_provider,
            embedding_model=request.embedding_model,
            embedding_provider=request.embedding_provider
        )
        return ChatResponse(**response)
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/session/{session_id}")
async def clear_chat_history(
    session_id: str,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Clear history for a specific session"""
    success = await chat_service.clear_session(session_id)
    return {"success": success, "message": f"Session {session_id} history cleared"}
