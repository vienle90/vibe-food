/**
 * @vibe/shared - Shared types, utilities, and environment validation
 * 
 * This package provides shared TypeScript types, Zod validation schemas,
 * and utility functions used across the Vibe food ordering application.
 * 
 * Organized exports for optimal tree-shaking and developer experience:
 * - Core types: Branded types, enums, and base interfaces
 * - Entity types: Database entity interfaces matching Prisma schema
 * - API types: Request/response contracts for all endpoints
 * - Authentication types: JWT payloads and auth-related schemas
 * - Validation schemas: Zod schemas for runtime validation
 * - Utilities: Helper functions, constants, and type guards
 * - Error classes: Standardized error handling
 * - Environment validation: Type-safe environment variable access
 */

// Core types and schemas - branded types, enums, utilities
export * from './types/core';

// Database entity interfaces - matches Prisma schema exactly
export * from './types/entities';

// API request/response contracts - all endpoint interfaces
export * from './types/api';

// Authentication types and schemas - JWT, login, registration
export * from './types/auth';

// Validation schemas - Zod schemas for runtime validation
export * from './schemas/validation';

// Utilities and constants - helper functions, business rules, error codes
export * from './utils/types';

// Error classes - standardized error handling
export * from './errors/index';

// Environment validation - type-safe environment variable access
export * from './env';

// Re-export commonly used Zod utilities for convenience
export { z } from 'zod';

/**
 * Convenience exports for commonly used types
 * Helps reduce import verbosity in consuming applications
 */
export type {
  // Core branded types (from core.ts)
  UserId,
  StoreId,
  MenuItemId,
  OrderId,
  OrderItemId,
  Email,
  Phone,
  Price,
  Rating,
  
  // Enums (from core.ts)
  UserRole,
  StoreCategory,
  OrderStatus,
  PaymentMethod,
  
  // API response types (from core.ts)
  PaginationMeta,
  ApiErrorResponse,
  
  // Base types (from core.ts)
  TimestampFields,
} from './types/core';

export type {
  // Entity types (from entities.ts)
  UserEntity,
  StoreEntity,
  MenuItemEntity,
  OrderEntity,
  OrderItemEntity,
  PublicUser,
  StoreWithDetails,
  OrderWithDetails,
  CartItem,
  Cart,
  
  // Utility types (from entities.ts)
  CreateUserData,
  CreateStoreData,
  CreateMenuItemData,
  CreateOrderData,
  UpdateUserData,
  UpdateStoreData,
  UpdateMenuItemData,
  UpdateOrderData,
} from './types/entities';

export type {
  // Utility types (from utils/types.ts)
  CreateEntityData,
  UpdateEntityData,
  ApiListResponse,
  ApiResourceResponse,
  ErrorCode,
} from './utils/types';

export type {
  // API request types (from api.ts)
  GetStoresQuery,
  GetStoresResponse,
} from './types/api';

export type {
  // Authentication types (from auth.ts)
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from './types/auth';

export type {
  // JWT types (from core.ts)
  JwtAccessPayload,
  JwtRefreshPayload,
} from './types/core';

export type {
  // Validation input types (from validation.ts)
  PaginationInput,
  SortingInput,
  SearchInput,
  ListQueryInput,
  RegisterUserInput,
  LoginUserInput,
  CreateOrderInput,
  UpdateOrderStatusInput,
} from './schemas/validation';

/**
 * Convenience re-exports for validation schemas
 * Provides easy access to commonly used schemas
 */
export {
  validationSchemas,
  createValidator,
  safeValidate,
  validateInput,
} from './schemas/validation';

/**
 * Convenience re-exports for business constants and utilities
 */
export {
  BUSINESS_CONSTANTS,
  ERROR_CODES,
  createPaginationMeta,
  createApiResponse,
  createApiErrorResponse,
  isUserId,
  isStoreId,
  isMenuItemId,
  isOrderId,
  calculateSubtotal,
  calculateTax,
  calculateTotal,
  formatDeliveryTime,
  validateEmail,
  validatePhone,
  validatePrice,
} from './utils/types';

/**
 * Convenience re-exports for error classes
 */
export {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  InvalidCredentialsError,
  UserNotFoundError,
  ErrorFactory,
  isOperationalError,
  isValidationError,
  createErrorResponse,
} from './errors/index';

/**
 * Environment utilities
 */
export {
  env,
  validateEnv,
  envUtils,
  envSchema,
} from './env';
