import type { 
  UserEntity, 
  StoreEntity, 
  MenuItemEntity, 
  OrderEntity,
} from '../types/entities';
import type { PaginationMeta } from '../types/core';
import { 
  UserIdSchema, 
  StoreIdSchema, 
  MenuItemIdSchema, 
  OrderIdSchema 
} from '../types/core';

/**
 * Business constants and configuration values.
 * Centralized location for all business rules and limits.
 */

export const BUSINESS_CONSTANTS = {
  // Order limits
  MAX_CART_ITEMS: 20,
  MIN_ORDER_VALUE: 10.00,
  MAX_ORDER_VALUE: 500.00,
  MAX_ITEM_QUANTITY: 10,

  // Store limits
  MAX_MENU_ITEMS_PER_STORE: 200,
  MIN_DELIVERY_FEE: 0.00,
  MAX_DELIVERY_FEE: 15.00,
  MAX_PREPARATION_TIME: 120, // minutes

  // User limits
  MAX_ADDRESSES_PER_USER: 5,
  MAX_USERNAME_LENGTH: 20,
  MIN_USERNAME_LENGTH: 3,
  MAX_PHONE_LENGTH: 20,

  // Pricing
  TAX_RATE: 0.08, // 8% tax rate
  SERVICE_FEE_RATE: 0.02, // 2% service fee
  MIN_PRICE: 0.50,
  MAX_PRICE: 100.00,

  // Time limits
  ORDER_CANCELLATION_WINDOW: 5, // minutes
  MAX_DELIVERY_TIME: 180, // minutes
  DEFAULT_SESSION_DURATION: 15, // minutes
  REFRESH_TOKEN_DURATION: 7, // days

  // File upload
  MAX_IMAGE_SIZE: 2097152, // 2MB
  MAX_FILE_SIZE: 5242880, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,

  // Search
  MAX_SEARCH_LENGTH: 100,
  MIN_SEARCH_LENGTH: 2,

  // Rating
  MIN_RATING: 0,
  MAX_RATING: 5,
  RATING_DECIMAL_PLACES: 2,
} as const;

/**
 * Error codes for consistent error handling across the application.
 * Organized by category for better maintainability.
 */

export const ERROR_CODES = {
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCESS_TOKEN_REQUIRED: 'ACCESS_TOKEN_REQUIRED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    EXPIRED_TOKEN: 'EXPIRED_TOKEN',
    REFRESH_TOKEN_REQUIRED: 'REFRESH_TOKEN_REQUIRED',
    EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
    USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
    ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  },

  // Validation errors
  VALIDATION: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',
    VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  },

  // Business logic errors
  BUSINESS: {
    STORE_NOT_FOUND: 'STORE_NOT_FOUND',
    STORE_INACTIVE: 'STORE_INACTIVE',
    MENU_ITEM_NOT_FOUND: 'MENU_ITEM_NOT_FOUND',
    MENU_ITEM_UNAVAILABLE: 'MENU_ITEM_UNAVAILABLE',
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    ORDER_CANNOT_BE_CANCELLED: 'ORDER_CANNOT_BE_CANCELLED',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    MINIMUM_ORDER_NOT_MET: 'MINIMUM_ORDER_NOT_MET',
    MAXIMUM_ORDER_EXCEEDED: 'MAXIMUM_ORDER_EXCEEDED',
    INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
    STORE_CLOSED: 'STORE_CLOSED',
    DELIVERY_UNAVAILABLE: 'DELIVERY_UNAVAILABLE',
  },

  // Resource errors
  RESOURCE: {
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    FORBIDDEN: 'FORBIDDEN',
    UNAUTHORIZED: 'UNAUTHORIZED',
    CONFLICT: 'CONFLICT',
    GONE: 'GONE',
  },

  // System errors
  SYSTEM: {
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    MAINTENANCE_MODE: 'MAINTENANCE_MODE',
  },
} as const;

/**
 * All error codes as a union type for type safety
 */
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES][keyof typeof ERROR_CODES[keyof typeof ERROR_CODES]];

/**
 * Helper functions for common operations
 */

/**
 * Create pagination metadata from query parameters and total count
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Create standardized API success response
 */
export function createApiResponse<T>(
  data: T,
  meta?: PaginationMeta,
  message?: string
) {
  return {
    success: true as const,
    data,
    ...(meta && { pagination: meta }),
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create standardized API error response
 */
export function createApiErrorResponse(
  error: string,
  code: ErrorCode,
  details?: any[]
) {
  return {
    success: false as const,
    error,
    code,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create API list response with pagination
 */
export function createApiListResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  message?: string
): ApiListResponse<T> {
  return {
    success: true,
    data,
    pagination,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create API resource response for single items
 */
export function createApiResourceResponse<T>(
  data: T,
  message?: string
): ApiResourceResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Type guards for runtime type checking of branded types
 */

export function isUserId(value: unknown): value is UserEntity['id'] {
  try {
    UserIdSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isStoreId(value: unknown): value is StoreEntity['id'] {
  try {
    StoreIdSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isMenuItemId(value: unknown): value is MenuItemEntity['id'] {
  try {
    MenuItemIdSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isOrderId(value: unknown): value is OrderEntity['id'] {
  try {
    OrderIdSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Utility types for common patterns
 */

// Create a type for API list responses
export type ApiListResponse<T> = {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
  timestamp: string;
};

// Create a type for API single resource responses
export type ApiResourceResponse<T> = {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
};

// Create a type for API error responses
export type ApiErrorResponseType = {
  success: false;
  error: string;
  code: ErrorCode;
  details?: any[];
  timestamp: string;
};

// Entity creation data types (omit auto-generated fields)
export type CreateEntityData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

// Entity update data types (partial and exclude non-updatable fields)
export type UpdateEntityData<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// Partial except for specific keys (useful for required fields in updates)
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Price calculation utilities
 */

export function calculateSubtotal(
  items: Array<{ price: number; quantity: number }>
): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

export function calculateTax(subtotal: number): number {
  return Math.round(subtotal * BUSINESS_CONSTANTS.TAX_RATE * 100) / 100;
}

export function calculateServiceFee(subtotal: number): number {
  return Math.round(subtotal * BUSINESS_CONSTANTS.SERVICE_FEE_RATE * 100) / 100;
}

export function calculateTotal(
  subtotal: number,
  deliveryFee: number,
  tax?: number,
  serviceFee?: number
): number {
  const finalTax = tax ?? calculateTax(subtotal);
  const finalServiceFee = serviceFee ?? calculateServiceFee(subtotal);
  
  return Math.round((subtotal + deliveryFee + finalTax + finalServiceFee) * 100) / 100;
}

/**
 * Time utilities
 */

export function formatDeliveryTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

export function addMinutesToDate(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export function isWithinCancellationWindow(orderDate: Date): boolean {
  const now = new Date();
  const diffMinutes = (now.getTime() - orderDate.getTime()) / 60000;
  return diffMinutes <= BUSINESS_CONSTANTS.ORDER_CANCELLATION_WINDOW;
}

/**
 * Validation utilities
 */

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  return phoneRegex.test(phone);
}

export function validatePrice(price: number): boolean {
  return price >= BUSINESS_CONSTANTS.MIN_PRICE && 
         price <= BUSINESS_CONSTANTS.MAX_PRICE &&
         Math.round(price * 100) === price * 100; // Check for max 2 decimal places
}

/**
 * String utilities
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Array utilities
 */

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}
