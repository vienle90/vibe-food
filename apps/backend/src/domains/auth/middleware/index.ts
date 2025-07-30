/**
 * Authentication Middleware Public API
 * 
 * This module exports all middleware functions and classes for the authentication domain.
 * Provides a clean interface for importing authentication and validation middleware
 * throughout the application.
 */

// Authentication middleware
export { AuthMiddleware, createAuthMiddleware } from './auth.middleware.js';

// Validation middleware
export {
  validateBody,
  validateQuery,
  validateParams,
  validateCustom,
  requireJsonContentType,
  limitBodySize,
  createValidationError,
  createTypedValidation,
  // Common schemas
  userIdParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  // Types
  type ValidatedRequest,
} from './validation.middleware.js';