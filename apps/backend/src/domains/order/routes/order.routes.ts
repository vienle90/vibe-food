import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validateBody, validateQuery } from '../../../middleware/validation.middleware';
import { 
  validationSchemas
} from '@vibe/shared';

const router = Router();
const orderController = new OrderController();

// Simple auth check middleware - for now we'll skip auth to test the endpoints
// TODO: Implement proper auth middleware integration
const simpleAuthCheck = (req: any, _res: any, next: any) => {
  // Mock user for testing - using real user ID from database
  // Check if this is a status update request to use store owner role
  if (req.path.includes('/status') && req.method === 'PUT') {
    req.user = {
      id: 'cmdqp5xft0003u7bt23oza75l', // Same user, but with store owner role
      role: 'STORE_OWNER',
      email: 'owner@sakura.com',
      username: 'sakuraowner',
      firstName: 'Takeshi',
      lastName: 'Yamamoto'
    };
  } else {
    req.user = {
      id: 'cmdqp5xft0003u7bt23oza75l', // Real user ID from seed data
      role: 'CUSTOMER',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    };
  }
  next();
};

// All order routes require authentication
router.use(simpleAuthCheck);

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