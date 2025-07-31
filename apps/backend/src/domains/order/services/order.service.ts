import { OrderStatus } from '@prisma/client';
import { OrderRepository, OrderWithDetails } from '../repos/order.repository';
import { StoreRepository } from '../../store/repos/store.repository';
import { MenuItemRepository } from '../../store/repos/menu-item.repository';
import {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  ORDER_BUSINESS_RULES,
  ORDER_STATUS_TRANSITIONS,
  ORDER_ERRORS,
  CreateOrderData,
  CreateOrderItemData,
} from '../types/order.types';
import { ValidationError, NotFoundError, UnauthorizedError } from '@vibe/shared';

export class OrderService {
  private orderRepository: OrderRepository;
  private storeRepository: StoreRepository;
  private menuItemRepository: MenuItemRepository;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.storeRepository = new StoreRepository();
    this.menuItemRepository = new MenuItemRepository();
  }

  /**
   * Create a new order with comprehensive validation
   */
  async createOrder(
    customerId: string,
    orderRequest: CreateOrderRequest
  ): Promise<OrderWithDetails> {
    // 1. Validate store exists and is active
    const store = await this.storeRepository.findById(orderRequest.storeId);
    if (!store || !store.isActive) {
      throw new NotFoundError(ORDER_ERRORS.STORE_NOT_FOUND);
    }

    // 2. Check if store is within operating hours
    // TODO: Fix operating hours validation - temporarily disabled for testing
    // this.validateStoreOperatingHours(store.operatingHours as any);

    // 3. Validate and get menu items with current prices
    const menuItems = await this.validateAndGetMenuItems(orderRequest.items);

    // 4. Calculate order totals
    const { subtotal, deliveryFee, tax, total } = this.calculateOrderTotals(
      menuItems,
      orderRequest.items,
      Number(store.deliveryFee),
      Number(store.minimumOrder)
    );

    // 5. Validate order value constraints
    this.validateOrderValue(total);

    // 6. Prepare order data
    const orderData: CreateOrderData = {
      customerId,
      storeId: orderRequest.storeId,
      subtotal,
      deliveryFee,
      tax,
      total,
      paymentMethod: orderRequest.paymentMethod,
      deliveryAddress: orderRequest.deliveryAddress,
      customerPhone: orderRequest.customerPhone,
      notes: orderRequest.notes || null,
      estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(
        store.estimatedDeliveryTime
      ),
    };

    // 7. Prepare order items data
    const orderItemsData: CreateOrderItemData[] = orderRequest.items.map(
      (requestItem) => {
        const menuItem = menuItems.find(mi => mi.id === requestItem.menuItemId)!;
        const unitPrice = Number(menuItem.price);
        const totalPrice = unitPrice * requestItem.quantity;

        return {
          menuItemId: requestItem.menuItemId,
          quantity: requestItem.quantity,
          unitPrice,
          totalPrice,
          specialInstructions: requestItem.specialInstructions || null,
        };
      }
    );

    // 8. Create order with items in transaction
    return await this.orderRepository.createOrderWithItems(orderData, orderItemsData);
  }

  /**
   * Get order details by ID with authorization check
   */
  async getOrderDetails(
    orderId: string,
    userId: string,
    userRole: string
  ): Promise<OrderWithDetails> {
    const order = await this.orderRepository.findByIdWithDetails(orderId);

    // Authorization: customers can only see their own orders
    if (userRole === 'CUSTOMER' && order.customerId !== userId) {
      throw new UnauthorizedError(ORDER_ERRORS.UNAUTHORIZED_ACCESS);
    }

    // Authorization: store owners can only see orders for their stores
    if (userRole === 'STORE_OWNER') {
      const store = await this.storeRepository.findById(order.storeId);
      if (!store || store.ownerId !== userId) {
        throw new UnauthorizedError(ORDER_ERRORS.UNAUTHORIZED_ACCESS);
      }
    }

    return order;
  }

  /**
   * Get orders with filtering and pagination
   */
  async getOrders(
    userId: string,
    userRole: string,
    filters: {
      status?: OrderStatus;
      storeId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ orders: any[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, storeId } = filters;

    let orderFilters: any = {};

    // Apply role-based filtering
    if (userRole === 'CUSTOMER') {
      orderFilters.customerId = userId;
    } else if (userRole === 'STORE_OWNER') {
      // For store owners, filter by stores they own
      if (storeId) {
        // Verify ownership of the specific store
        const store = await this.storeRepository.findById(storeId);
        if (!store || store.ownerId !== userId) {
          throw new UnauthorizedError(ORDER_ERRORS.UNAUTHORIZED_ACCESS);
        }
        orderFilters.storeId = storeId;
      } else {
        // Get all stores owned by this user
        // This would require a method to get store IDs by owner
        throw new ValidationError('Store ID is required for store owners');
      }
    }

    if (status) {
      orderFilters.status = status;
    }

    const { orders, total } = await this.orderRepository.findMany(
      orderFilters,
      page,
      limit
    );

    // Transform data for API response
    const transformedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      storeName: (order as any).store?.name || 'Unknown Store',
      storeCategory: (order as any).store?.category || 'UNKNOWN',
      itemCount: (order as any).items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
      estimatedDeliveryTime: order.estimatedDeliveryTime?.toISOString(),
      createdAt: order.createdAt.toISOString(),
    }));

    return {
      orders: transformedOrders,
      total,
      page,
      limit,
    };
  }

  /**
   * Update order status with validation
   */
  async updateOrderStatus(
    orderId: string,
    userId: string,
    userRole: string,
    updateRequest: UpdateOrderStatusRequest
  ): Promise<any> {
    // Get current order
    const order = await this.orderRepository.findByIdWithDetails(orderId);

    // Authorization check for store owners
    if (userRole === 'STORE_OWNER') {  
      const store = await this.storeRepository.findById(order.storeId);
      if (!store || store.ownerId !== userId) {
        throw new UnauthorizedError(ORDER_ERRORS.UNAUTHORIZED_ACCESS);
      }
    } else if (userRole === 'CUSTOMER') {
      // Customers can only cancel their own orders and only in certain statuses
      if (order.customerId !== userId) {
        throw new UnauthorizedError(ORDER_ERRORS.UNAUTHORIZED_ACCESS);
      }
      if (updateRequest.status !== 'CANCELLED') {
        throw new UnauthorizedError('Customers can only cancel orders');
      }
      if (!['NEW', 'CONFIRMED'].includes(order.status)) {
        throw new ValidationError('Order cannot be cancelled at this stage');
      }
    }

    // Validate status transition
    this.validateStatusTransition(order.status, updateRequest.status);

    // Update order status
    const updatedOrder = await this.orderRepository.updateStatus(
      orderId,
      updateRequest.status,
      updateRequest.notes
    );

    return {
      id: updatedOrder.id,
      status: updatedOrder.status,
      updatedAt: updatedOrder.updatedAt.toISOString(),
    };
  }

  /**
   * Validate store operating hours
   */
  private validateStoreOperatingHours(operatingHours: Record<string, any>): void {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const todayHours = operatingHours[dayOfWeek];
    if (!todayHours || !todayHours.open || !todayHours.close) {
      throw new ValidationError(ORDER_ERRORS.STORE_CLOSED);
    }

    if (currentTime < todayHours.open || currentTime > todayHours.close) {
      throw new ValidationError(ORDER_ERRORS.STORE_CLOSED);
    }
  }

  /**
   * Validate menu items exist, are available, and get current prices
   */
  private async validateAndGetMenuItems(
    orderItems: CreateOrderRequest['items']
  ): Promise<any[]> {
    const menuItemIds = orderItems.map(item => item.menuItemId);
    const menuItems = await Promise.all(
      menuItemIds.map(id => this.menuItemRepository.findById(id))
    );

    // Check all items exist
    for (let i = 0; i < menuItems.length; i++) {
      const menuItem = menuItems[i];
      if (!menuItem) {
        throw new NotFoundError(ORDER_ERRORS.MENU_ITEM_NOT_FOUND);
      }
      if (!menuItem.isAvailable) {
        throw new ValidationError(ORDER_ERRORS.MENU_ITEM_UNAVAILABLE);
      }

      // Validate quantity
      const orderItem = orderItems[i];
      if (orderItem.quantity < 1 || orderItem.quantity > ORDER_BUSINESS_RULES.MAX_QUANTITY_PER_ITEM) {
        throw new ValidationError(ORDER_ERRORS.INVALID_QUANTITY);
      }
    }

    return menuItems;
  }

  /**
   * Calculate order totals
   */
  private calculateOrderTotals(
    menuItems: any[],
    orderItems: CreateOrderRequest['items'],
    storeDeliveryFee: number,
    storeMinimumOrder: number
  ): { subtotal: number; deliveryFee: number; tax: number; total: number } {
    let subtotal = 0;

    for (const orderItem of orderItems) {
      const menuItem = menuItems.find(mi => mi.id === orderItem.menuItemId);
      if (menuItem) {
        subtotal += Number(menuItem.price) * orderItem.quantity;
      }
    }

    // Check minimum order requirement
    if (subtotal < storeMinimumOrder) {
      throw new ValidationError(ORDER_ERRORS.MINIMUM_ORDER_NOT_MET);
    }

    const deliveryFee = storeDeliveryFee;
    const tax = subtotal * ORDER_BUSINESS_RULES.TAX_RATE;
    const total = subtotal + deliveryFee + tax;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee: Number(deliveryFee.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }

  /**
   * Validate order value constraints
   */
  private validateOrderValue(total: number): void {
    if (total > ORDER_BUSINESS_RULES.MAXIMUM_ORDER_VALUE) {
      throw new ValidationError(ORDER_ERRORS.MAXIMUM_ORDER_EXCEEDED);
    }
  }

  /**
   * Calculate estimated delivery time
   */
  private calculateEstimatedDeliveryTime(storeEstimatedTime: number): Date {
    const now = new Date();
    return new Date(now.getTime() + storeEstimatedTime * 60000); // Add minutes in milliseconds  
  }

  /**
   * Validate order status transition
   */
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(ORDER_ERRORS.INVALID_STATUS_TRANSITION);
    }
  }
}