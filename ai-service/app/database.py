# PostgreSQL database connection and operations
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional
from app.config import DB_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from app.utils.logger import setup_logger
import json
from datetime import datetime
import uuid

logger = setup_logger(__name__)

class DatabaseClient:
    """PostgreSQL client for embedding storage"""
    
    def __init__(self):
        self.db_url = DB_URL
        self.conn = None
    
    def get_connection(self):
        """Get a fresh database connection (don't reuse singleton)"""
        try:
            if getattr(self, 'db_url', None):
                conn = psycopg2.connect(self.db_url)
            else:
                conn = psycopg2.connect(
                    host=DB_HOST,
                    port=DB_PORT,
                    database=DB_NAME,
                    user=DB_USER,
                    password=DB_PASSWORD
                )
            logger.debug(f"Created fresh connection to PostgreSQL")
            return conn
        except Exception as e:
            logger.error(f"Failed to create connection: {e}")
            return None
    
    def is_connected(self) -> bool:
        """Check if connection is still active"""
        if not self.conn:
            return False
        try:
            # Simple query to test connection
            cursor = self.conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            return True
        except Exception:
            return False
    
    def ensure_connected(self) -> bool:
        """Ensure connection is active, reconnect if needed"""
        if not self.is_connected():
            logger.warning("Database connection lost, attempting to reconnect...")
            return self.connect()
        return True
    
    def connect(self) -> bool:
        """Establish PostgreSQL connection (kept as fallback for backward compatibility)"""
        try:
            if self.conn:
                try:
                    self.conn.close()
                except:
                    pass
            
            self.conn = self.get_connection()
            if self.conn:
                logger.info(f"Connected to PostgreSQL: {DB_HOST}:{DB_PORT}/{DB_NAME}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            self.conn = None
            return False
    
    def disconnect(self):
        """Close PostgreSQL connection"""
        if self.conn:
            self.conn.close()
            logger.info("Disconnected from PostgreSQL")
    
    def save_embeddings(self, brand_id: str, texts: List[str], embeddings: List[List[float]], 
                       model: str, provider: str) -> Optional[Dict[str, Any]]:
        """Save embeddings to PostgreSQL embedding table"""
        # Ensure connection is alive
        if not self.ensure_connected():
            logger.error("Failed to establish database connection")
            return None
        
        cursor = None
        try:
            cursor = self.conn.cursor()
            
            # Prepare data for bulk insert
            embedding_records = []
            for i, text in enumerate(texts):
                if i < len(embeddings):
                    embedding_id = str(uuid.uuid4())
                    embedding_vector = embeddings[i]
                    
                    # Convert list to pgvector format: '[1.0, 2.0, 3.0]'
                    vector_str = '[' + ', '.join(str(v) for v in embedding_vector) + ']'
                    
                    embedding_records.append((
                        embedding_id,
                        brand_id,
                        text,
                        vector_str,  # pgvector format string
                        model,
                        provider,
                        datetime.utcnow()
                    ))
            
            # SQL for insert (pgvector stores as array with explicit cast)
            insert_sql = """
                INSERT INTO embeddings (id, brand_id, text, embedding, model, provider, created_at)
                VALUES (%s, %s, %s, %s::vector, %s, %s, %s)
            """
            
            # Execute bulk insert
            cursor.executemany(insert_sql, embedding_records)
            self.conn.commit()
            
            logger.info(f"Saved {len(embedding_records)} embeddings to PostgreSQL | Brand: {brand_id} | Model: {model}")
            
            return {
                "success": True,
                "embeddings_saved": len(embedding_records),
                "brand_id": brand_id,
                "model": model
            }
        
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Failed to save embeddings to PostgreSQL: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if cursor:
                cursor.close()
    
    def get_embeddings_by_brand(self, brand_id: str, limit: int = 100) -> Optional[List[Dict[str, Any]]]:
        """Retrieve embeddings for a specific brand"""
        # Ensure connection is alive
        if not self.ensure_connected():
            logger.error("Failed to establish database connection")
            return None
        
        cursor = None
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT id, brand_id, text, embedding, model, provider, created_at
                FROM embeddings
                WHERE brand_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """
            
            cursor.execute(query, (brand_id, limit))
            results = cursor.fetchall()
            
            logger.info(f"Retrieved {len(results)} embeddings for brand: {brand_id}")
            
            return results
        
        except Exception as e:
            logger.error(f"Failed to retrieve embeddings from PostgreSQL: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def search_embeddings_by_similarity(self, brand_id: str, query_embedding: List[float], 
                                      limit: int = 10, threshold: float = 0.5) -> Optional[List[Dict[str, Any]]]:
        """Search embeddings using cosine similarity (requires pgvector extension)"""
        # Ensure connection is alive
        if not self.ensure_connected():
            logger.error("Failed to establish database connection")
            return None
        
        cursor = None
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            # Convert query embedding to pgvector format
            vector_str = f"[{','.join(map(str, query_embedding))}]"
            
            query = """
                SELECT id, brand_id, text, embedding, model, provider, created_at,
                       (embedding <-> %s::vector) AS distance,
                       (1 - (embedding <-> %s::vector) / 2) AS similarity
                FROM embeddings
                WHERE brand_id = %s
                AND (1 - (embedding <-> %s::vector) / 2) >= %s
                ORDER BY similarity DESC
                LIMIT %s
            """
            
            cursor.execute(query, (vector_str, vector_str, brand_id, vector_str, threshold, limit))
            results = cursor.fetchall()
            
            logger.info(f"Found {len(results)} similar embeddings for brand: {brand_id}")
            
            return results
        
        except Exception as e:
            logger.error(f"Failed to search embeddings: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def delete_embeddings_by_brand(self, brand_id: str) -> bool:
        """Delete all embeddings for a brand"""
        # Ensure connection is alive
        if not self.ensure_connected():
            logger.error("Failed to establish database connection")
            return False
        
        cursor = None
        try:
            cursor = self.conn.cursor()
            
            delete_sql = "DELETE FROM embeddings WHERE brand_id = %s"
            cursor.execute(delete_sql, (brand_id,))
            
            deleted_count = cursor.rowcount
            self.conn.commit()
            
            logger.info(f"Deleted {deleted_count} embeddings for brand: {brand_id}")
            return True
        
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Failed to delete embeddings: {e}")
            return False
        finally:
            if cursor:
                cursor.close()


# Global database client instance
_db_client: Optional[DatabaseClient] = None

def get_db_client() -> DatabaseClient:
    """Get or create database client"""
    global _db_client
    if _db_client is None:
        _db_client = DatabaseClient()
        _db_client.connect()
    return _db_client

def close_db_client():
    """Close database connection"""
    global _db_client
    if _db_client:
        _db_client.disconnect()
        _db_client = None
