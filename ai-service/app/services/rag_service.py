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
        Split text into overlapping chunks for embedding.
        Approximation: 1 token ≈ 4 characters
        """
        if not text:
            return []
        
        # Estimate tokens from characters (rough approximation)
        char_per_token = 4
        chunk_size_chars = chunk_size * char_per_token
        overlap_chars = overlap * char_per_token
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = min(start + chunk_size_chars, len(text))
            chunk = text[start:end].strip()
            
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = end - overlap_chars
            
            # Stop if we've reached the end or would only get tiny chunks
            if end >= len(text) or (len(text) - end) < 100:
                break
        
        return chunks
    
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
        model: str
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
                embedding_response = await self.embedding_service.embed(
                    brand_id=brand_id,
                    texts=chunks,  # Pass all chunks
                    model=model,
                    provider="openrouter"
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
                    embeddings=embeddings
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
        embeddings: List[List[float]]
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
                        json.dumps({"chunk_position": chunk_id, "word_count": len(chunk_text.split())})
                    ))
            
            if not embedding_records:
                logger.warning("No embedding records to insert")
                return 0
            
            logger.info(f"Inserting {len(embedding_records)} embedding records into rag_embedding table")
            
            insert_sql = """
                INSERT INTO rag_embedding 
                (id, brand_id, library_item_id, chunk_id, chunk_text, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s, %s::vector, %s)
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
        model: str = "nvidia/llama-nemotron-embed-vl-1b-v2"
    ) -> List[Dict[str, Any]]:
        """
        Search for similar content chunks using embedding similarity.
        Uses cosine similarity via pgvector.
        Note: threshold default is 0.3 because cosine distance for multimodal embeddings
        produces lower scores than typical text-only models.
        """
        try:
            if not query_text:
                logger.warning("Empty query text")
                return []
            
            # Get embedding for query
            query_response = await self.embedding_service.embed(
                brand_id=brand_id,
                texts=[query_text],
                model=model,
                provider="openrouter"
            )
            
            if not query_response.get("success"):
                logger.error(f"Query embedding failed: {query_response.get('error')}")
                return []
            
            query_embeddings = query_response.get("embeddings", [])
            if not query_embeddings:
                logger.warning("No embeddings returned for query")
                return []
            
            query_vector = query_embeddings[0]
            logger.info(f"🔍 Query vector: {len(query_vector)} dimensions, first 5 values: {query_vector[:5]}")
            
            # Convert to pgvector format
            vector_str = '[' + ', '.join(str(v) for v in query_vector) + ']'
            logger.debug(f"Vector string length: {len(vector_str)} chars")
            
            db_client = get_db_client()
            conn = db_client.get_connection()
            cursor = None
            try:
                cursor = conn.cursor()
                
                # First, check how many embeddings exist for this brand
                check_sql = "SELECT COUNT(*) FROM rag_embedding WHERE brand_id = %s"
                cursor.execute(check_sql, (brand_id,))
                count_result = cursor.fetchone()
                embedding_count = count_result[0] if count_result else 0
                logger.info(f"📊 Total embeddings in database for brand {brand_id}: {embedding_count}")
                
                # DEBUG: Get top results regardless of threshold to see actual similarity scores
                debug_sql = """
                    SELECT 
                        chunk_id,
                        chunk_text,
                        (1 - (embedding <-> %s::vector) / 2) AS similarity
                    FROM rag_embedding
                    WHERE brand_id = %s
                    ORDER BY similarity DESC
                    LIMIT 10
                """
                logger.info(f"🔍 DEBUG: Checking top 10 similarity scores (no threshold filter)...")
                cursor.execute(debug_sql, (vector_str, brand_id))
                debug_rows = cursor.fetchall()
                if debug_rows:
                    for i, debug_row in enumerate(debug_rows):
                        logger.info(f"  [{i+1}] chunk_id={debug_row[0]}, text={debug_row[1][:50]}..., similarity={debug_row[2]:.4f}")
                else:
                    logger.warning(f"  No results even without threshold!")
                
                # Search using cosine similarity
                search_sql = """
                    SELECT 
                        id,
                        library_item_id,
                        chunk_id,
                        chunk_text,
                        (1 - (embedding <-> %s::vector) / 2) AS similarity,
                        metadata,
                        created_at
                    FROM rag_embedding
                    WHERE brand_id = %s
                    AND (1 - (embedding <-> %s::vector) / 2) >= %s
                    ORDER BY similarity DESC
                    LIMIT %s
                """
                
                logger.info(f"🔎 Executing search: threshold={threshold}, limit={limit}, brand={brand_id}")
                cursor.execute(search_sql, (vector_str, brand_id, vector_str, threshold, limit))
                rows = cursor.fetchall()
                logger.info(f"✓ Database returned {len(rows)} rows with threshold={threshold}")
                if len(rows) == 0 and embedding_count > 0:
                    logger.warning(f"⚠️  WARNING: Found {embedding_count} embeddings but 0 rows above threshold {threshold}!")
                    logger.warning(f"    Consider lowering threshold or checking vector dimensions")

                
                results = []
                for row in rows:
                    results.append({
                        "embedding_id": row[0],
                        "library_item_id": row[1],
                        "chunk_id": row[2],
                        "text": row[3],
                        "similarity": float(row[4]),
                        "metadata": row[5] if row[5] else {},
                        "created_at": row[6].isoformat() if row[6] else None
                    })
                
                logger.info(f"Found {len(results)} similar chunks for brand: {brand_id}")
                return results
            
            except Exception as e:
                logger.error(f"❌ Search query error: {e}", exc_info=True)
                logger.error(f"  Exception type: {type(e).__name__}")
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
        
        except Exception as e:
            logger.error(f"RAG search error: {e}")
            return []
    
    def get_rag_status(self, brand_id: str) -> Optional[Dict[str, Any]]:
        """Get RAG index status for a brand"""
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
    
    # ============= SIMPLE HELPER METHODS FOR BUSINESS LOGIC =============
    
    async def upload_file(
        self,
        brand_id: str,
        file_content: bytes,
        file_name: str,
        category: Optional[str],
        library_service
    ):
        """Complete file upload workflow"""
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
                model="auto"
            )
            
            logger.info(f"✓ Upload complete | Library: {library_id} | Chunks: {total_chunks}")
            
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
            logger.error(f"Upload error: {e}")
            return RagUploadResponse(
                success=False,
                file_name=file_name,
                file_type="unknown",
                error=f"Server error: {str(e)}"
            )
    
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
                WHERE brand_id = %s AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, (brand_id, limit, offset))
            rows = cursor.fetchall()
            
            return [
                {
                    "library_id": row[0],
                    "file_name": row[1],
                    "file_type": row[2],
                    "category": row[3],
                    "file_size": row[4],
                    "created_at": row[5].isoformat() if row[5] else None
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
            cursor.execute("SELECT COUNT(*) FROM content_library_item WHERE brand_id = %s AND deleted_at IS NULL", (brand_id,))
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
            query = "UPDATE content_library_item SET deleted_at = NOW() WHERE id = %s AND brand_id = %s"
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
        library_service
    ):
        """
        Complete file upload workflow.
        Returns RagUploadResponse DTO.
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
                metadata={"uplo_timestamp": datetime.now().isoformat()}
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
                model="auto"
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
            cursor.execute("SELECT COUNT(*) FROM content_library_item WHERE brand_id = %s", (brand_id,))
            total_files = cursor.fetchone()[0]
            
            # Get paginated results
            query = """
                SELECT id, file_name, file_type, category, file_size, created_at
                FROM content_library_item
                WHERE brand_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, (brand_id, limit, offset))
            rows = cursor.fetchall()
            
            files = [
                {
                    "library_id": row[0],
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
            
            # Soft delete - set deleted_at timestamp
            query = "UPDATE content_library_item SET deleted_at = NOW() WHERE id = %s AND brand_id = %s"
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
