import { NextFunction, Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { CreateOrderRequest, UpdateOrderStatusRequest } from '../types/order.types';
import { OrderStatus } from '@prisma/client';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * POST /api/orders - Create a new order
   */
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as any)?.sub; // User ID from JWT token
      const orderRequest: CreateOrderRequest = req.body;

      const order = await this.orderService.createOrder(userId, orderRequest);

      // Transform response to match API contract
      const response = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        tax: Number(order.tax),
        total: Number(order.total),
        estimatedDeliveryTime: order.estimatedDeliveryTime?.toISOString(),
      };

      res.status(201).json({
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/orders - Get order history with filtering
   */
  getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const userRole = req.user!.role;
      
      const filters = {
        status: req.query.status as OrderStatus | undefined,
        storeId: req.query.storeId as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.orderService.getOrders(userId, userRole, filters);

      // Create pagination metadata
      const pagination = {
        currentPage: result.page,
        totalPages: Math.ceil(result.total / result.limit),
        totalItems: result.total,
        itemsPerPage: result.limit,
        hasNextPage: result.page < Math.ceil(result.total / result.limit),
        hasPreviousPage: result.page > 1,
      };

      res.json({
        success: true,
        data: {
          orders: result.orders,
          pagination,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/orders/:id - Get order details by ID
   */
  getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.sub;
      const userRole = req.user!.role;

      const order = await this.orderService.getOrderDetails(id, userId, userRole);

      // Transform response to match API contract
      const response = {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        tax: Number(order.tax),
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
        customerPhone: order.customerPhone,
        notes: order.notes,
        estimatedDeliveryTime: order.estimatedDeliveryTime?.toISOString(),
        actualDeliveryTime: order.actualDeliveryTime?.toISOString(),
        store: {
          id: order.store.id,
          name: order.store.name,
          category: order.store.category,
          phone: order.store.phone,
        },
        items: order.items.map(item => ({
          id: item.id,
          menuItemName: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          specialInstructions: item.specialInstructions,
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      };

      res.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/orders/:id/status - Update order status
   */
  updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.sub;
      const userRole = req.user!.role;
      const updateRequest: UpdateOrderStatusRequest = req.body;

      const result = await this.orderService.updateOrderStatus(
        id,
        userId,
        userRole,
        updateRequest
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/orders/store/:storeId/stats - Get order statistics for store owners
   */
  getStoreOrderStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const userId = req.user!.sub;
      const userRole = req.user!.role;

      // Only store owners and admins can access stats
      if (userRole !== 'STORE_OWNER' && userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access denied',
          timestamp: new Date().toISOString(),
        });
      }

      // For store owners, verify they own the store
      if (userRole === 'STORE_OWNER') {
        // This would need store verification logic
        // For now, we'll trust the storeId parameter
      }

      // Get stats from repository directly (would need to add this method to service)
      // For now, return placeholder response
      const stats = {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
      };

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/orders/:id/cancel - Cancel an order (customer-facing endpoint)
   */
  cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.sub;
      const userRole = req.user!.role;

      const result = await this.orderService.updateOrderStatus(
        id,
        userId,
        userRole,
        { status: 'CANCELLED', notes: 'Cancelled by customer' }
      );

      res.json({
        success: true,
        data: result,
        message: 'Order cancelled successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}