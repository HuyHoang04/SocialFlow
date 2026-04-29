-- Combined Migration: Chat History, AI Brainstorming, and RAG Improvements
-- This covers the full setup for AI-driven campaign generation and conversational memory.

-- 1. Table: Chat Sessions (Groups messages into conversations)
CREATE TABLE IF NOT EXISTS chat_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    brand_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 2. Table: Chat Messages (Stores the actual messages in a session)
CREATE TABLE IF NOT EXISTS chat_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    session_id UUID NOT NULL REFERENCES chat_session (id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (
        role IN ('user', 'assistant', 'system')
    ),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- 3. Improvements to RAG Embeddings (Tracking models and providers)
ALTER TABLE rag_embedding
ADD COLUMN IF NOT EXISTS model VARCHAR(255),
ADD COLUMN IF NOT EXISTS provider VARCHAR(255);

-- 4. Improvements to Social Posts (Allowing AI-generated drafts without immediate page assignment)
ALTER TABLE social_posts ALTER COLUMN page_id DROP NOT NULL;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_session_user ON chat_session (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_session_brand ON chat_session (brand_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_session ON chat_message (session_id);

CREATE INDEX IF NOT EXISTS idx_rag_embedding_model ON rag_embedding (model);

-- 6. Table: AI Model Config (Centralized management for AI models per brand)
CREATE TABLE IF NOT EXISTS ai_model_config (
    brand_id UUID PRIMARY KEY,
    text_provider VARCHAR(50) DEFAULT 'openrouter',
    text_model VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',
    image_provider VARCHAR(50) DEFAULT 'pixazo',
    image_model VARCHAR(100) DEFAULT 'pixazo-sdxl',
    embedding_provider VARCHAR(50) DEFAULT 'openrouter',
    embedding_model VARCHAR(100) DEFAULT 'nvidia/llama-nemotron-embed-vl-1b-v2:free',
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_model_config_brand ON ai_model_config (brand_id);