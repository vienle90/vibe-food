import { z } from 'zod';
import {
  StoreCategorySchema,
  OrderStatusSchema,
  PaymentMethodSchema,
  paginationMetaSchema,
} from './core';

// Import cart item schema from entities to avoid duplication
import { cartItemSchema } from './entities';

/**
 * API request and response schemas for all endpoints.
 * These schemas define the contract between frontend and backend.
 */

/**
 * Store API schemas
 */
export const getStoresQuerySchema = z.object({
  category: StoreCategorySchema.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['relevance', 'rating', 'name', 'createdAt']).default('rating'),
  isActive: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});

export type GetStoresQuery = z.infer<typeof getStoresQuerySchema>;

export const getStoresResponseSchema = z.object({
  stores: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    category: StoreCategorySchema,
    rating: z.number().min(0).max(5).nullable(),
    totalOrders: z.number().int().min(0),
    deliveryFee: z.number().min(0),
    minimumOrder: z.number().min(0),
    estimatedDeliveryTime: z.number().int().min(1),
    isActive: z.boolean(),
    address: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    operatingHours: z.record(z.any()),
    ownerId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export type GetStoresResponse = z.infer<typeof getStoresResponseSchema>;

export const getStoreDetailsResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: StoreCategorySchema,
  rating: z.number().min(0).max(5).optional(),
  deliveryFee: z.number().min(0),
  minimumOrder: z.number().min(0),
  estimatedDeliveryTime: z.number().int().min(1),
  isActive: z.boolean(),
  address: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional(),
  }),
});

export type GetStoreDetailsResponse = z.infer<typeof getStoreDetailsResponseSchema>;

/**
 * Store management API schemas (for store owners and admin)
 */
export const createStoreRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: StoreCategorySchema,
  address: z.string().min(1).max(200),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  email: z.string().email().optional(),
  deliveryFee: z.number().min(0).default(0),
  minimumOrder: z.number().min(0).default(0),
  estimatedDeliveryTime: z.number().int().min(1).default(30),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional(),
  }).optional(),
});

export type CreateStoreRequest = z.infer<typeof createStoreRequestSchema>;

export const createStoreResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: StoreCategorySchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export type CreateStoreResponse = z.infer<typeof createStoreResponseSchema>;

export const updateStoreRequestSchema = createStoreRequestSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateStoreRequest = z.infer<typeof updateStoreRequestSchema>;

export const updateStoreResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: StoreCategorySchema,
  isActive: z.boolean(),
  updatedAt: z.string().datetime(),
});

export type UpdateStoreResponse = z.infer<typeof updateStoreResponseSchema>;

/**
 * Menu API schemas
 */
export const getMenuQuerySchema = z.object({
  storeId: z.string().cuid(),
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  available: z.coerce.boolean().optional(),
});

export type GetMenuQuery = z.infer<typeof getMenuQuerySchema>;

export const getMenuResponseSchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  categories: z.array(z.object({
    name: z.string(),
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      price: z.number().positive(),
      category: z.string(),
      isAvailable: z.boolean(),
      imageUrl: z.string().optional(),
      preparationTime: z.number().int().min(1),
      allergens: z.array(z.string()),
      nutritionalInfo: z.object({
        calories: z.number().min(0).optional(),
        protein: z.number().min(0).optional(),
        carbs: z.number().min(0).optional(),
        fat: z.number().min(0).optional(),
      }).optional(),
    })),
  })),
});

export type GetMenuResponse = z.infer<typeof getMenuResponseSchema>;

/**
 * Menu Item Management API schemas (for store owners)
 */
export const createMenuItemRequestSchema = z.object({
  storeId: z.string().cuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive().multipleOf(0.01),
  category: z.string().min(1).max(50),
  imageUrl: z.string().url().optional(),
  preparationTime: z.number().int().min(1).default(15),
  allergens: z.array(z.string()).default([]),
  nutritionalInfo: z.object({
    calories: z.number().min(0).optional(),
    protein: z.number().min(0).optional(),
    carbs: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
  }).optional(),
  isAvailable: z.boolean().default(true),
});

export type CreateMenuItemRequest = z.infer<typeof createMenuItemRequestSchema>;

export const createMenuItemResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  isAvailable: z.boolean(),
  createdAt: z.string().datetime(),
});

export type CreateMenuItemResponse = z.infer<typeof createMenuItemResponseSchema>;

export const updateMenuItemRequestSchema = createMenuItemRequestSchema.omit({ storeId: true }).partial();

export type UpdateMenuItemRequest = z.infer<typeof updateMenuItemRequestSchema>;

export const updateMenuItemResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  isAvailable: z.boolean(),
  updatedAt: z.string().datetime(),
});

export type UpdateMenuItemResponse = z.infer<typeof updateMenuItemResponseSchema>;

export const deleteMenuItemResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type DeleteMenuItemResponse = z.infer<typeof deleteMenuItemResponseSchema>;

/**
 * Cart and Order API schemas
 */

export const createOrderRequestSchema = z.object({
  storeId: z.string().cuid(),
  items: z.array(cartItemSchema).min(1),
  paymentMethod: PaymentMethodSchema.default('CASH_ON_DELIVERY'),
  deliveryAddress: z.string().min(1).max(200),
  customerPhone: z.string().regex(/^\+?[\d\s-()]+$/),
  notes: z.string().max(500).optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export const createOrderResponseSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  status: OrderStatusSchema,
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  estimatedDeliveryTime: z.string().datetime().optional(),
});

export type CreateOrderResponse = z.infer<typeof createOrderResponseSchema>;

export const getOrdersQuerySchema = z.object({
  status: OrderStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type GetOrdersQuery = z.infer<typeof getOrdersQuerySchema>;

export const getOrdersResponseSchema = z.object({
  orders: z.array(z.object({
    id: z.string(),
    orderNumber: z.string(),
    status: OrderStatusSchema,
    total: z.number().min(0),
    storeName: z.string(),
    storeCategory: StoreCategorySchema,
    itemCount: z.number().int().min(1),
    estimatedDeliveryTime: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
  })),
  pagination: paginationMetaSchema,
});

export type GetOrdersResponse = z.infer<typeof getOrdersResponseSchema>;

export const getOrderDetailsResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: OrderStatusSchema,
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  paymentMethod: PaymentMethodSchema,
  deliveryAddress: z.string(),
  customerPhone: z.string(),
  notes: z.string().optional(),
  estimatedDeliveryTime: z.string().datetime().optional(),
  actualDeliveryTime: z.string().datetime().optional(),
  store: z.object({
    id: z.string(),
    name: z.string(),
    category: StoreCategorySchema,
    phone: z.string().optional(),
  }),
  items: z.array(z.object({
    id: z.string(),
    menuItemName: z.string(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().positive(),
    totalPrice: z.number().positive(),
    specialInstructions: z.string().optional(),
  })),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GetOrderDetailsResponse = z.infer<typeof getOrderDetailsResponseSchema>;

export const updateOrderStatusRequestSchema = z.object({
  status: OrderStatusSchema,
  notes: z.string().max(500).optional(),
});

export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusRequestSchema>;

export const updateOrderStatusResponseSchema = z.object({
  id: z.string(),
  status: OrderStatusSchema,
  updatedAt: z.string().datetime(),
});

export type UpdateOrderStatusResponse = z.infer<typeof updateOrderStatusResponseSchema>;

/**
 * User profile API schemas
 */
export const updateProfileRequestSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  address: z.string().max(200).optional(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

/**
 * Common query and filter schemas
 */
export const searchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  category: StoreCategorySchema.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  deliveryTime: z.coerce.number().int().min(1).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

/**
 * Health check and status schemas
 */
export const healthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  version: z.string(),
  database: z.enum(['connected', 'disconnected']),
  redis: z.enum(['connected', 'disconnected', 'not_configured']).optional(),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;

/**
 * User management API schemas (admin only)
 */
export const getUsersQuerySchema = z.object({
  search: z.string().max(100).optional(),
  role: z.enum(['CUSTOMER', 'STORE_OWNER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;

export const getUsersResponseSchema = z.object({
  users: z.array(z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.enum(['CUSTOMER', 'STORE_OWNER', 'ADMIN']),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    lastLoginAt: z.string().datetime().optional(),
  })),
  pagination: paginationMetaSchema,
});

export type GetUsersResponse = z.infer<typeof getUsersResponseSchema>;

export const updateUserRoleRequestSchema = z.object({
  role: z.enum(['CUSTOMER', 'STORE_OWNER', 'ADMIN']),
});

export type UpdateUserRoleRequest = z.infer<typeof updateUserRoleRequestSchema>;

export const updateUserStatusRequestSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).optional(),
});

export type UpdateUserStatusRequest = z.infer<typeof updateUserStatusRequestSchema>;

export const getUserDetailsResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(['CUSTOMER', 'STORE_OWNER', 'ADMIN']),
  isActive: z.boolean(),
  stores: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: StoreCategorySchema,
    isActive: z.boolean(),
  })).optional(),
  orderStats: z.object({
    totalOrders: z.number(),
    totalSpent: z.number(),
    averageOrderValue: z.number(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().optional(),
});

export type GetUserDetailsResponse = z.infer<typeof getUserDetailsResponseSchema>;