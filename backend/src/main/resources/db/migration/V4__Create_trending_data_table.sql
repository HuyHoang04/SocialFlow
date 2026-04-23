-- Create trending_data table - stores raw SerpAPI response as JSONB
CREATE TABLE IF NOT EXISTS trending_data (
    id BIGSERIAL PRIMARY KEY,
    geo VARCHAR(10) NOT NULL,
    category_id VARCHAR(50),
    trending_searches JSONB NOT NULL,  -- Full array of trending searches
    fetched_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(geo, category_id, fetched_at)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trending_geo_category ON trending_data(geo, category_id);
CREATE INDEX IF NOT EXISTS idx_trending_fetched_at ON trending_data(fetched_at);
