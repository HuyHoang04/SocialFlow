-- Enable pgvector extension (run once on Neon)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL,
    text TEXT NOT NULL,
    embedding vector(2048),
    model VARCHAR(255),
    provider VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_brand_id ON embeddings(brand_id);
CREATE INDEX IF NOT EXISTS idx_model ON embeddings(model);
CREATE INDEX IF NOT EXISTS idx_provider ON embeddings(provider);
CREATE INDEX IF NOT EXISTS idx_created_at ON embeddings(created_at);

-- Create vector index for similarity search (optional, for large datasets)
-- CREATE INDEX IF NOT EXISTS idx_embedding on embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
