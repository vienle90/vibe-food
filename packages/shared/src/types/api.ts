import { z } from 'zod';
import {
  StoreCategorySchema,
  OrderStatusSchema,
  PaymentMethodSchema,
  paginationMetaSchema,
} from './core.js';

/**
 * API request and response schemas for all endpoints.
 * These schemas define the contract between frontend and backend.
 */

/**
 * Authentication API schemas
 */
export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.string(),
  }),
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/**
 * Store API schemas
 */
export const getStoresQuerySchema = z.object({
  category: StoreCategorySchema.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(['name', 'rating', 'deliveryTime', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type GetStoresQuery = z.infer<typeof getStoresQuerySchema>;

export const getStoresResponseSchema = z.object({
  stores: z.array(z.object({
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
  })),
  pagination: paginationMetaSchema,
  filters: z.object({
    categories: z.array(StoreCategorySchema),
    priceRanges: z.array(z.object({
      min: z.number(),
      max: z.number(),
      label: z.string(),
    })),
  }),
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
 * Cart and Order API schemas
 */
export const cartItemSchema = z.object({
  menuItemId: z.string().cuid(),
  quantity: z.number().int().min(1).max(10),
  specialInstructions: z.string().max(200).optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

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