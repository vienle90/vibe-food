-- Add performance indexes for menu item queries as specified in PRP-005

-- Composite index for menu item availability filtering
-- Used in findByStoreId queries when filtering by availability
CREATE INDEX CONCURRENTLY "idx_menu_items_store_available" ON "menu_items" ("storeId", "isAvailable");

-- Composite index for ordered menu queries by store, category, and name
-- Used for consistent menu ordering and category filtering
CREATE INDEX CONCURRENTLY "idx_menu_items_store_category_name" ON "menu_items" ("storeId", "category", "name");

-- Index on updated_at for cache invalidation queries
-- Used to determine when menu data has changed
CREATE INDEX CONCURRENTLY "idx_menu_items_updated_at" ON "menu_items" ("updatedAt");

-- Composite index for store ownership verification queries
-- Used in ownership middleware for efficient authorization checks
CREATE INDEX CONCURRENTLY "idx_stores_owner_active" ON "stores" ("ownerId", "isActive");

-- Index for order item references (used in soft delete logic)
-- Used to check if menu items have existing order references
CREATE INDEX CONCURRENTLY "idx_order_items_menu_item" ON "order_items" ("menuItemId");

-- Add constraint to ensure menu item names are unique per store
-- This prevents duplicate menu items within the same store
ALTER TABLE "menu_items" ADD CONSTRAINT "unique_menu_item_per_store" UNIQUE ("storeId", "name");