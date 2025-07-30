
import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';
import { MenuController } from '../controllers/menu.controller';
import { validateQuery } from '../../../middleware/validation.middleware';
import { getStoresQuerySchema } from '@vibe/shared';
import { cacheStoreDetails, cacheMenu, cacheStoreList } from '../../../middleware/cache.middleware';

const router = Router();
const storeController = new StoreController();
const menuController = new MenuController();

// Store listing
router.get(
  '/',
  cacheStoreList,
  validateQuery(getStoresQuerySchema),
  storeController.getStores,
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
