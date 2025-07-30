
import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';
import { validateQuery } from '../../../middleware/validation.middleware';
import { getStoresQuerySchema } from '@vibe/shared';

const router = Router();
const storeController = new StoreController();

router.get(
  '/',
  validateQuery(getStoresQuerySchema),
  storeController.getStores,
);

export default router;
