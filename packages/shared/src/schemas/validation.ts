import { z } from 'zod';
import {
  UserIdSchema,
  StoreIdSchema,
  MenuItemIdSchema,
  UserRoleSchema,
  StoreCategorySchema,
  OrderStatusSchema,
  PaymentMethodSchema,
  strongPasswordSchema,
  usernameSchema,
  paginationMetaSchema,
  apiErrorResponseSchema,
} from '../types/core';

/**
 * Helper function to parse time string (HH:MM) to minutes since midnight
 */
function parseTime(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  return hours * 60 + minutes;
}

/**
 * Validation schemas for all external data inputs.
 * These schemas provide runtime validation and type inference for:
 * - API request bodies and query parameters
 * - Form inputs and user data
 * - Environment variables and configuration
 * - External system integration
 */

/**
 * Reusable base schemas for common patterns
 */

// Pagination schema with sensible defaults
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// Sorting schema for list endpoints
export const sortingSchema = z.object({
  sortBy: z.string().min(1).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type SortingInput = z.infer<typeof sortingSchema>;

// Search schema for text-based filtering
export const searchSchema = z.object({
  search: z.string().max(100).optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;

// Combined query schema for list endpoints
export const listQuerySchema = paginationSchema
  .merge(sortingSchema)
  .merge(searchSchema);

export type ListQueryInput = z.infer<typeof listQuerySchema>;

/**
 * User validation schemas
 */

// User registration schema with strong validation
export const registerUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: usernameSchema,
  password: strongPasswordSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number').optional(),
  address: z.string().max(200).optional(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

// User login schema (flexible identifier)
export const loginUserSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

// User profile update schema
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  address: z.string().max(200).optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

// Password change schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: strongPasswordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// User query filters
export const userFiltersSchema = listQuerySchema.extend({
  role: UserRoleSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

export type UserFiltersInput = z.infer<typeof userFiltersSchema>;

/**
 * Store validation schemas
 */

// Store creation schema
export const createStoreSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(100),
  description: z.string().max(500).optional(),
  category: StoreCategorySchema,
  address: z.string().min(1, 'Address is required').max(200),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  email: z.string().email().optional(),
  deliveryFee: z.number().min(0).default(2.99),
  minimumOrder: z.number().min(0).default(10.00),
  estimatedDeliveryTime: z.number().int().min(1).default(30),
  operatingHours: z.object({
    monday: z.object({ 
      open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), 
      close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).refine((hours) => {
      const openTime = parseTime(hours.open);
      const closeTime = parseTime(hours.close);
      return closeTime > openTime;
    }, { message: "Close time must be after open time" }).optional(),
    tuesday: z.object({ 
      open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), 
      close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).refine((hours) => {
      const openTime = parseTime(hours.open);
      const closeTime = parseTime(hours.close);
      return closeTime > openTime;
    }, { message: "Close time must be after open time" }).optional(),
    wednesday: z.object({ 
      open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), 
      close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).refine((hours) => {
      const openTime = parseTime(hours.open);
      const closeTime = parseTime(hours.close);
      return closeTime > openTime;
    }, { message: "Close time must be after open time" }).optional(),
    thursday: z.object({ 
      open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), 
      close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).refine((hours) => {
      const openTime = parseTime(hours.open);
      const closeTime = parseTime(hours.close);
      return closeTime > openTime;
    }, { message: "Close time must be after open time" }).optional(),
    friday: z.object({ 
      open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), 
      close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).refine((hours) => {
      const openTime = parseTime(hours.open);
      const closeTime = parseTime(hours.close);
      return closeTime > openTime;
    }, { message: "Close time must be after open time" }).optional(),
    saturday: z.object({ 
      open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), 
      close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).refine((hours) => {
      const openTime = parseTime(hours.open);
      const closeTime = parseTime(hours.close);
      return closeTime > openTime;
    }, { message: "Close time must be after open time" }).optional(),
    sunday: z.object({ 
      open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), 
      close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).refine((hours) => {
      const openTime = parseTime(hours.open);
      const closeTime = parseTime(hours.close);
      return closeTime > openTime;
    }, { message: "Close time must be after open time" }).optional(),
  }).default({}),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

// Store update schema (partial)
export const updateStoreSchema = createStoreSchema.partial();

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

// Store query filters
export const storeFiltersSchema = listQuerySchema.extend({
  category: StoreCategorySchema.optional(),
  isActive: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxDeliveryFee: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['name', 'rating', 'deliveryTime', 'createdAt']).default('name'),
});

export type StoreFiltersInput = z.infer<typeof storeFiltersSchema>;
/**
 * MenuItem validation schemas
 */

// MenuItem creation schema
export const createMenuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive('Price must be greater than 0'),
  category: z.string().min(1, 'Category is required').max(50),
  imageUrl: z.string().url().optional(),
  preparationTime: z.number().int().min(1).default(15),
  allergens: z.array(z.string()).default([]),
  nutritionalInfo: z.object({
    calories: z.number().min(0).optional(),
    protein: z.number().min(0).optional(),
    carbs: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
  }).optional(),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

// MenuItem update schema (partial)
export const updateMenuItemSchema = createMenuItemSchema.partial();

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

// MenuItem query filters
export const menuItemFiltersSchema = listQuerySchema.extend({
  storeId: StoreIdSchema.optional(),
  category: z.string().optional(),
  isAvailable: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

export type MenuItemFiltersInput = z.infer<typeof menuItemFiltersSchema>;

/**
 * Order validation schemas
 */

// Cart item schema for order creation
export const cartItemInputSchema = z.object({
  menuItemId: MenuItemIdSchema,
  quantity: z.number().int().min(1).max(10),
  specialInstructions: z.string().max(200).optional(),
});

export type CartItemInput = z.infer<typeof cartItemInputSchema>;

// Order creation schema
export const createOrderSchema = z.object({
  storeId: StoreIdSchema,
  items: z.array(cartItemInputSchema).min(1, 'Order must contain at least one item'),
  paymentMethod: PaymentMethodSchema.default('CASH_ON_DELIVERY'),
  deliveryAddress: z.string().min(1, 'Delivery address is required').max(200),
  customerPhone: z.string().regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number'),
  notes: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Order status update schema
export const updateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
  estimatedDeliveryTime: z.string().datetime().optional(),
  actualDeliveryTime: z.string().datetime().optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// Order query filters
export const orderFiltersSchema = listQuerySchema.extend({
  customerId: UserIdSchema.optional(),
  storeId: StoreIdSchema.optional(),
  status: OrderStatusSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'total', 'status']).default('createdAt'),
});

export type OrderFiltersInput = z.infer<typeof orderFiltersSchema>;

/**
 * API response validation schemas
 */

// Generic API response wrapper
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  });

// Pagination metadata and API responses are imported from core.js to avoid duplication

// Paginated response schema
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: paginationMetaSchema,
    timestamp: z.string().datetime(),
  });

/**
 * Environment validation schema
 */
export const envValidationSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('localhost'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type EnvValidation = z.infer<typeof envValidationSchema>;

/**
 * File upload validation schemas
 */
export const fileUploadSchema = z.object({
  filename: z.string().min(1),
  mimetype: z.string().min(1),
  size: z.number().int().positive().max(5242880), // 5MB max
  buffer: z.instanceof(Buffer).optional(),
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;

// Image upload schema (more restrictive)
export const imageUploadSchema = fileUploadSchema.extend({
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  size: z.number().int().positive().max(2097152), // 2MB max for images
});

export type ImageUploadInput = z.infer<typeof imageUploadSchema>;

/**
 * Centralized validation schemas export
 * Organized by domain for easy access and tree-shaking
 */
export const validationSchemas = {
  // Base schemas
  pagination: paginationSchema,
  sorting: sortingSchema,
  search: searchSchema,
  listQuery: listQuerySchema,

  // User schemas
  registerUser: registerUserSchema,
  loginUser: loginUserSchema,
  updateUserProfile: updateUserProfileSchema,
  changePassword: changePasswordSchema,
  userFilters: userFiltersSchema,

  // Store schemas
  createStore: createStoreSchema,
  updateStore: updateStoreSchema,
  storeFilters: storeFiltersSchema,

  // MenuItem schemas
  createMenuItem: createMenuItemSchema,
  updateMenuItem: updateMenuItemSchema,
  menuItemFilters: menuItemFiltersSchema,

  // Order schemas
  cartItem: cartItemInputSchema,
  createOrder: createOrderSchema,
  updateOrderStatus: updateOrderStatusSchema,
  orderFilters: orderFiltersSchema,

  // API schemas
  apiResponse: apiResponseSchema,
  apiErrorResponse: apiErrorResponseSchema,
  paginationMeta: paginationMetaSchema,
  paginatedResponse: paginatedResponseSchema,

  // File upload schemas
  fileUpload: fileUploadSchema,
  imageUpload: imageUploadSchema,

  // Environment schema
  env: envValidationSchema,
} as const;

/**
 * Type-safe validation function factory
 */
export function createValidator<T extends z.ZodTypeAny>(schema: T) {
  return (data: unknown): z.infer<T> => {
    return schema.parse(data);
  };
}

/**
 * Safe validation function that returns result with success flag
 */
export function safeValidate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validation middleware helper for Express
 */
export function validateInput<T extends z.ZodTypeAny>(schema: T) {
  return (data: unknown) => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
}
