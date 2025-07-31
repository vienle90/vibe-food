import { OrderStatus, PaymentMethod } from '@prisma/client';

/**
 * Types for order domain
 */

export interface CreateOrderData {
  customerId: string;
  storeId: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  deliveryAddress: string;
  customerPhone: string;
  notes?: string;
  estimatedDeliveryTime?: Date;
}

export interface CreateOrderItemData {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

export interface OrderFilters {
  customerId?: string;
  storeId?: string;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface OrderSortOptions {
  field: 'createdAt' | 'total' | 'status';
  direction: 'asc' | 'desc';
}

export interface CreateOrderRequest {
  storeId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
  }>;
  paymentMethod: PaymentMethod;
  deliveryAddress: string;
  customerPhone: string;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

/**
 * Business rule constants
 */
export const ORDER_BUSINESS_RULES = {
  MINIMUM_ORDER_VALUE: 10.00,
  MAXIMUM_ORDER_VALUE: 200.00,
  TAX_RATE: 0.08,
  DEFAULT_DELIVERY_FEE: 2.99,
  MAX_QUANTITY_PER_ITEM: 10,
  ORDER_TIMEOUT_MINUTES: 30,
} as const;

/**
 * Order status transition rules
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['DELIVERED'],
  DELIVERED: [], // Final state
  CANCELLED: [], // Final state
} as const;

/**
 * Order validation errors
 */
export const ORDER_ERRORS = {
  STORE_NOT_FOUND: 'Store not found or inactive',
  STORE_CLOSED: 'Store is currently closed',
  MENU_ITEM_NOT_FOUND: 'One or more menu items not found',
  MENU_ITEM_UNAVAILABLE: 'One or more menu items are unavailable',
  MINIMUM_ORDER_NOT_MET: `Minimum order value of $${ORDER_BUSINESS_RULES.MINIMUM_ORDER_VALUE} not met`,
  MAXIMUM_ORDER_EXCEEDED: `Maximum order value of $${ORDER_BUSINESS_RULES.MAXIMUM_ORDER_VALUE} exceeded`,
  INVALID_QUANTITY: `Quantity must be between 1 and ${ORDER_BUSINESS_RULES.MAX_QUANTITY_PER_ITEM}`,
  PRICE_MISMATCH: 'Menu item prices have changed, please refresh your cart',
  INVALID_STATUS_TRANSITION: 'Invalid order status transition',
  ORDER_NOT_FOUND: 'Order not found',
  UNAUTHORIZED_ACCESS: 'Unauthorized access to order',
  PAYMENT_FAILED: 'Payment processing failed',
} as const;