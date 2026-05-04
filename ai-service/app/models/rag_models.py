# RAG Request/Response Models with proper Pydantic typing
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# ============= REQUEST MODELS =============

class RagSearchRequest(BaseModel):
    """RAG similarity search request"""
    brand_id: str = Field(..., description="Brand UUID")
    query: str = Field(..., description="Search query text")
    limit: int = Field(default=5, ge=1, le=50, description="Max results to return")
    threshold: float = Field(default=0.3, ge=0.0, le=1.0, description="Similarity threshold")
    model: Optional[str] = Field(default=None, description="Embedding model override")
    provider: Optional[str] = Field(default=None, description="AI provider override (groq or openrouter)")

    class Config:
        json_schema_extra = {
            "example": {
                "brand_id": "e7af889f-c2b6-4593-984c-09f50417a447",
                "query": "coffee quality",
                "limit": 5,
                "threshold": 0.3
            }
        }


class RagGenerateContentRequest(BaseModel):
    """Generate content with RAG augmentation"""
    brand_id: str = Field(..., description="Brand UUID")
    prompt: str = Field(..., description="Content generation prompt")
    rag_query: Optional[str] = Field(default=None, description="Custom RAG search (defaults to prompt)")
    rag_limit: int = Field(default=3, ge=1, le=20, description="RAG results limit")
    rag_threshold: float = Field(default=0.3, ge=0.0, le=1.0, description="RAG similarity threshold")
    provider: str = Field(..., description="AI provider: groq or openrouter")
    model: str = Field(..., description="Model name or auto")
    tone: Optional[str] = Field(default=None, description="Content tone")

    class Config:
        json_schema_extra = {
            "example": {
                "brand_id": "e7af889f-c2b6-4593-984c-09f50417a447",
                "prompt": "Create social media post",
                "rag_query": "brand guidelines",
                "provider": "openrouter",
                "model": "nvidia/nemotron-3-super-120b-a12b:free"
            }
        }


# ============= RESPONSE MODELS =============

class EmbeddingChunkInfo(BaseModel):
    """Single embedding chunk from search results"""
    embedding_id: str
    library_item_id: str
    chunk_id: int
    text: str
    similarity: float
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class RagSearchResponse(BaseModel):
    """RAG search result response"""
    success: bool = Field(..., description="Operation success status")
    results: List[Dict[str, Any]] = Field(default_factory=list, description="Matching chunks")
    query: str = Field(..., description="Original search query")
    total_results: int = Field(default=0, description="Total results found")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "results": [],
                "query": "coffee quality",
                "total_results": 0,
                "error": None
            }
        }


class RagStatusResponse(BaseModel):
    """RAG index status response"""
    success: bool = Field(..., description="Operation success status")
    brand_id: str = Field(..., description="Brand UUID")
    status_data: Optional[Dict[str, Any]] = Field(default=None, description="Status metadata")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "brand_id": "e7af889f-c2b6-4593-984c-09f50417a447",
                "status_data": None,
                "error": None
            }
        }


class LibraryFileInfo(BaseModel):
    """Information about a library file"""
    library_id: str
    file_name: str
    file_type: str
    category: Optional[str] = None
    extracted_chars: int = 0
    total_chunks: int = 0
    created_at: Optional[datetime] = None


class RagLibraryResponse(BaseModel):
    """Library file listing response"""
    success: bool = Field(..., description="Operation success status")
    brand_id: str = Field(..., description="Brand UUID")
    files: List[Dict[str, Any]] = Field(default_factory=list, description="List of files")
    total_files: int = Field(default=0, description="Total files in library")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "brand_id": "e7af889f-c2b6-4593-984c-09f50417a447",
                "files": [],
                "total_files": 0,
                "error": None
            }
        }


class RagUploadResponse(BaseModel):
    """File upload response"""
    success: bool = Field(..., description="Operation success status")
    library_id: Optional[str] = Field(default=None, description="Uploaded file library ID")
    file_name: str = Field(..., description="Original file name")
    file_type: str = Field(..., description="Detected file type")
    category: Optional[str] = Field(default=None, description="File category")
    extracted_chars: int = Field(default=0, description="Characters extracted")
    text_preview: str = Field(default="", description="First 200 chars of extracted text")
    total_chunks: int = Field(default=0, description="Total chunks created")
    embeddings_saved: int = Field(default=0, description="Embeddings stored")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "library_id": "uuid-xxxxx",
                "file_name": "guidelines.txt",
                "file_type": "text",
                "category": "guidelines",
                "extracted_chars": 1024,
                "text_preview": "...",
                "total_chunks": 3,
                "embeddings_saved": 3,
                "error": None
            }
        }


class RagDeleteResponse(BaseModel):
    """Delete file response"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Operation message")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Deleted library item",
                "error": None
            }
        }


class RagGenerateContentResponse(BaseModel):
    """Response with generated content and RAG context"""
    success: bool = Field(..., description="Operation success status")
    content: Optional[str] = Field(default=None, description="Generated content")
    rag_context: List[Dict[str, Any]] = Field(default_factory=list, description="RAG chunks used")
    rag_query_used: str = Field(default="", description="RAG query that was executed")
    rag_results_count: int = Field(default=0, description="Number of RAG results")
    tokens_used: Optional[int] = Field(default=None, description="Tokens used in generation")
    ai_model: str = Field(default="", description="AI model used")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "content": "Generated post text...",
                "rag_context": [],
                "rag_query_used": "brand guidelines",
                "rag_results_count": 3,
                "tokens_used": 250,
                "ai_model": "nvidia/nemotron-3-super-120b-a12b:free",
                "error": None
            }
        }
