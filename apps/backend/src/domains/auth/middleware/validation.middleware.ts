/**
 * Validation Middleware Implementation
 * 
 * This module provides middleware functions for input validation using Zod schemas:
 * - validateBody: Validate request body against Zod schema
 * - validateQuery: Validate query parameters against Zod schema
 * - validateParams: Validate route parameters against Zod schema
 * 
 * Follows the validation requirements from CLAUDE.md and implements proper
 * error handling with detailed validation error messages.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@vibe/shared';

/**
 * Higher-order function to create body validation middleware
 * 
 * Parses and validates request body data in-place, ensuring downstream 
 * handlers receive validated, typed data. Transforms req.body to match
 * the schema type.
 * 
 * @param schema - Zod schema for validation
 * @returns Express middleware function with proper typing
 * @throws ValidationError for invalid data with detailed error information
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Parse and validate request body in-place
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      // Convert Zod validation errors to application ValidationError
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Request body validation failed',
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: (err as any).received,
          }))
        );
        next(validationError);
      } else {
        // Pass through other errors
        next(error);
      }
    }
  };
}

/**
 * Higher-order function to create query parameter validation middleware
 * 
 * Parses and validates query parameters, transforming string values to
 * appropriate types (numbers, booleans, etc.) as defined in the schema.
 * 
 * @param schema - Zod schema for validation
 * @returns Express middleware function with proper typing
 * @throws ValidationError for invalid query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Parse and validate query parameters in-place
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      // Convert Zod validation errors to application ValidationError
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Query parameter validation failed',
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: (err as any).received,
          }))
        );
        next(validationError);
      } else {
        // Pass through other errors
        next(error);
      }
    }
  };
}

/**
 * Higher-order function to create route parameter validation middleware
 * 
 * Validates route parameters (e.g., :id in /users/:id) against the schema.
 * Useful for validating IDs, ensuring they meet format requirements.
 * 
 * @param schema - Zod schema for validation
 * @returns Express middleware function with proper typing
 * @throws ValidationError for invalid route parameters
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Parse and validate route parameters in-place
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      // Convert Zod validation errors to application ValidationError
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Route parameter validation failed',
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: (err as any).received,
          }))
        );
        next(validationError);
      } else {
        // Pass through other errors
        next(error);
      }
    }
  };
}

/**
 * Higher-order function to create custom validation middleware
 * 
 * Allows validation of any part of the request object using a custom
 * validation function. Useful for complex validation scenarios that
 * require access to multiple parts of the request.
 * 
 * @param validator - Custom validation function that throws ValidationError
 * @returns Express middleware function
 */
export function validateCustom(
  validator: (req: Request) => void | Promise<void>
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await validator(req);
      next();
    } catch (error) {
      // Pass validation errors to Express error handler
      next(error);
    }
  };
}

/**
 * Middleware to validate that request has Content-Type: application/json
 * 
 * Useful for endpoints that require JSON body to prevent issues with
 * form-encoded or other content types.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @throws ValidationError if Content-Type is not application/json
 */
export function requireJsonContentType(
  req: Request, 
  _res: Response, 
  next: NextFunction
): void {
  const contentType = req.get('Content-Type');
  
  if (!contentType || !contentType.includes('application/json')) {
    const error = new ValidationError(
      'Content-Type must be application/json',
      [
        {
          field: 'Content-Type',
          message: 'Expected application/json',
          code: 'invalid_type',
          received: contentType || 'undefined',
        }
      ]
    );
    return next(error);
  }
  
  next();
}

/**
 * Middleware to limit request body size
 * 
 * Provides additional validation for request body size beyond Express's
 * built-in limit. Useful for specific endpoints that need stricter limits.
 * 
 * @param maxSizeBytes - Maximum allowed body size in bytes
 * @returns Express middleware function
 */
export function limitBodySize(maxSizeBytes: number) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      const error = new ValidationError(
        `Request body too large. Maximum size is ${maxSizeBytes} bytes`,
        [
          {
            field: 'Content-Length',
            message: `Body size ${contentLength} exceeds limit of ${maxSizeBytes} bytes`,
            code: 'too_big',
            received: contentLength,
          }
        ]
      );
      return next(error);
    }
    
    next();
  };
}

/**
 * Common validation schemas for authentication endpoints
 * These can be imported and used directly with the validation middleware
 */

/**
 * Schema for validating user ID parameters
 */
export const userIdParamSchema = z.object({
  id: z.string().cuid('Invalid user ID format'),
});

/**
 * Schema for validating pagination query parameters
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Schema for validating search query parameters
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

/**
 * Utility function to create a validation error with custom message
 * 
 * @param message - Error message
 * @param field - Field that failed validation
 * @param received - Value that was received
 * @returns ValidationError instance
 */
export function createValidationError(
  message: string,
  field: string,
  received: any
): ValidationError {
  return new ValidationError(message, [
    {
      field,
      message,
      code: 'custom_validation',
      received,
    }
  ]);
}

/**
 * Type-safe validation middleware factory with better TypeScript inference
 * 
 * This is an advanced version that provides better type inference for
 * the validated request object in downstream middleware.
 */
export interface ValidatedRequest<
  TBody = any,
  TParams extends Record<string, string> = any,
  TQuery extends Record<string, any> = any
> extends Request<TParams, any, TBody, TQuery> {
  body: TBody;
  params: TParams;
  query: TQuery;
}

/**
 * Create typed validation middleware that infers types from schemas
 * 
 * @param schemas - Object containing body, params, and/or query schemas
 * @returns Typed middleware function
 */
export function createTypedValidation<
  TBodySchema extends z.ZodTypeAny = z.ZodAny,
  TParamsSchema extends z.ZodTypeAny = z.ZodAny,
  TQuerySchema extends z.ZodTypeAny = z.ZodAny
>(schemas: {
  body?: TBodySchema;
  params?: TParamsSchema;
  query?: TQuerySchema;
}) {
  return [
    ...(schemas.params ? [validateParams(schemas.params)] : []),
    ...(schemas.query ? [validateQuery(schemas.query)] : []),
    ...(schemas.body ? [validateBody(schemas.body)] : []),
  ];
}