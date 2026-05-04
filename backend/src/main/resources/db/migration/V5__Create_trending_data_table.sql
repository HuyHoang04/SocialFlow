-- Create trending_data table - stores raw API response as JSONB (Google, Facebook, etc)
CREATE TABLE IF NOT EXISTS trending_data (
    id BIGSERIAL PRIMARY KEY,
    brand_id UUID NOT NULL,                         -- Foreign key to brand
    geo VARCHAR(10) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'google',  -- 'google', 'facebook', 'twitter', etc
    category_id VARCHAR(50),                        -- For Google Trends (null for Facebook)
    search_keyword VARCHAR(255),                    -- For Facebook posts (null for Google)
    trending_searches JSONB NOT NULL,               -- Full array of items (trends or posts)
    fetched_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, geo, source, category_id, search_keyword, fetched_at)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trending_brand_id ON trending_data(brand_id);
CREATE INDEX IF NOT EXISTS idx_trending_brand_geo_source ON trending_data(brand_id, geo, source);
CREATE INDEX IF NOT EXISTS idx_trending_brand_geo_category ON trending_data(brand_id, geo, source, category_id);
CREATE INDEX IF NOT EXISTS idx_trending_brand_geo_keyword ON trending_data(brand_id, geo, source, search_keyword);
CREATE INDEX IF NOT EXISTS idx_trending_fetched_at ON trending_data(fetched_at);

-- Create trending_config table - centralized config for all trending sources
-- Stores user preferences: which category for Google Trends, which keyword for Facebook, etc
CREATE TABLE IF NOT EXISTS trending_config (
    id BIGSERIAL PRIMARY KEY,
    brand_id UUID NOT NULL,                         -- Foreign key to brand
    geo VARCHAR(10) NOT NULL,
    source VARCHAR(50) NOT NULL,                    -- 'google', 'facebook', 'twitter', etc
    category_id VARCHAR(50),                        -- For Google Trends (null for other sources)
    search_keyword VARCHAR(255),                    -- For Facebook posts (user-defined keyword)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, geo, source)
);

-- Create indexes for trending_config
CREATE INDEX IF NOT EXISTS idx_trending_config_brand_id ON trending_config(brand_id);
CREATE INDEX IF NOT EXISTS idx_trending_config_brand_geo ON trending_config(brand_id, geo);
CREATE INDEX IF NOT EXISTS idx_trending_config_brand_geo_source ON trending_config(brand_id, geo, source);
CREATE INDEX IF NOT EXISTS idx_trending_config_source ON trending_config(source);
