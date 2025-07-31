import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validateBody, validateQuery } from '../../../middleware/validation.middleware';
import { 
  createOrderRequestSchema,
  updateOrderStatusRequestSchema,
  getOrdersQuerySchema 
} from '@vibe/shared';

const router = Router();
const orderController = new OrderController();

// Simple auth check middleware - for now we'll skip auth to test the endpoints
// TODO: Implement proper auth middleware integration
const simpleAuthCheck = (req: any, res: any, next: any) => {
  // Mock user for testing - using real user ID from database
  req.user = {
    sub: 'cmdqp5xft0003u7bt23oza75l', // Real user ID from seed data
    role: 'CUSTOMER',
    email: 'test@example.com'
  };
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
  validateBody(createOrderRequestSchema),
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
  validateQuery(getOrdersQuerySchema),
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
  validateBody(updateOrderStatusRequestSchema),
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
 * GET /api/orders/store/:storeId/stats - Get order statistics for a store
 * @route GET /api/orders/store/:storeId/stats
 * @access Private - Store owners and admins only
 */
router.get(
  '/store/:storeId/stats',
  orderController.getStoreOrderStats
);

export { router as orderRoutes };