/**
 * Input validation middleware for the Vibe food ordering application.
 * 
 * Provides Zod-based validation middleware for request body and query parameters.
 * Follows the validation patterns from CLAUDE.md and implements security-first
 * approach by validating ALL external data at system boundaries.
 * 
 * Key features:
 * - Type-safe validation using Zod schemas
 * - Automatic request transformation with validated data
 * - Detailed error reporting for validation failures
 * - Consistent error response format
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ValidationError,
  createErrorResponse,
} from '@vibe/shared';

/**
 * Validate request body using Zod schema
 * 
 * Higher-order function that accepts a Zod schema and returns Express middleware
 * that validates the request body. On successful validation, the parsed data
 * replaces req.body with properly typed values.
 * 
 * @template T - Zod schema type
 * @param schema - Zod schema for validation
 * @returns Express middleware function
 * 
 * @throws {ValidationError} When validation fails with detailed error information
 * 
 * @example
 * ```typescript
 * // Usage in routes
 * router.post('/register', 
 *   validateBody(registerRequestSchema), 
 *   authController.register
 * );
 * ```
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and validate request body
      // This will throw ZodError if validation fails
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod validation errors to our ValidationError format
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'received' in err ? err.received : undefined,
          expected: 'expected' in err ? err.expected : undefined,
        }));

        const validationError = new ValidationError(
          'Request body validation failed',
          validationErrors
        );

        res.status(validationError.statusCode).json(createErrorResponse(validationError));
      } else {
        // Handle unexpected errors during validation
        const genericError = new ValidationError('Invalid request body format');
        res.status(genericError.statusCode).json(createErrorResponse(genericError));
      }
    }
  };
}

/**
 * Validate request query parameters using Zod schema
 * 
 * Higher-order function that accepts a Zod schema and returns Express middleware
 * that validates the request query parameters. On successful validation, the parsed
 * data replaces req.query with properly typed values.
 * 
 * Note: Query parameters are always strings from Express, so schemas should handle
 * string-to-type conversion (e.g., z.coerce.number() for numeric parameters).
 * 
 * @template T - Zod schema type
 * @param schema - Zod schema for validation
 * @returns Express middleware function
 * 
 * @throws {ValidationError} When validation fails with detailed error information
 * 
 * @example
 * ```typescript
 * // Usage in routes
 * const getStoresQuerySchema = z.object({
 *   category: z.string().optional(),
 *   page: z.coerce.number().int().min(1).default(1),
 *   limit: z.coerce.number().int().min(1).max(100).default(20),
 * });
 * 
 * router.get('/stores', 
 *   validateQuery(getStoresQuerySchema), 
 *   storeController.getStores
 * );
 * ```
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and validate query parameters
      // This will throw ZodError if validation fails
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod validation errors to our ValidationError format
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'received' in err ? err.received : undefined,
          expected: 'expected' in err ? err.expected : undefined,
        }));

        const validationError = new ValidationError(
          'Query parameters validation failed',
          validationErrors
        );

        res.status(validationError.statusCode).json(createErrorResponse(validationError));
      } else {
        // Handle unexpected errors during validation
        const genericError = new ValidationError('Invalid query parameters format');
        res.status(genericError.statusCode).json(createErrorResponse(genericError));
      }
    }
  };
}

/**
 * Validate request parameters (URL params) using Zod schema
 * 
 * Higher-order function that accepts a Zod schema and returns Express middleware
 * that validates the request URL parameters. On successful validation, the parsed
 * data replaces req.params with properly typed values.
 * 
 * @template T - Zod schema type
 * @param schema - Zod schema for validation
 * @returns Express middleware function
 * 
 * @throws {ValidationError} When validation fails with detailed error information
 * 
 * @example
 * ```typescript
 * // Usage in routes
 * const storeParamsSchema = z.object({
 *   storeId: z.string().cuid(),
 * });
 * 
 * router.get('/stores/:storeId', 
 *   validateParams(storeParamsSchema), 
 *   storeController.getStore
 * );
 * ```
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and validate URL parameters
      // This will throw ZodError if validation fails
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod validation errors to our ValidationError format
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'received' in err ? err.received : undefined,
          expected: 'expected' in err ? err.expected : undefined,
        }));

        const validationError = new ValidationError(
          'URL parameters validation failed',
          validationErrors
        );

        res.status(validationError.statusCode).json(createErrorResponse(validationError));
      } else {
        // Handle unexpected errors during validation
        const genericError = new ValidationError('Invalid URL parameters format');
        res.status(genericError.statusCode).json(createErrorResponse(genericError));
      }
    }
  };
}

/**
 * Validate request headers using Zod schema
 * 
 * Higher-order function that accepts a Zod schema and returns Express middleware
 * that validates specific request headers. Useful for validating custom headers
 * like API keys, content types, or other application-specific headers.
 * 
 * @template T - Zod schema type
 * @param schema - Zod schema for validation
 * @returns Express middleware function
 * 
 * @throws {ValidationError} When validation fails with detailed error information
 * 
 * @example
 * ```typescript
 * // Usage in routes
 * const apiKeyHeaderSchema = z.object({
 *   'x-api-key': z.string().min(1),
 *   'content-type': z.literal('application/json').optional(),
 * });
 * 
 * router.post('/webhook', 
 *   validateHeaders(apiKeyHeaderSchema), 
 *   webhookController.handle
 * );
 * ```
 */
export function validateHeaders<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and validate request headers
      // Note: Headers are case-insensitive in HTTP, but Express converts them to lowercase
      schema.parse(req.headers);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod validation errors to our ValidationError format
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'received' in err ? err.received : undefined,
          expected: 'expected' in err ? err.expected : undefined,
        }));

        const validationError = new ValidationError(
          'Request headers validation failed',
          validationErrors
        );

        res.status(validationError.statusCode).json(createErrorResponse(validationError));
      } else {
        // Handle unexpected errors during validation
        const genericError = new ValidationError('Invalid request headers format');
        res.status(genericError.statusCode).json(createErrorResponse(genericError));
      }
    }
  };
}

/**
 * Comprehensive request validation middleware
 * 
 * Validates multiple parts of the request (body, query, params) using separate schemas.
 * Useful for complex endpoints that need validation across multiple request components.
 * 
 * @param schemas - Object containing schemas for different request parts
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * router.put('/stores/:storeId/menu/:itemId',
 *   validateRequest({
 *     params: z.object({
 *       storeId: z.string().cuid(),
 *       itemId: z.string().cuid(),
 *     }),
 *     body: updateMenuItemSchema,
 *     query: z.object({
 *       force: z.coerce.boolean().default(false),
 *     }),
 *   }),
 *   menuController.updateMenuItem
 * );
 * ```
 */
export function validateRequest(schemas: {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  headers?: z.ZodTypeAny;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: any[] = [];

      // Validate body if schema provided
      if (schemas.body) {
        try {
          req.body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              section: 'body',
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
              received: 'received' in err ? err.received : undefined,
              expected: 'expected' in err ? err.expected : undefined,
            })));
          }
        }
      }

      // Validate query if schema provided
      if (schemas.query) {
        try {
          req.query = schemas.query.parse(req.query);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              section: 'query',
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
              received: 'received' in err ? err.received : undefined,
              expected: 'expected' in err ? err.expected : undefined,
            })));
          }
        }
      }

      // Validate params if schema provided
      if (schemas.params) {
        try {
          req.params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              section: 'params',
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
              received: 'received' in err ? err.received : undefined,
              expected: 'expected' in err ? err.expected : undefined,
            })));
          }
        }
      }

      // Validate headers if schema provided
      if (schemas.headers) {
        try {
          schemas.headers.parse(req.headers);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              section: 'headers',
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
              received: 'received' in err ? err.received : undefined,
              expected: 'expected' in err ? err.expected : undefined,
            })));
          }
        }
      }

      // If any validation errors occurred, return them
      if (errors.length > 0) {
        const validationError = new ValidationError(
          'Request validation failed',
          errors
        );
        res.status(validationError.statusCode).json(createErrorResponse(validationError));
        return;
      }

      next();
    } catch (error) {
      // Handle unexpected errors during validation
      const genericError = new ValidationError('Request validation failed');
      res.status(genericError.statusCode).json(createErrorResponse(genericError));
    }
  };
}

/**
 * Sanitize request data middleware
 * 
 * Applies basic sanitization to request data to prevent common injection attacks.
 * This is a security layer that works alongside validation.
 * 
 * @returns Express middleware function
 */
export function sanitizeRequest() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Sanitize string values in body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }

      // Sanitize string values in query
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
      }

      next();
    } catch (error) {
      // If sanitization fails, continue with original data
      // This is a defensive measure and should not break the request
      next();
    }
  };
}

/**
 * Recursively sanitize an object's string values
 * 
 * @private
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    // Basic sanitization - remove null bytes and trim whitespace
    return obj.replace(/\0/g, '').trim();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both key and value
      const sanitizedKey = typeof key === 'string' ? key.replace(/\0/g, '').trim() : key;
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Type helpers for validated requests
 */
export type ValidatedRequest<
  TBody = any,
  TQuery = any,
  TParams = any
> = Request & {
  body: TBody;
  query: TQuery;
  params: TParams;
};

/**
 * Utility type to infer validated request types from Zod schemas
 */
export type InferValidatedRequest<T extends {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}> = Request<
  T['params'] extends z.ZodTypeAny ? z.infer<T['params']> : any,
  any,
  T['body'] extends z.ZodTypeAny ? z.infer<T['body']> : any,
  T['query'] extends z.ZodTypeAny ? z.infer<T['query']> : any
>;