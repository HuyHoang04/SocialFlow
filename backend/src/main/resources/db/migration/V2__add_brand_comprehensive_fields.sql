-- Migration: Add comprehensive brand fields
-- This migration adds new fields to the brands table for a complete brand profile

ALTER TABLE brands ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_slogan VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_brands_industry ON brands(industry);
CREATE INDEX IF NOT EXISTS idx_brands_country ON brands(country);
