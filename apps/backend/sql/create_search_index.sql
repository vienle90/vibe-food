-- Create search index for full-text search on store names and descriptions
-- This index improves performance for ILIKE queries on name and description fields

-- Enable pg_trgm extension for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for efficient text search across name and description
CREATE INDEX IF NOT EXISTS idx_stores_search_gin ON stores USING gin ((name || ' ' || COALESCE(description, '')) gin_trgm_ops);

-- Create additional performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_stores_name_active ON stores(name, "isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_stores_created_at ON stores("createdAt" DESC);