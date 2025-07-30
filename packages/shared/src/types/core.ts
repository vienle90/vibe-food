import { z } from 'zod';

/**
 * Core type definitions and branded types for the Vibe food ordering application.
 * All IDs use branded types for enhanced type safety.
 */

// Branded types for IDs to prevent mixing different entity IDs
export const UserIdSchema = z.string().cuid().brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;

export const StoreIdSchema = z.string().cuid().brand<'StoreId'>();
export type StoreId = z.infer<typeof StoreIdSchema>;

export const MenuItemIdSchema = z.string().cuid().brand<'MenuItemId'>();
export type MenuItemId = z.infer<typeof MenuItemIdSchema>;

export const OrderIdSchema = z.string().cuid().brand<'OrderId'>();
export type OrderId = z.infer<typeof OrderIdSchema>;

export const OrderItemIdSchema = z.string().cuid().brand<'OrderItemId'>();
export type OrderItemId = z.infer<typeof OrderItemIdSchema>;

/**
 * Enums for constrained values
 */
export const UserRoleSchema = z.enum(['CUSTOMER', 'STORE_OWNER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const StoreCategorySchema = z.enum(['lunch', 'dinner', 'coffee', 'tea', 'dessert']);
export type StoreCategory = z.infer<typeof StoreCategorySchema>;

export const OrderStatusSchema = z.enum(['NEW', 'PROCESSING', 'SHIPPING', 'DONE', 'CANCELLED']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentMethodSchema = z.enum(['CASH_ON_DELIVERY', 'CREDIT_CARD', 'DIGITAL_WALLET']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * Core entity schemas
 */

// User entity schema
export const userSchema = z.object({
  id: UserIdSchema,
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: UserRoleSchema.default('CUSTOMER'),
  isActive: z.boolean().default(true),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  address: z.string().max(200).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

// Store entity schema
export const storeSchema = z.object({
  id: StoreIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: StoreCategorySchema,
  isActive: z.boolean().default(true),
  address: z.string().min(1).max(200),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  email: z.string().email().optional(),
  rating: z.number().min(0).max(5).optional(),
  deliveryFee: z.number().min(0).default(2.99),
  minimumOrder: z.number().min(0).default(10.00),
  estimatedDeliveryTime: z.number().int().min(1).default(30), // in minutes
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional(),
  }),
  ownerId: UserIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Store = z.infer<typeof storeSchema>;

// MenuItem entity schema
export const menuItemSchema = z.object({
  id: MenuItemIdSchema,
  storeId: StoreIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  category: z.string().min(1).max(50),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
  preparationTime: z.number().int().min(1).default(15), // in minutes
  allergens: z.array(z.string()).default([]),
  nutritionalInfo: z.object({
    calories: z.number().min(0).optional(),
    protein: z.number().min(0).optional(),
    carbs: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MenuItem = z.infer<typeof menuItemSchema>;

// Order entity schema
export const orderSchema = z.object({
  id: OrderIdSchema,
  orderNumber: z.string().min(1),
  customerId: UserIdSchema,
  storeId: StoreIdSchema,
  status: OrderStatusSchema.default('NEW'),
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  paymentMethod: PaymentMethodSchema.default('CASH_ON_DELIVERY'),
  deliveryAddress: z.string().min(1).max(200),
  customerPhone: z.string().regex(/^\+?[\d\s-()]+$/),
  notes: z.string().max(500).optional(),
  estimatedDeliveryTime: z.string().datetime().optional(),
  actualDeliveryTime: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Order = z.infer<typeof orderSchema>;

// OrderItem entity schema  
export const orderItemSchema = z.object({
  id: OrderItemIdSchema,
  orderId: OrderIdSchema,
  menuItemId: MenuItemIdSchema,
  quantity: z.number().int().min(1).max(10),
  unitPrice: z.number().positive(),
  totalPrice: z.number().positive(),
  specialInstructions: z.string().max(200).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

/**
 * Utility types for API operations
 */

// Pagination metadata
export const paginationMetaSchema = z.object({
  currentPage: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  totalItems: z.number().int().min(0),
  itemsPerPage: z.number().int().min(1).max(100),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// Common API response wrapper
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    error: z.string().optional(),
    timestamp: z.string().datetime(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
};

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.array(z.any()).optional(),
  timestamp: z.string().datetime(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;