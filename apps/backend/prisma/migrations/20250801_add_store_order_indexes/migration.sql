-- CreateIndex
-- Add composite index for store order queries (critical for performance)
-- This index optimizes queries like: WHERE storeId = ? AND status = ? ORDER BY createdAt DESC
CREATE INDEX "idx_orders_store_status_created" ON "orders" ("storeId", "status", "createdAt" DESC);

-- Add index for store order statistics queries
-- This index optimizes queries like: WHERE storeId = ? AND status = ?
CREATE INDEX "idx_orders_store_status" ON "orders" ("storeId", "status");