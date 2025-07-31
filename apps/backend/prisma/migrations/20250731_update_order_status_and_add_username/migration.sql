-- Update OrderStatus enum to match PRP requirements
-- First add the new enum values
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PREPARING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PICKED_UP';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

-- Update StoreCategory enum to use uppercase values
ALTER TYPE "StoreCategory" RENAME VALUE 'lunch' TO 'LUNCH';
ALTER TYPE "StoreCategory" RENAME VALUE 'dinner' TO 'DINNER';
ALTER TYPE "StoreCategory" RENAME VALUE 'coffee' TO 'COFFEE';
ALTER TYPE "StoreCategory" RENAME VALUE 'tea' TO 'TEA';
ALTER TYPE "StoreCategory" RENAME VALUE 'dessert' TO 'DESSERT';

-- Add missing StoreCategory values
ALTER TYPE "StoreCategory" ADD VALUE IF NOT EXISTS 'FAST_FOOD';

-- Add username field to users table
ALTER TABLE "users" ADD COLUMN "username" VARCHAR(20);

-- Add unique constraint for username
ALTER TABLE "users" ADD CONSTRAINT "users_username_key" UNIQUE ("username");

-- Add temporary usernames for existing users (will be updated by seed script)
UPDATE "users" SET "username" = CONCAT('user_', id) WHERE "username" IS NULL;

-- Make username NOT NULL after setting values
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- Add indexes for username
CREATE INDEX "users_username_idx" ON "users"("username");

-- Update existing orders to use new status values if needed
-- Since database is fresh from reset, this won't affect existing data

-- Add totalOrders field to stores table if it doesn't exist
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "totalOrders" INTEGER NOT NULL DEFAULT 0;