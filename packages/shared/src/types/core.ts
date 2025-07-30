import { z } from 'zod';

/**
 * Core type definitions and branded types for the Vibe food ordering application.
 * 
 * This file contains:
 * - Branded types for all entity IDs (enhanced type safety)
 * - Enums for constrained values matching Prisma schema
 * - Core utility types used across the application
 * - Authentication-related schemas
 */

/**
 * Branded types for IDs to prevent mixing different entity IDs
 * All IDs use CUID format for better performance and uniqueness
 */
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

export const RefreshTokenIdSchema = z.string().cuid().brand<'RefreshTokenId'>();
export type RefreshTokenId = z.infer<typeof RefreshTokenIdSchema>;

/**
 * Branded types for domain-specific values with validation
 */
export const EmailSchema = z.string().email().brand<'Email'>();
export type Email = z.infer<typeof EmailSchema>;

export const PhoneSchema = z.string().regex(/^\+?[\d\s-()]+$/).brand<'Phone'>();
export type Phone = z.infer<typeof PhoneSchema>;

export const PriceSchema = z.number().positive().multipleOf(0.01).brand<'Price'>();
export type Price = z.infer<typeof PriceSchema>;

export const RatingSchema = z.number().min(0).max(5).multipleOf(0.01).brand<'Rating'>();
export type Rating = z.infer<typeof RatingSchema>;

/**
 * Enums for constrained values - MUST match Prisma schema exactly
 */
export const UserRoleSchema = z.enum(['CUSTOMER', 'STORE_OWNER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const StoreCategorySchema = z.enum(['LUNCH', 'DINNER', 'COFFEE', 'TEA', 'DESSERT', 'FAST_FOOD']);
export type StoreCategory = z.infer<typeof StoreCategorySchema>;

export const OrderStatusSchema = z.enum(['NEW', 'PROCESSING', 'SHIPPING', 'DONE', 'CANCELLED']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentMethodSchema = z.enum(['CASH_ON_DELIVERY', 'CREDIT_CARD', 'DIGITAL_WALLET']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * Authentication schemas with strong validation
 */

/**
 * Strong password validation schema
 * Requirements: minimum 8 characters, uppercase, lowercase, number
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Username validation schema
 * Requirements: 3-20 characters, alphanumeric and underscore only
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(20, 'Username must be at most 20 characters long')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * JWT access token payload schema
 * Contains user data for stateless authorization
 */
export const jwtAccessPayloadSchema = z.object({
  sub: UserIdSchema, // Subject (user ID)
  email: EmailSchema,
  username: usernameSchema,
  role: UserRoleSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  iat: z.number().int().positive(), // Issued at
  exp: z.number().int().positive(), // Expires at
});

export type JwtAccessPayload = z.infer<typeof jwtAccessPayloadSchema>;

/**
 * JWT refresh token payload schema
 * Minimal payload for security - only user ID and token ID for rotation tracking
 */
export const jwtRefreshPayloadSchema = z.object({
  sub: UserIdSchema, // Subject (user ID)
  tokenId: z.string().uuid(), // For token rotation tracking
  iat: z.number().int().positive(), // Issued at
  exp: z.number().int().positive(), // Expires at
});

export type JwtRefreshPayload = z.infer<typeof jwtRefreshPayloadSchema>;

/**
 * Pagination metadata schema
 */
export const paginationMetaSchema = z.object({
  currentPage: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  totalItems: z.number().int().min(0),
  itemsPerPage: z.number().int().min(1).max(100),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Sort options schema for list endpoints
 */
export const sortOptionsSchema = z.object({
  sortBy: z.string().min(1),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type SortOptions = z.infer<typeof sortOptionsSchema>;

/**
 * Generic API response wrapper schemas
 */

// Success response schema
export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  });

// Error response schema
export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.array(z.any()).optional(),
  timestamp: z.string().datetime(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

// Paginated response schema
export const paginatedApiResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: paginationMetaSchema,
    timestamp: z.string().datetime(),
  });

/**
 * Base interface for entities with timestamps
 * Used by all database entities for consistent timestamp handling
 */
export interface TimestampFields {
  createdAt: string; // ISO string format for JSON serialization
  updatedAt: string; // ISO string format for JSON serialization
}

/**
 * Utility types for common patterns
 */

// Partial type that keeps certain keys required

// Omit multiple keys utility
export type OmitMultiple<T, K extends keyof T> = Omit<T, K>;

// Pick multiple keys utility with default
export type PickMultiple<T, K extends keyof T> = Pick<T, K>;

// Create type with optional timestamp fields
export type WithOptionalTimestamps<T> = T & Partial<TimestampFields>;

// Create type with required timestamp fields
export type WithTimestamps<T> = T & TimestampFields;

/**
 * Generic filter types for query parameters
 */
export interface BaseFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeFilters {
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
}

export interface PriceRangeFilters {
  minPrice?: number;
  maxPrice?: number;
}

export interface RatingFilters {
  minRating?: number;
  maxRating?: number;
}

/**
 * Type-safe environment variable access
 */
export type NodeEnv = 'development' | 'test' | 'production';

/**
 * File upload types
 */
export interface FileUpload {
  filename: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

export interface ImageUpload extends FileUpload {
  mimetype: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

/**
 * Constants for schema validation
 */
export const VALIDATION_CONSTANTS = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    UPPERCASE_PATTERN: /[A-Z]/,
    LOWERCASE_PATTERN: /[a-z]/,
    NUMBER_PATTERN: /[0-9]/,
  },
  PHONE: {
    PATTERN: /^\+?[\d\s-()]+$/,
  },
  PRICE: {
    MIN: 0.01,
    DECIMAL_PLACES: 2,
  },
  RATING: {
    MIN: 0,
    MAX: 5,
    DECIMAL_PLACES: 2,
  },
  TEXT: {
    MAX_SEARCH_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_NOTES_LENGTH: 500,
    MAX_ADDRESS_LENGTH: 200,
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
} as const;
