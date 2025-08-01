
import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';
import { MenuController } from '../controllers/menu.controller';
import { validateQuery } from '../../../middleware/validation.middleware';
import { getStoresQuerySchema, env } from '@vibe/shared';
import { cacheStoreDetails, cacheMenu, cacheStoreList } from '../../../middleware/cache.middleware';
import { createAuthMiddleware } from '../../auth/middleware/index.js';
import type { JWTConfig } from '../../auth/types/auth.types.js';

const router = Router();
const storeController = new StoreController();
const menuController = new MenuController();

// Create JWT configuration for authentication middleware
const jwtConfig: JWTConfig = {
  accessSecret: env.JWT_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpiresIn: env.JWT_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  issuer: 'vibe-food-api',
  audience: 'vibe-food-app',
};

// Initialize authentication middleware
const authMiddleware = createAuthMiddleware(jwtConfig);

// Store listing
router.get(
  '/',
  cacheStoreList,
  validateQuery(getStoresQuerySchema),
  storeController.getStores,
);

// Get stores owned by authenticated user (must come before /:id)
router.get(
  '/mine',
  authMiddleware.authenticate,
  storeController.getMyStores,
);

// Store details
router.get(
  '/:id',
  cacheStoreDetails,
  storeController.getStoreById,
);

// Store menu
router.get(
  '/:storeId/menu',
  cacheMenu,
  menuController.getMenu,
);

export default router;
