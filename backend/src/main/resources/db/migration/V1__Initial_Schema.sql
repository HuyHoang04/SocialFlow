-- V1: Complete Initial Schema for SocialFlow (Unified Migration)

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Support for AI Embeddings

-- 1. Core Platform Tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    profile_pic VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE social_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    UNIQUE(platform, platform_user_id, brand_id)
);

CREATE TABLE social_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_page_id VARCHAR(255) NOT NULL,
    page_name VARCHAR(255) NOT NULL,
    page_image_url VARCHAR(255),
    page_access_token TEXT,
    platform VARCHAR(50) NOT NULL,
    connection_id UUID NOT NULL REFERENCES social_connections(id) ON DELETE CASCADE
);

-- 2. Content & Inbox Tables
CREATE TABLE social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    scheduled_at TIMESTAMP,
    published_at TIMESTAMP,
    platform VARCHAR(50),
    page_id UUID REFERENCES social_pages(id) ON DELETE CASCADE, -- Optional for drafts
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inbox_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_message_id VARCHAR(255) NOT NULL,
    platform_post_id VARCHAR(255),
    parent_message_id VARCHAR(255),
    content TEXT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_profile_pic VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_from_me BOOLEAN NOT NULL DEFAULT FALSE,
    message_type VARCHAR(50) DEFAULT 'COMMENT',
    conversation_id VARCHAR(255),
    author_id VARCHAR(255),
    like_count INTEGER DEFAULT 0,
    page_id UUID NOT NULL REFERENCES social_pages(id) ON DELETE CASCADE,
    UNIQUE(platform_message_id, page_id)
);

-- 3. AI & RAG Module Tables
CREATE TABLE content_library_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    file_size BIGINT,
    storage_url VARCHAR(2048),
    extracted_text TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE rag_embedding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    library_item_id UUID NOT NULL REFERENCES content_library_item(id) ON DELETE CASCADE,
    chunk_id INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(2048),
    model VARCHAR(255),
    provider VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    model VARCHAR(255),
    provider VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_model_config (
    brand_id UUID PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
    text_provider VARCHAR(50) DEFAULT 'openrouter',
    text_model VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',
    image_provider VARCHAR(50) DEFAULT 'pixazo',
    image_model VARCHAR(100) DEFAULT 'pixazo-sdxl',
    embedding_provider VARCHAR(50) DEFAULT 'openrouter',
    embedding_model VARCHAR(100) DEFAULT 'nvidia/llama-nemotron-embed-vl-1b-v2:free',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Chat & Conversation Memory
CREATE TABLE chat_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE chat_message (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_session(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- 5. Trending Data Tables
CREATE TABLE trending_data (
    id BIGSERIAL PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    geo VARCHAR(10) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'google',
    category_id VARCHAR(50),
    search_keyword VARCHAR(255),
    trending_searches JSONB NOT NULL,
    fetched_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, geo, source, category_id, search_keyword, fetched_at)
);

CREATE TABLE trending_config (
    id BIGSERIAL PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    geo VARCHAR(10) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category_id VARCHAR(50),
    search_keyword VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, geo, source)
);

-- 6. Indexes for Performance
CREATE INDEX idx_inbox_messages_page ON inbox_messages(page_id);
CREATE INDEX idx_rag_embedding_brand ON rag_embedding(brand_id);
CREATE INDEX idx_chat_message_session ON chat_message(session_id);
CREATE INDEX idx_trending_data_brand ON trending_data(brand_id);
CREATE INDEX idx_social_posts_brand ON social_posts(brand_id);
