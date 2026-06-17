# RAG (Retrieval-Augmented Generation) Service
# Handles content library management, embedding generation, and similarity search

import os
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import json
import re
from app.database import get_db_client
from app.utils.logger import setup_logger
from app.services.embedding_service import EmbeddingService
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.prompts import format_rag_variation_prompt
from app.config import DEFAULT_OPENROUTER_MODEL # Import defaults

logger = setup_logger(__name__)

class RagService:
    """Manage RAG embeddings and vector similarity search"""
    
    def __init__(self):
        self.db_client = get_db_client()
        self.embedding_service = EmbeddingService()
        self.chunk_size_tokens = 512  # Tokens per chunk
        self.chunk_overlap_tokens = 102  # ~20% overlap
    
    def chunk_text(self, text: str, chunk_size: int = 512, overlap: int = 102) -> List[str]:
        """
        Split text into overlapping chunks for embedding using LangChain's
        RecursiveCharacterTextSplitter for better semantic integrity.
        Approximate token conversion: 1 token ≈ 4 characters
        """
        if not text:
            return []
        
        # Convert tokens to characters for the splitter
        chunk_size_chars = chunk_size * 4
        overlap_chars = overlap * 4
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size_chars,
            chunk_overlap=overlap_chars,
            separators=["\n\n", "\n", " ", ""]
        )
        
        return splitter.split_text(text)
    
    def save_library_item(
        self,
        brand_id: str,
        file_name: str,
        file_type: str,
        category: str,
        extracted_text: str,
        storage_url: str = None,
        file_size: int = None,
        metadata: Dict[str, Any] = None
    ) -> Optional[str]:
        """Save uploaded file metadata to content_library_item table"""
        db_client = get_db_client()
        conn = db_client.get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            
            # Safeguard: Validate category against DB constraints
            valid_categories = ['BRAND_GUIDELINES', 'POST_TEMPLATES', 'CUSTOMER_FEEDBACK', 'FAQ', 'COMPETITOR_ANALYSIS', 'MEDIA_ASSETS', 'OTHER']
            if category not in valid_categories:
                category = 'OTHER'
                
            library_id = str(uuid.uuid4())
            
            logger.info(f"Saving library item: {library_id}")
            logger.info(f"  Brand: {brand_id}, File: {file_name}, Type: {file_type}, Category: {category}")
            
            # Save library item
            insert_sql = """
                INSERT INTO content_library_item 
                (id, brand_id, file_name, file_type, category, file_size, storage_url, extracted_text, metadata, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """
            
            cursor.execute(insert_sql, (
                library_id,
                brand_id,
                file_name,
                file_type,
                category,
                file_size,
                storage_url,
                extracted_text,
                json.dumps(metadata) if metadata else None
            ))
            
            conn.commit()
            logger.info(f"✓ Saved library item: {library_id}")
            return library_id
        
        except Exception as e:
            try:
                if conn:
                    conn.rollback()
            except:
                pass
            logger.error(f"RAG save_library_item error: {e}")
            logger.error(f"  SQL Error details: {str(e)}")
            return None
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    async def generate_embeddings_for_file(
        self,
        brand_id: str,
        library_item_id: str,
        extracted_text: str,
        model: Optional[str] = None,
        provider: Optional[str] = None
    ) -> Tuple[int, int]:
        """
        Chunk text and generate embeddings for all chunks.
        Returns: (total_chunks, successful_embeddings)
        """
        try:
            if not extracted_text:
                logger.warning(f"No text to embed for file {library_item_id}")
                return 0, 0
            
            # Split into chunks
            chunks = self.chunk_text(extracted_text)
            logger.info(f"Created {len(chunks)} chunks for file {library_item_id}")
            
            if not chunks:
                return 0, 0
            
            # Generate embeddings for all chunks at once
            try:
                from app.config import DEFAULT_EMBEDDING_MODEL
                embedding_response = await self.embedding_service.embed(
                    brand_id=brand_id,
                    texts=chunks,  # Pass all chunks
                    model=model or DEFAULT_EMBEDDING_MODEL,
                    provider=provider
                )
                
                if not embedding_response.get("success"):
                    logger.error(f"Embedding failed: {embedding_response.get('error')}")
                    return len(chunks), 0
                
                # Save embeddings to rag_embedding table
                embeddings = embedding_response.get("embeddings", [])
                logger.info(f"Got {len(embeddings)} embeddings from response, chunks={len(chunks)}")
                
                if not embeddings:
                    logger.warning(f"No embeddings returned for {len(chunks)} chunks")
                    return len(chunks), 0
                
                logger.info(f"Calling _save_chunk_embeddings with {len(embeddings)} embeddings")
                saved_count = self._save_chunk_embeddings(
                    brand_id=brand_id,
                    library_item_id=library_item_id,
                    chunks=chunks,
                    embeddings=embeddings,
                    model=model or embedding_response.get("model"),
                    provider=provider or embedding_response.get("provider")
                )
                logger.info(f"_save_chunk_embeddings returned: {saved_count} saved")
                
                logger.info(f"Generated & saved {saved_count}/{len(chunks)} embeddings")
                return len(chunks), saved_count
            
            except Exception as e:
                logger.error(f"Embedding generation error: {e}")
                return len(chunks), 0
        
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            return 0, 0
    
    def _save_chunk_embeddings(
        self,
        brand_id: str,
        library_item_id: str,
        chunks: List[str],
        embeddings: List[List[float]],
        model: str = None,
        provider: str = None
    ) -> int:
        """Save chunk embeddings to rag_embedding table"""
        logger.info(f"_save_chunk_embeddings called: {len(chunks)} chunks, {len(embeddings)} embeddings")
        
        db_client = get_db_client()
        conn = db_client.get_connection()
        cursor = None
        
        if not conn:
            logger.error("Failed to get database connection")
            return 0
        
        try:
            cursor = conn.cursor()
            
            embedding_records = []
            
            for chunk_id, (chunk_text, embedding_vector) in enumerate(zip(chunks, embeddings)):
                if chunk_text and embedding_vector:
                    # Convert embedding to pgvector format
                    vector_str = '[' + ', '.join(str(v) for v in embedding_vector) + ']'
                    logger.debug(f"  Chunk {chunk_id}: {len(embedding_vector)} dimensions, {len(chunk_text)} chars")
                    
                    embedding_records.append((
                        str(uuid.uuid4()),
                        brand_id,
                        library_item_id,
                        chunk_id,
                        chunk_text,
                        vector_str,  # pgvector format
                        model,
                        provider,
                        json.dumps({"chunk_position": chunk_id, "word_count": len(chunk_text.split())})
                    ))
            
            if not embedding_records:
                logger.warning("No embedding records to insert")
                return 0
            
            logger.info(f"Inserting {len(embedding_records)} embedding records into rag_embedding table")
            
            insert_sql = """
                INSERT INTO rag_embedding 
                (id, brand_id, library_item_id, chunk_id, chunk_text, embedding, model, provider, metadata)
                VALUES (%s, %s, %s, %s, %s, %s::vector, %s, %s, %s)
            """
            
            cursor.executemany(insert_sql, embedding_records)
            conn.commit()
            
            logger.info(f"✓ Saved {len(embedding_records)} embeddings to rag_embedding table")
            return len(embedding_records)
        
        except Exception as e:
            try:
                conn.rollback()
            except:
                pass
            logger.error(f"✗ Failed to save embeddings to rag_embedding: {e}", exc_info=True)
            logger.error(f"  Exception type: {type(e).__name__}")
            logger.error(f"  Brand: {brand_id}, Library Item: {library_item_id}")
            return 0
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass

    async def search_similar_chunks(
        self,
        brand_id: str,
        query_text: str,
        limit: int = 5,
        threshold: float = 0.3,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        use_multi_query: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Search for similar content chunks using Multi-Query strategy.
        Generates variations of the query to broaden search results.
        """
        try:
            if not query_text:
                return []

            queries = [query_text]
            
            # Phase 1: Generate query variations for better coverage (only if enabled)
            if use_multi_query and len(query_text) > 10:
                try:
                    # Use a very fast model to generate variations
                    # This helps find content that might use different wording
                    from app.services.ai_service import AIService
                    ai_service = AIService()
                    
                    variation_prompt = format_rag_variation_prompt(query_text)
                    
                    # Use the same provider/model passed to the search function
                    response = await ai_service.generate_content(
                        variation_prompt, 
                        provider=provider or "openrouter", 
                        model=model or DEFAULT_OPENROUTER_MODEL,
                        max_words=100
                    )
                    
                    is_success = response.get("success") if isinstance(response, dict) else getattr(response, "success", False)
                    content = response.get("content", "") if isinstance(response, dict) else getattr(response, "content", "")
                    
                    if is_success and content:
                        variations = [v.strip() for v in content.split('\n') if v.strip()]
                        queries.extend(variations[:2])
                        logger.info(f"🔍 Generated variations: {variations[:2]}")
                except Exception as e:
                    logger.warning(f"Multi-query generation failed, falling back to single query: {e}")

            # Phase 2: Get embeddings for all queries concurrently
            all_results = []
            seen_chunk_ids = set()
            
            from app.config import DEFAULT_EMBEDDING_MODEL
            import asyncio
            
            # Gather all embedding tasks
            embed_tasks = [
                self.embedding_service.embed(
                    brand_id=brand_id,
                    texts=[q],
                    model=DEFAULT_EMBEDDING_MODEL,  # Force default embed model, ignore text model
                    provider="openrouter",
                    save=False
                )
                for q in queries
            ]
            
            query_responses = await asyncio.gather(*embed_tasks)
            
            for query_response in query_responses:
                if not query_response.get("success"):
                    continue
                
                query_vector = query_response.get("embeddings", [[]])[0]
                if not query_vector:
                    continue
                
                # Convert to pgvector format
                vector_str = '[' + ', '.join(str(v) for v in query_vector) + ']'
                
                from app.database import get_async_pool
                pool = get_async_pool()
                
                try:
                    async with pool.connection() as conn:
                        async with conn.cursor() as cursor:
                            # Phase 3: Execute vector similarity search using Cosine Similarity (<=>)
                            # Do NOT filter by text model
                            model_filter = ""
                            params = [vector_str, brand_id]
                            
                            params.extend([vector_str, threshold, limit])
                            
                            search_sql = f"""
                                SELECT id, library_item_id, chunk_id, chunk_text,
                                       (1 - (embedding <=> %s::vector)) AS similarity,
                                       metadata
                                FROM rag_embedding
                                WHERE brand_id = %s {model_filter}
                                AND (1 - (embedding <=> %s::vector)) >= %s
                                ORDER BY similarity DESC
                                LIMIT %s
                            """
                            await cursor.execute(search_sql, tuple(params))
                            results = await cursor.fetchall()
                            
                            for row in results:
                                chunk_id = row[2]
                                if chunk_id not in seen_chunk_ids:
                                    seen_chunk_ids.add(chunk_id)
                                    all_results.append({
                                        "id": row[0],
                                        "library_item_id": row[1],
                                        "chunk_id": chunk_id,
                                        "text": row[3],
                                        "similarity": float(row[4]),
                                        "metadata": row[5] or {}
                                    })
                except Exception as e:
                    logger.error(f"Vector search failed: {e}")

            # Sort by similarity and limit
            all_results.sort(key=lambda x: x["similarity"], reverse=True)
            return all_results[:limit]
        
        except Exception as e:
            logger.error(f"RAG search error: {e}")
            return []
    
    def get_rag_status(self, brand_id: str) -> Optional[Dict[str, Any]]:
        """Get RAG index status with manual fallback if record is missing"""
        db_client = get_db_client()
        conn = db_client.get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            
            # 1. Try to get from rag_index table first
            query = """
                SELECT total_files, indexed_chunks, total_embeddings, status, error_message, last_updated
                FROM rag_index WHERE brand_id = %s
            """
            cursor.execute(query, (brand_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    "total_files": row[0],
                    "indexed_chunks": row[1],
                    "total_embeddings": row[2],
                    "status": row[3],
                    "error_message": row[4],
                    "last_updated": row[5].isoformat() if row[5] else None,
                    "is_ready": row[0] > 0
                }
            
            # 2. Fallback: Manual count if index record is missing
            cursor.execute("SELECT COUNT(*) FROM content_library_item WHERE brand_id = %s AND is_deleted = FALSE", (brand_id,))
            file_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM rag_embedding WHERE brand_id = %s", (brand_id,))
            embedding_count = cursor.fetchone()[0]
            
            return {
                "total_files": file_count,
                "total_embeddings": embedding_count,
                "status": "COMPLETE" if file_count > 0 else "PENDING",
                "is_ready": file_count > 0
            }
        except Exception as e:
            logger.error(f"Get RAG status error: {e}")
            return None
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    # ============= SIMPLE HELPER METHODS FOR BUSINESS LOGIC =============
    

    async def get_library_files(self, brand_id: str, limit: int = 10, offset: int = 0) -> List[Dict]:
        """Get library files - returns raw dicts for wrapping in DTO"""
        db_client = get_db_client()
        conn = db_client.get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            query = """
                SELECT id, file_name, file_type, category, file_size, created_at
                FROM content_library_item
                WHERE brand_id = %s AND is_deleted = FALSE
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, (brand_id, limit, offset))
            rows = cursor.fetchall()
            
            return [
                {
                    "id": row[0],
                    "filename": row[1],
                    "file_type": row[2],
                    "category": row[3],
                    "size": row[4],
                    "uploadedAt": row[5].isoformat() if row[5] else None
                }
                for row in rows
            ]
        except Exception as e:
            logger.error(f"Get library files error: {e}")
            return []
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    async def count_library_files(self, brand_id: str) -> int:
        """Count library files for brand"""
        db_client = get_db_client()
        conn = db_client.get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM content_library_item WHERE brand_id = %s AND is_deleted = FALSE", (brand_id,))
            result = cursor.fetchone()
            return result[0] if result else 0
        except Exception as e:
            logger.error(f"Count library files error: {e}")
            return 0
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    def get_rag_status_sync(self, brand_id: str) -> Optional[Dict[str, Any]]:
        """Get RAG status - synchronous version to avoid naming conflict with async method"""
        db_client = get_db_client()
        conn = db_client.get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT id, total_files, indexed_chunks, total_embeddings, 
                       status, error_message, last_updated, created_at
                FROM rag_index
                WHERE brand_id = %s
            """
            
            cursor.execute(query, (brand_id,))
            row = cursor.fetchone()
            
            if not row:
                logger.info(f"No RAG index found for brand: {brand_id}")
                return None
            
            return {
                "index_id": row[0],
                "total_files": row[1],
                "indexed_chunks": row[2],
                "total_embeddings": row[3],
                "status": row[4],
                "error_message": row[5],
                "last_updated": row[6].isoformat() if row[6] else None,
                "created_at": row[7].isoformat() if row[7] else None
            }
        
        except Exception as e:
            logger.error(f"Get RAG status error: {e}")
            return None
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    def delete_library_file_sync(self, brand_id: str, library_id: str) -> bool:
        """Delete library file - synchronous version"""
        db_client = get_db_client()
        conn = db_client.get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            query = "UPDATE content_library_item SET is_deleted = TRUE WHERE id = %s AND brand_id = %s"
            cursor.execute(query, (library_id, brand_id))
            
            if cursor.rowcount == 0:
                logger.warning(f"Library item not found: {library_id}")
                return False
            
            conn.commit()
            logger.info(f"✓ Deleted library item: {library_id}")
            return True
        
        except Exception as e:
            logger.error(f"Delete error: {e}")
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            return False
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    async def generate_content_with_rag(self, request, ai_service):
        """Generate content with RAG augmentation"""
        from app.models.rag_models import RagGenerateContentResponse
        from app.prompts import format_rag_generation_prompt
        
        try:
            logger.info(f"Generate content with RAG | Brand: {request.brand_id}")
            
            # Search RAG
            rag_query = request.rag_query or request.prompt
            rag_results = await self.search_similar_chunks(
                brand_id=request.brand_id,
                query_text=rag_query,
                limit=request.rag_limit,
                threshold=request.rag_threshold
            )
            
            # Augment prompt with context
            augmented_prompt = request.prompt
            if rag_results:
                context_text = "\n\n".join([
                    f"[Source: {r.get('chunk_id', 'N/A')} | Relevance: {r.get('similarity', 0):.1%}]\n{r.get('text', '')}"
                    for r in rag_results
                ])
                augmented_prompt = format_rag_generation_prompt(
                    prompt=request.prompt,
                    context=context_text
                )
            
            # Generate content
            generation_result = await ai_service.generate_content(
                prompt=augmented_prompt,
                provider=request.provider,
                model=request.model
            )
            
            # Handle both dict and Pydantic responses
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
                logger.error(f"Generation failed: {result_error}")
                return RagGenerateContentResponse(
                    success=False,
                    content=None,
                    rag_context=rag_results,
                    rag_query_used=rag_query,
                    rag_results_count=len(rag_results),
                    error=result_error
                )
            
            logger.info("✓ Generate content with RAG complete")
            
            return RagGenerateContentResponse(
                success=True,
                content=result_content,
                rag_context=rag_results,
                rag_query_used=rag_query,
                rag_results_count=len(rag_results),
                tokens_used=result_tokens,
                ai_model=result_model
            )
        
        except Exception as e:
            logger.error(f"Generate content error: {e}")
            return RagGenerateContentResponse(
                success=False,
                content=None,
                rag_context=[],
                rag_query_used="",
                rag_results_count=0,
                error=f"Server error: {str(e)}"
            )
    
    async def generate_content_with_rag_and_images(self, request, ai_service):
        """Generate content with RAG and image references"""
        return await self.generate_content_with_rag(request, ai_service)
    
    async def upload_file(
        self,
        brand_id: str,
        file_content: bytes,
        file_name: str,
        category: Optional[str],
        library_service,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ):
        """
        Complete file upload workflow.
        Returns RagUploadResponse DTO.
        Supports embedding model selection via provider and model parameters.
        """
        from app.models.rag_models import RagUploadResponse
        
        try:
            logger.info(f"Upload file workflow | Brand: {brand_id} | File: {file_name}")
            
            # Step 1: Save file to storage
            success, file_path, error = library_service.save_uploaded_file(
                file_content=file_content,
                file_name=file_name,
                brand_id=brand_id
            )
            
            if not success:
                return RagUploadResponse(
                    success=False,
                    file_name=file_name,
                    file_type="unknown",
                    error=f"File save failed: {error}"
                )
            
            # Step 2: Extract text from file
            file_type = library_service.get_file_type(file_name)
            success, extracted_text, error = library_service.extract_text_from_file(
                file_path=file_path,
                file_type=file_type
            )
            
            if not success:
                return RagUploadResponse(
                    success=False,
                    file_name=file_name,
                    file_type=file_type,
                    error=f"Text extraction failed: {error}"
                )
            
            # Step 3: Save to database
            auto_category = library_service.get_category_from_filename(file_name)
            final_category = category or auto_category
            
            library_id = self.save_library_item(
                brand_id=brand_id,
                file_name=file_name,
                file_type=file_type,
                category=final_category,
                extracted_text=extracted_text,
                storage_url=file_path,
                file_size=len(file_content),
                metadata={"upload_timestamp": datetime.now().isoformat()}
            )
            
            if not library_id:
                return RagUploadResponse(
                    success=False,
                    file_name=file_name,
                    file_type=file_type,
                    error="Failed to save library item"
                )
            
            # Step 4: Generate embeddings
            total_chunks, saved_embeddings = await self.generate_embeddings_for_file(
                brand_id=brand_id,
                library_item_id=library_id,
                extracted_text=extracted_text,
                model=model,
                provider=provider
            )
            
            logger.info(f"✓ Upload workflow complete | Library: {library_id} | Chunks: {total_chunks} | Embeddings: {saved_embeddings}")
            
            return RagUploadResponse(
                success=True,
                library_id=library_id,
                file_name=file_name,
                file_type=file_type,
                category=final_category,
                extracted_chars=len(extracted_text),
                text_preview=extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
                total_chunks=total_chunks,
                embeddings_saved=saved_embeddings
            )
        
        except Exception as e:
            logger.error(f"Upload workflow error: {e}")
            return RagUploadResponse(
                success=False,
                file_name=file_name,
                file_type="unknown",
                error=f"Server error: {str(e)}"
            )
    
    async def list_library_files(
        self,
        brand_id: str,
        limit: int = 10,
        offset: int = 0
    ):
        """
        List all library files for brand.
        Returns RagLibraryResponse DTO.
        """
        from app.models.rag_models import RagLibraryResponse
        
        try:
            db_client = get_db_client()
            conn = db_client.get_connection()
            cursor = None
            
            cursor = conn.cursor()
            
            # Get total count
            cursor.execute("SELECT COUNT(*) FROM content_library_item WHERE brand_id = %s AND is_deleted = FALSE", (brand_id,))
            total_files = cursor.fetchone()[0]
            
            # Get paginated results
            query = """
                SELECT id, file_name, file_type, category, file_size, created_at
                FROM content_library_item
                WHERE brand_id = %s AND is_deleted = FALSE
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, (brand_id, limit, offset))
            rows = cursor.fetchall()
            
            files = [
                {
                    "id": row[0],
                    "file_name": row[1],
                    "file_type": row[2],
                    "category": row[3],
                    "file_size": row[4],
                    "created_at": row[5].isoformat() if row[5] else None
                }
                for row in rows
            ]
            
            return RagLibraryResponse(
                success=True,
                brand_id=brand_id,
                files=files,
                total_files=total_files
            )
        
        except Exception as e:
            logger.error(f"List library error: {e}")
            return RagLibraryResponse(
                success=False,
                brand_id=brand_id,
                files=[],
                total_files=0,
                error=f"Server error: {str(e)}"
            )
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    async def get_rag_status(self, brand_id: str):
        """
        Get RAG status for brand.
        Returns RagStatusResponse DTO.
        """
        from app.models.rag_models import RagStatusResponse
        
        try:
            status_data = self.get_rag_status(brand_id)
            
            return RagStatusResponse(
                success=True,
                brand_id=brand_id,
                status_data=status_data
            )
        
        except Exception as e:
            logger.error(f"Get status error: {e}")
            return RagStatusResponse(
                success=False,
                brand_id=brand_id,
                status_data=None,
                error=f"Server error: {str(e)}"
            )
    
    async def delete_library_file(self, brand_id: str, library_id: str):
        """
        Delete library file (soft delete).
        Returns RagDeleteResponse DTO.
        """
        from app.models.rag_models import RagDeleteResponse
        
        try:
            db_client = get_db_client()
            conn = db_client.get_connection()
            cursor = None
            
            cursor = conn.cursor()
            
            # Soft delete - set is_deleted flag
            query = "UPDATE content_library_item SET is_deleted = TRUE WHERE id = %s AND brand_id = %s"
            cursor.execute(query, (library_id, brand_id))
            
            if cursor.rowcount == 0:
                return RagDeleteResponse(
                    success=False,
                    message="",
                    error="Library item not found"
                )
            
            conn.commit()
            
            logger.info(f"✓ Deleted library item: {library_id}")
            
            return RagDeleteResponse(
                success=True,
                message=f"Deleted library item {library_id}"
            )
        
        except Exception as e:
            logger.error(f"Delete error: {e}")
            return RagDeleteResponse(
                success=False,
                message="",
                error=f"Server error: {str(e)}"
            )
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    async def generate_content_with_rag(self, request, ai_service):
        """
        Generate content with RAG augmentation.
        Returns RagGenerateContentResponse DTO.
        """
        from app.models.rag_models import RagGenerateContentResponse
        from app.prompts import format_rag_generation_prompt
        
        try:
            logger.info(f"Generate content with RAG | Brand: {request.brand_id}")
            
            # Search RAG
            rag_query = request.rag_query or request.prompt
            rag_results = await self.search_similar_chunks(
                brand_id=request.brand_id,
                query_text=rag_query,
                limit=request.rag_limit,
                threshold=request.rag_threshold
            )
            
            # Augment prompt with context
            augmented_prompt = request.prompt
            if rag_results:
                context_text = "\n\n".join([
                    f"[Source: {r.get('chunk_id', 'N/A')} | Relevance: {r.get('similarity', 0):.1%}]\n{r.get('text', '')}"
                    for r in rag_results
                ])
                augmented_prompt = format_rag_generation_prompt(
                    prompt=request.prompt,
                    context=context_text
                )
            
            # Generate content
            generation_result = await ai_service.generate_content(
                prompt=augmented_prompt,
                provider=request.provider,
                model=request.model
            )
            
            # Handle both dict and Pydantic responses
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
                logger.error(f"Generation failed: {result_error}")
                return RagGenerateContentResponse(
                    success=False,
                    content=None,
                    rag_context=rag_results,
                    rag_query_used=rag_query,
                    rag_results_count=len(rag_results),
                    error=result_error
                )
            
            logger.info("✓ Generate content with RAG complete")
            
            return RagGenerateContentResponse(
                success=True,
                content=result_content,
                rag_context=rag_results,
                rag_query_used=rag_query,
                rag_results_count=len(rag_results),
                tokens_used=result_tokens,
                ai_model=result_model
            )
        
        except Exception as e:
            logger.error(f"Generate content error: {e}")
            return RagGenerateContentResponse(
                success=False,
                content=None,
                rag_context=[],
                rag_query_used="",
                rag_results_count=0,
                error=f"Server error: {str(e)}"
            )
    
    async def generate_content_with_rag_and_images(self, request, ai_service):
        """
        Generate content with RAG augmentation and image references.
        Same as generate_content_with_rag for now.
        """
        return await self.generate_content_with_rag(request, ai_service)

    async def get_library_file_content(self, brand_id: str, library_id: str) -> Optional[str]:
        """Get the extracted text content of a library file"""
        db_client = get_db_client()
        conn = db_client.get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            query = "SELECT extracted_text FROM content_library_item WHERE id = %s AND brand_id = %s AND is_deleted = FALSE"
            cursor.execute(query, (library_id, brand_id))
            row = cursor.fetchone()
            return row[0] if row else None
        except Exception as e:
            logger.error(f"Get library content error: {e}")
            return None
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if conn:
                try: conn.close()
                except: pass

    async def update_library_file_content(self, brand_id: str, library_id: str, new_text: str, provider: Optional[str] = None, model: Optional[str] = None) -> bool:
        """Update the extracted text of a library file and re-embed it"""
        db_client = get_db_client()
        conn = db_client.get_connection()
        cursor = None
        try:
            cursor = conn.cursor()
            
            # 1. Update text in DB
            query = "UPDATE content_library_item SET extracted_text = %s, updated_at = NOW() WHERE id = %s AND brand_id = %s AND is_deleted = FALSE"
            cursor.execute(query, (new_text, library_id, brand_id))
            if cursor.rowcount == 0:
                logger.warning(f"Library item not found for update: {library_id}")
                return False
                
            # 2. Delete old embeddings
            del_query = "DELETE FROM rag_embedding WHERE library_item_id = %s AND brand_id = %s"
            cursor.execute(del_query, (library_id, brand_id))
            conn.commit()
            
            # 3. Re-generate embeddings
            total_chunks, saved = await self.generate_embeddings_for_file(
                brand_id=brand_id,
                library_item_id=library_id,
                extracted_text=new_text,
                model=model,
                provider=provider
            )
            logger.info(f"Updated content and re-embedded: {saved}/{total_chunks} chunks saved")
            return True
            
        except Exception as e:
            logger.error(f"Update library content error: {e}")
            if conn:
                try: conn.rollback()
                except: pass
            return False
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if conn:
                try: conn.close()
                except: pass
