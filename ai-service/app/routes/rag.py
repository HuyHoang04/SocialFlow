# RAG Routes - Content library upload, search, and management
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Query
from typing import List, Optional, Dict, Any
from app.services.rag_service import RagService
from app.services.content_library_service import ContentLibraryService
from app.services.ai_service import AIService
from app.utils.logger import setup_logger
from pydantic import BaseModel
from app.prompts import format_rag_generation_prompt

logger = setup_logger(__name__)

router = APIRouter(prefix="/rag", tags=["rag"])

# Service instances
rag_service: Optional[RagService] = None
library_service: Optional[ContentLibraryService] = None
ai_service: Optional[AIService] = None

def get_rag_service() -> RagService:
    """Get RAG service singleton"""
    global rag_service
    if rag_service is None:
        rag_service = RagService()
    return rag_service

def get_library_service() -> ContentLibraryService:
    """Get content library service singleton"""
    global library_service
    if library_service is None:
        library_service = ContentLibraryService()
    return library_service

def get_ai_service() -> AIService:
    """Get AI service singleton"""
    global ai_service
    if ai_service is None:
        ai_service = AIService()
    return ai_service

# Request/Response Models
class RagSearchRequest(BaseModel):
    """RAG similarity search request"""
    brand_id: str
    query: str
    limit: int = 5
    threshold: float = 0.7
    model: Optional[str] = None

class RagSearchResponse(BaseModel):
    """RAG search result"""
    results: List[dict]
    query: str
    total_results: int
    success: bool
    error: Optional[str] = None

class RagStatusResponse(BaseModel):
    """RAG index status"""
    brand_id: str
    status_data: Optional[dict]
    success: bool
    error: Optional[str] = None

class RagGenerateContentRequest(BaseModel):
    """Generate content using RAG context"""
    brand_id: str                        # REQUIRED
    prompt: str                          # REQUIRED
    rag_query: Optional[str] = None      # Custom RAG search query (defaults to prompt)
    rag_limit: int = 3
    rag_threshold: float = 0.3
    provider: str                        # REQUIRED: "groq" or "openrouter"
    model: str                           # REQUIRED: model name or "auto"
    tone: Optional[str] = None

class RagGenerateContentResponse(BaseModel):
    """Response with generated content and RAG context used"""
    success: bool
    content: Optional[str] = None
    rag_context: List[dict] = []  # RAG results used for generation
    rag_query_used: str = ""
    rag_results_count: int = 0
    tokens_used: Optional[int] = None
    ai_model: str = ""
    error: Optional[str] = None

# ============= Endpoints =============

@router.post("/upload")
async def upload_to_library(
    brand_id: str,
    category: Optional[str] = None,
    file: UploadFile = File(...),
    library_service: ContentLibraryService = Depends(get_library_service),
    rag_service: RagService = Depends(get_rag_service)
) -> dict:
    """
    Upload file to brand's content library.
    
    Supported file types:
    - TEXT: .txt, .md, .csv
    - PDF: .pdf
    - IMAGE: .png, .jpg, .jpeg, .gif (OCR extraction)
    - DOCUMENT: .docx, .doc
    
    Process:
    1. Save file to storage
    2. Extract text (OCR/PDF parsing)
    3. Chunk text
    4. Generate embeddings
    5. Store in rag_embedding table
    """
    try:
        logger.info(f"RAG upload started | Brand: {brand_id} | File: {file.filename}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name required")
        
        # Read file content
        file_content = await file.read()
        
        if not file_content:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Determine file type and category
        file_type = library_service.get_file_type(file.filename)
        auto_category = library_service.get_category_from_filename(file.filename)
        final_category = category or auto_category
        
        logger.info(f"File type: {file_type} | Category: {final_category}")
        
        # Save file to storage
        success, file_path, error = library_service.save_uploaded_file(
            file_content=file_content,
            file_name=file.filename,
            brand_id=brand_id
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=f"File upload failed: {error}")
        
        # Extract text from file
        success, extracted_text, error = library_service.extract_text_from_file(
            file_path=file_path,
            file_type=file_type
        )
        
        if not success:
            logger.error(f"Text extraction failed: {error}")
            raise HTTPException(status_code=400, detail=f"Text extraction failed: {error}")
        
        logger.info(f"Extracted text: {len(extracted_text)} characters")
        
        # Save to content_library_item table
        library_id = rag_service.save_library_item(
            brand_id=brand_id,
            file_name=file.filename,
            file_type=file_type,
            category=final_category,
            extracted_text=extracted_text,
            storage_url=file_path,
            file_size=len(file_content),
            metadata={
                "original_name": file.filename,
                "upload_timestamp": str(__import__('datetime').datetime.now())
            }
        )
        
        if not library_id:
            raise HTTPException(status_code=500, detail="Failed to save library item")
        
        # Generate embeddings for chunks
        total_chunks, saved_embeddings = await rag_service.generate_embeddings_for_file(
            brand_id=brand_id,
            library_item_id=library_id,
            extracted_text=extracted_text
        )
        
        logger.info(f"RAG upload complete | Library ID: {library_id} | Chunks: {total_chunks} | Embeddings: {saved_embeddings}")
        
        return {
            "success": True,
            "library_id": library_id,
            "file_name": file.filename,
            "file_type": file_type,
            "category": final_category,
            "extracted_chars": len(extracted_text),
            "text_preview": extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
            "total_chunks": total_chunks,
            "embeddings_saved": saved_embeddings
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RAG upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", response_model=RagSearchResponse)
async def search_content(
    request: RagSearchRequest,
    rag_service: RagService = Depends(get_rag_service)
) -> RagSearchResponse:
    """
    Search for similar content using embedding similarity.
    
    Returns top-N chunks with similarity scores.
    """
    try:
        logger.info(f"RAG search started | Brand: {request.brand_id} | Query: '{request.query}'")
        
        results = await rag_service.search_similar_chunks(
            brand_id=request.brand_id,
            query_text=request.query,
            limit=request.limit,
            threshold=request.threshold,
            model=request.model
        )
        
        logger.info(f"RAG search found {len(results)} results")
        
        return RagSearchResponse(
            results=results,
            query=request.query,
            total_results=len(results),
            success=True,
            error=None
        )
    
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        return RagSearchResponse(
            results=[],
            query=request.query,
            total_results=0,
            success=False,
            error=str(e)
        )

@router.get("/library/{brand_id}")
async def list_library_files(
    brand_id: str,
    rag_service: RagService = Depends(get_rag_service)
) -> dict:
    """List all uploaded files for a brand"""
    try:
        logger.info(f"Listing library files for brand: {brand_id}")
        
        # TODO: Implement database query to list files
        # For now, return structure
        return {
            "success": True,
            "brand_id": brand_id,
            "files": [],
            "total_files": 0
        }
    except Exception as e:
        logger.error(f"List library error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{brand_id}", response_model=RagStatusResponse)
async def get_rag_status(
    brand_id: str,
    rag_service: RagService = Depends(get_rag_service)
) -> RagStatusResponse:
    """Get RAG indexing status for a brand"""
    try:
        logger.info(f"Getting RAG status for brand: {brand_id}")
        
        status = rag_service.get_rag_status(brand_id)
        
        return RagStatusResponse(
            brand_id=brand_id,
            status_data=status,
            success=True,
            error=None
        )
    
    except Exception as e:
        logger.error(f"Get status error: {e}")
        return RagStatusResponse(
            brand_id=brand_id,
            status_data=None,
            success=False,
            error=str(e)
        )

@router.delete("/library/{brand_id}/{library_id}")
async def delete_library_file(
    brand_id: str,
    library_id: str,
    rag_service: RagService = Depends(get_rag_service)
) -> dict:
    """Delete file from library (soft delete)"""
    try:
        logger.info(f"Deleting library file: {library_id} for brand: {brand_id}")
        
        # TODO: Implement soft delete in database
        return {
            "success": True,
            "message": f"Deleted library item {library_id}"
        }
    
    except Exception as e:
        logger.error(f"Delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-content", response_model=RagGenerateContentResponse)
async def generate_content_with_rag(
    request: RagGenerateContentRequest,
    rag_service: RagService = Depends(get_rag_service),
    ai_service: AIService = Depends(get_ai_service)
) -> RagGenerateContentResponse:
    """
    Generate content augmented with brand guidelines from RAG.
    
    Process:
    1. Search RAG for brand guidelines matching prompt
    2. Augment prompt with retrieved context
    3. Generate content using AI
    4. Return generated content + context used
    """
    try:
        logger.info(f"RAG generate-content started | Brand: {request.brand_id}")
        
        # Search RAG for brand guidelines
        rag_query = request.rag_query or request.prompt
        logger.info(f"Searching RAG with query: {rag_query}")
        
        rag_results = await rag_service.search_similar_chunks(
            brand_id=request.brand_id,
            query_text=rag_query,
            limit=request.rag_limit,
            threshold=request.rag_threshold
        )
        
        logger.info(f"Found {len(rag_results)} RAG results")
        
        # Build augmented prompt with RAG context using standard prompt template
        augmented_prompt = request.prompt
        
        if rag_results:
            context_text = "\n\n".join([
                f"[Source: {r.get('chunk_id', 'N/A')} | Relevance: {r.get('similarity', 0):.1%}]\n{r.get('text', '')}"
                for r in rag_results
            ])
            
            # Use standard RAG prompt template to ensure consistent formatting
            augmented_prompt = format_rag_generation_prompt(
                prompt=request.prompt,
                context=context_text
            )
            
            logger.info(f"Augmented prompt with {len(rag_results)} RAG results")
        
        # Generate content with augmented prompt
        generation_result = await ai_service.generate_content(
            prompt=augmented_prompt,
            provider=request.provider,
            model=request.model
        )
        
        # Handle both dict and Pydantic model responses
        if isinstance(generation_result, dict):
            result_success = generation_result.get("success")
            result_content = generation_result.get("content")
            result_error = generation_result.get("error", "Unknown error")
            result_tokens = generation_result.get("tokens_used") or generation_result.get("token_count")
            result_model = generation_result.get("model", "")
        else:
            result_success = generation_result.success if hasattr(generation_result, 'success') else False
            result_content = generation_result.content if hasattr(generation_result, 'content') else None
            result_error = generation_result.error if hasattr(generation_result, 'error') else "Unknown error"
            result_tokens = generation_result.tokens_used if hasattr(generation_result, 'tokens_used') else None
            result_model = generation_result.model if hasattr(generation_result, 'model') else ""
        
        if not result_success:
            logger.error(f"Content generation failed: {result_error}")
            return RagGenerateContentResponse(
                success=False,
                content=None,
                rag_context=rag_results,
                rag_query_used=rag_query,
                rag_results_count=len(rag_results),
                error=result_error
            )
        
        logger.info("RAG generate-content completed successfully")
        
        return RagGenerateContentResponse(
            success=True,
            content=result_content,
            rag_context=rag_results,
            rag_query_used=rag_query,
            rag_results_count=len(rag_results),
            tokens_used=result_tokens,
            ai_model=result_model,
            error=None
        )
    
    except Exception as e:
        logger.error(f"RAG generate-content error: {e}", exc_info=True)
        return RagGenerateContentResponse(
            success=False,
            content=None,
            rag_context=[],
            rag_query_used="",
            rag_results_count=0,
            error=str(e)
        )
