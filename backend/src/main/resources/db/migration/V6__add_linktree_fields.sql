-- Migration: Create brand_linktree_profiles table (separate from brands)
-- This is a standalone public profile model — does NOT modify existing brands table

CREATE TABLE IF NOT EXISTS brand_linktree_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL UNIQUE,
    slug VARCHAR(100) UNIQUE,
    bio TEXT,
    bg_style VARCHAR(50) DEFAULT 'gradient-purple',
    bg_image_url TEXT,
    display_name VARCHAR(255),
    website_label VARCHAR(100),
    is_published BOOLEAN DEFAULT false,
    button_style VARCHAR(50) DEFAULT 'rounded',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT fk_linktree_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_linktree_slug ON brand_linktree_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_linktree_brand_id ON brand_linktree_profiles(brand_id);
