-- RAG Module - Content Library & Embeddings
-- Created for Phase 2: User-uploaded brand content learning

-- Table 1: Content Library Items (user-uploaded files)
CREATE TABLE IF NOT EXISTS content_library_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('IMAGE', 'PDF', 'TEXT', 'DOCUMENT', 'AUDIO')),
    category VARCHAR(50) CHECK (category IN ('BRAND_GUIDELINES', 'POST_TEMPLATES', 'CUSTOMER_FEEDBACK', 'FAQ', 'COMPETITOR_ANALYSIS', 'MEDIA_ASSETS', 'OTHER')),
    file_size BIGINT,
    storage_url VARCHAR(2048),
    extracted_text TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Table 2: RAG Embeddings (chunked content vectors)
-- Uses 2048-dim vectors (nvidia/llama-nemotron-embed-vl-1b-v2 multimodal embedding model)
CREATE TABLE IF NOT EXISTS rag_embedding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL,
    library_item_id UUID NOT NULL REFERENCES content_library_item(id) ON DELETE CASCADE,
    chunk_id INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(2048),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table 3: RAG Index Status (per-brand indexing metadata)
CREATE TABLE IF NOT EXISTS rag_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL UNIQUE,
    total_files INT DEFAULT 0,
    indexed_chunks INT DEFAULT 0,
    total_embeddings INT DEFAULT 0,
    last_updated TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'INDEXING', 'COMPLETE', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_library_brand_category ON content_library_item(brand_id, category);
CREATE INDEX IF NOT EXISTS idx_content_library_brand_created ON content_library_item(brand_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rag_embedding_brand ON rag_embedding(brand_id);
CREATE INDEX IF NOT EXISTS idx_rag_embedding_library_item ON rag_embedding(library_item_id);
CREATE INDEX IF NOT EXISTS idx_rag_index_brand_status ON rag_index(brand_id, status);

-- Note: ivfflat index cannot be used with 2048-dim vectors (max 2000 dims for ivfflat)
-- Cosine similarity search via pgvector <-> operator still works without index
