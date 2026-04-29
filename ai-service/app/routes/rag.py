# RAG Routes - Content library upload, search, and management
# CLEANLY SEPARATED: Routes handle HTTP only, all logic delegated to services
from fastapi import APIRouter, UploadFile, File, Depends, Query
from typing import Optional
from app.services.rag_service import RagService
from app.services.content_library_service import ContentLibraryService
from app.services.ai_service import AIService
from app.utils.logger import setup_logger
from app.models.rag_models import (
    RagSearchRequest, RagSearchResponse,
    RagGenerateContentRequest, RagGenerateContentResponse,
    RagStatusResponse, RagLibraryResponse, 
    RagUploadResponse, RagDeleteResponse
)

logger = setup_logger(__name__)

router = APIRouter(prefix="/rag", tags=["rag"])

# ============= Dependency Injection =============

def get_rag_service() -> RagService:
    """Get RAG service singleton"""
    return RagService()

def get_library_service() -> ContentLibraryService:
    """Get content library service singleton"""
    return ContentLibraryService()

def get_ai_service() -> AIService:
    """Get AI service singleton"""
    return AIService()


# ============= ENDPOINTS - HTTP HANDLERS ONLY =============

@router.post("/upload", response_model=RagUploadResponse)
async def upload_to_library(
    brand_id: str,
    category: Optional[str] = None,
    provider: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    file: UploadFile = File(...),
    library_service: ContentLibraryService = Depends(get_library_service),
    rag_service: RagService = Depends(get_rag_service)
) -> RagUploadResponse:
    """Upload file to brand's content library"""
    try:
        if not file or not file.filename:
            return RagUploadResponse(
                success=False,
                file_name=file.filename or "unknown",
                file_type="unknown",
                error="File name required"
            )
        
        file_content = await file.read()
        
        if not file_content:
            return RagUploadResponse(
                success=False,
                file_name=file.filename,
                file_type="unknown",
                error="Empty file"
            )
        
        # Delegate ALL business logic to service
        response = await rag_service.upload_file(
            brand_id=brand_id,
            file_content=file_content,
            file_name=file.filename,
            category=category,
            provider=provider,
            model=model,
            library_service=library_service
        )
        
        return response
    
    except Exception as e:
        logger.error(f"Upload endpoint error: {e}")
        return RagUploadResponse(
            success=False,
            file_name=file.filename or "unknown",
            file_type="unknown",
            error=f"Server error: {str(e)}"
        )


@router.post("/search", response_model=RagSearchResponse)
async def search_content(
    request: RagSearchRequest,
    rag_service: RagService = Depends(get_rag_service)
) -> RagSearchResponse:
    """Search for similar content using embeddings"""
    try:
        logger.info(f"Search endpoint | Brand: {request.brand_id} | Query: {request.query}")
        
        # Call service - returns raw list of dicts
        results = await rag_service.search_similar_chunks(
            brand_id=request.brand_id,
            query_text=request.query,
            limit=request.limit,
            threshold=request.threshold,
            model=request.model,
            provider=request.provider
        )
        
        # Wrap in DTO
        return RagSearchResponse(
            success=True,
            results=results,
            query=request.query,
            total_results=len(results) if results else 0
        )
    
    except Exception as e:
        logger.error(f"Search endpoint error: {e}")
        return RagSearchResponse(
            success=False,
            results=[],
            query=request.query,
            total_results=0,
            error=f"Server error: {str(e)}"
        )


@router.get("/library/{brand_id}", response_model=RagLibraryResponse)
async def list_library_files(
    brand_id: str,
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    rag_service: RagService = Depends(get_rag_service)
) -> RagLibraryResponse:
    """List all uploaded files for a brand"""
    try:
        logger.info(f"List library endpoint | Brand: {brand_id} | Limit: {limit} | Offset: {offset}")
        
        # Call service - returns raw list of dicts
        files = await rag_service.get_library_files(brand_id, limit, offset)
        total_files = await rag_service.count_library_files(brand_id)
        
        # Wrap in DTO
        return RagLibraryResponse(
            success=True,
            brand_id=brand_id,
            files=files,
            total_files=total_files
        )
    
    except Exception as e:
        logger.error(f"List library endpoint error: {e}")
        return RagLibraryResponse(
            success=False,
            brand_id=brand_id,
            files=[],
            total_files=0,
            error=f"Server error: {str(e)}"
        )


@router.get("/status/{brand_id}", response_model=RagStatusResponse)
async def get_rag_status(
    brand_id: str,
    rag_service: RagService = Depends(get_rag_service)
) -> RagStatusResponse:
    """Get indexing status and readiness for a brand"""
    try:
        logger.info(f"Status endpoint | Brand: {brand_id}")
        
        status_data = rag_service.get_rag_status(brand_id)
        
        return RagStatusResponse(
            success=True,
            brand_id=brand_id,
            status_data=status_data
        )
    
    except Exception as e:
        logger.error(f"Status endpoint error: {e}")
        return RagStatusResponse(
            success=False,
            brand_id=brand_id,
            status_data=None,
            error=f"Server error: {str(e)}"
        )


@router.delete("/library/{brand_id}/{library_id}", response_model=RagDeleteResponse)
async def delete_library_file(
    brand_id: str,
    library_id: str,
    rag_service: RagService = Depends(get_rag_service)
) -> RagDeleteResponse:
    """Delete file from library (soft delete)"""
    try:
        logger.info(f"Delete endpoint | Brand: {brand_id} | Library ID: {library_id}")
        
        # Call service
        success = rag_service.delete_library_file_sync(brand_id, library_id)
        
        if success:
            return RagDeleteResponse(
                success=True,
                message=f"Deleted library item {library_id}"
            )
        else:
            return RagDeleteResponse(
                success=False,
                message="",
                error="Library item not found"
            )
    
    except Exception as e:
        logger.error(f"Delete endpoint error: {e}")
        return RagDeleteResponse(
            success=False,
            message="",
            error=f"Server error: {str(e)}"
        )


@router.post("/generate-content", response_model=RagGenerateContentResponse)
async def generate_content_with_rag(
    request: RagGenerateContentRequest,
    rag_service: RagService = Depends(get_rag_service),
    ai_service: AIService = Depends(get_ai_service)
) -> RagGenerateContentResponse:
    """Generate content augmented with RAG context"""
    try:
        logger.info(f"Generate content endpoint | Brand: {request.brand_id}")
        
        response = await rag_service.generate_content_with_rag(
            request=request,
            ai_service=ai_service
        )
        
        return response
    
    except Exception as e:
        logger.error(f"Generate content endpoint error: {e}")
        return RagGenerateContentResponse(
            success=False,
            content=None,
            rag_context=[],
            rag_query_used="",
            rag_results_count=0,
            error=f"Server error: {str(e)}"
        )


@router.post("/generate-with-images", response_model=RagGenerateContentResponse)
async def generate_content_with_rag_and_images(
    request: RagGenerateContentRequest,
    rag_service: RagService = Depends(get_rag_service),
    ai_service: AIService = Depends(get_ai_service)
) -> RagGenerateContentResponse:
    """Generate content with RAG context and image references"""
    try:
        logger.info(f"Generate content with images endpoint | Brand: {request.brand_id}")
        
        response = await rag_service.generate_content_with_rag_and_images(
            request=request,
            ai_service=ai_service
        )
        
        return response
    
    except Exception as e:
        logger.error(f"Generate content with images endpoint error: {e}")
        return RagGenerateContentResponse(
            success=False,
            content=None,
            rag_context=[],
            rag_query_used="",
            rag_results_count=0,
            error=f"Server error: {str(e)}"
        )
