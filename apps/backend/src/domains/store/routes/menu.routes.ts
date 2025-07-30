import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller';
import { createAuthMiddleware } from '../../auth/middleware/auth.middleware';
import { validateBody } from '../../../middleware/validation.middleware';
import { verifyStoreOwnership, verifyMenuItemOwnership, verifyStoreOwnerRole } from '../middleware/ownership.middleware';
import { uploadSingleImage, handleUploadError, validateImageDimensions } from '../../../middleware/upload.middleware';
import { invalidateMenuCache } from '../../../middleware/cache.middleware';
import { 
  createMenuItemRequestSchema, 
  updateMenuItemRequestSchema,
} from '@vibe/shared';
import { env } from '@vibe/shared';
import type { JWTConfig } from '../../auth/types/auth.types';

const router = Router();
const menuController = new MenuController();

// Create JWT configuration and auth middleware
const jwtConfig: JWTConfig = {
  accessSecret: env.JWT_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpiresIn: env.JWT_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  issuer: 'vibe-food-api',
  audience: 'vibe-food-app',
};

const authMiddleware = createAuthMiddleware(jwtConfig);

/**
 * POST /api/stores/:storeId/menu
 * Create a new menu item (store owners only)
 * 
 * Middleware chain:
 * 1. authenticate - Verify JWT token
 * 2. verifyStoreOwnerRole - Ensure user has STORE_OWNER or ADMIN role
 * 3. verifyStoreOwnership - Verify user owns the store
 * 4. validateBody - Validate menu item data
 * 5. menuController.createMenuItem - Create the menu item
 */
router.post(
  '/:storeId/menu',
  authMiddleware.authenticate,
  verifyStoreOwnerRole,
  verifyStoreOwnership,
  validateBody(createMenuItemRequestSchema.omit({ storeId: true })),
  invalidateMenuCache,
  menuController.createMenuItem
);

/**
 * PUT /api/menu-items/:itemId
 * Update a menu item (store owners only)
 * 
 * Middleware chain:
 * 1. authenticate - Verify JWT token
 * 2. verifyStoreOwnerRole - Ensure user has STORE_OWNER or ADMIN role
 * 3. verifyMenuItemOwnership - Verify user owns the store that owns the menu item
 * 4. validateBody - Validate update data
 * 5. menuController.updateMenuItem - Update the menu item
 */
router.put(
  '/menu-items/:itemId',
  authMiddleware.authenticate,
  verifyStoreOwnerRole,
  verifyMenuItemOwnership,
  validateBody(updateMenuItemRequestSchema),
  invalidateMenuCache,
  menuController.updateMenuItem
);

/**
 * DELETE /api/menu-items/:itemId
 * Delete a menu item (store owners only)
 * 
 * Middleware chain:
 * 1. authenticate - Verify JWT token
 * 2. verifyStoreOwnerRole - Ensure user has STORE_OWNER or ADMIN role
 * 3. verifyMenuItemOwnership - Verify user owns the store that owns the menu item
 * 4. menuController.deleteMenuItem - Delete the menu item (soft delete if has orders)
 */
router.delete(
  '/menu-items/:itemId',
  authMiddleware.authenticate,
  verifyStoreOwnerRole,
  verifyMenuItemOwnership,
  invalidateMenuCache,
  menuController.deleteMenuItem
);

/**
 * POST /api/menu-items/:itemId/image
 * Upload image for a menu item (store owners only)
 * 
 * Middleware chain:
 * 1. authenticate - Verify JWT token
 * 2. verifyStoreOwnerRole - Ensure user has STORE_OWNER or ADMIN role
 * 3. verifyMenuItemOwnership - Verify user owns the store that owns the menu item
 * 4. uploadSingleImage - Handle multipart file upload with validation
 * 5. handleUploadError - Handle upload errors
 * 6. validateImageDimensions - Validate image dimensions (optional)
 * 7. menuController.uploadMenuItemImage - Process the uploaded image
 */
router.post(
  '/menu-items/:itemId/image',
  authMiddleware.authenticate,
  verifyStoreOwnerRole,
  verifyMenuItemOwnership,
  uploadSingleImage,
  handleUploadError,
  validateImageDimensions,
  invalidateMenuCache,
  menuController.uploadMenuItemImage
);

export default router;