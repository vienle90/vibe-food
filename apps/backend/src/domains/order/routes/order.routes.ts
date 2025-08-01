import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validateBody, validateQuery } from '../../../middleware/validation.middleware';
import { createAuthMiddleware } from '../../auth/middleware/index.js';
import { env } from '@vibe/shared';
import { 
  validationSchemas
} from '@vibe/shared';
import type { JWTConfig } from '../../auth/types/auth.types.js';

const router = Router();
const orderController = new OrderController();

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

// All order routes require authentication
router.use(authMiddleware.authenticate);

/**
 * POST /api/orders - Create a new order
 * @route POST /api/orders
 * @access Private - Authenticated users only
 * @body CreateOrderRequest
 */
router.post(
  '/',
  validateBody(validationSchemas.createOrder),
  orderController.createOrder
);

/**
 * GET /api/orders - Get order history with filtering
 * @route GET /api/orders
 * @access Private - Authenticated users only
 * @query GetOrdersQuery (status, page, limit)
 */
router.get(
  '/',
  validateQuery(validationSchemas.orderFilters),
  orderController.getOrders
);

/**
 * GET /api/orders/:id - Get order details by ID
 * @route GET /api/orders/:id
 * @access Private - Order owner or store owner only
 */
router.get(
  '/:id',
  orderController.getOrderById
);

/**
 * PUT /api/orders/:id/status - Update order status
 * @route PUT /api/orders/:id/status
 * @access Private - Store owners and admins only (customers can only cancel)
 * @body UpdateOrderStatusRequest
 */
router.put(
  '/:id/status',
  validateBody(validationSchemas.updateOrderStatus),
  orderController.updateOrderStatus
);

/**
 * POST /api/orders/:id/cancel - Cancel an order (customer-friendly endpoint)
 * @route POST /api/orders/:id/cancel
 * @access Private - Order owner only
 */
router.post(
  '/:id/cancel',
  orderController.cancelOrder
);

/**
 * POST /api/orders/:id/reorder - Reorder a previous order
 * @route POST /api/orders/:id/reorder
 * @access Private - Order owner only
 */
router.post(
  '/:id/reorder',
  orderController.reorderOrder
);

/**
 * GET /api/orders/store/:storeId/stats - Get order statistics for a store
 * @route GET /api/orders/store/:storeId/stats
 * @access Private - Store owners and admins only
 */
router.get(
  '/store/:storeId/stats',
  orderController.getStoreOrderStats
);

export { router as orderRoutes };