/**
 * Custom error classes for the Vibe food ordering application.
 * 
 * Provides a hierarchy of error types for different scenarios:
 * - AppError: Base error class for operational errors
 * - ValidationError: Input validation failures (400)
 * - UnauthorizedError: Authentication failures (401)  
 * - ForbiddenError: Authorization failures (403)
 * - NotFoundError: Resource not found (404)
 * 
 * All errors include proper HTTP status codes, error codes for client handling,
 * and are marked as operational to distinguish from programming errors.
 */

/**
 * Base application error class
 * All operational errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public code: string;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

/**
 * Validation error for input validation failures
 * HTTP Status: 400 Bad Request
 */
export class ValidationError extends AppError {
  public readonly errors: any[];

  constructor(message: string = 'Validation failed', errors: any[] = []) {
    super(400, message, 'VALIDATION_ERROR');
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Convert error to JSON with validation details
   */
  override toJSON() {
    return {
      ...super.toJSON(),
      details: this.errors
    };
  }
}

/**
 * Unauthorized error for authentication failures
 * HTTP Status: 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden error for authorization failures
 * HTTP Status: 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, 'FORBIDDEN');
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not found error for missing resources
 * HTTP Status: 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Authentication-specific error classes
 */

/**
 * Invalid credentials error
 * Used for login failures - generic message for security
 */
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid credentials');
    this.code = 'INVALID_CREDENTIALS';
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

/**
 * Access token required error
 * Used when protected routes are accessed without valid token
 */
export class AccessTokenRequiredError extends UnauthorizedError {
  constructor() {
    super('Access token required');
    this.code = 'ACCESS_TOKEN_REQUIRED';
    Object.setPrototypeOf(this, AccessTokenRequiredError.prototype);
  }
}

/**
 * Invalid token error
 * Used when token is malformed or invalid
 */
export class InvalidTokenError extends UnauthorizedError {
  constructor(message: string = 'Invalid token') {
    super(message);
    this.code = 'INVALID_TOKEN';
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

/**
 * Expired token error
 * Used when token has expired
 */
export class ExpiredTokenError extends UnauthorizedError {
  constructor(message: string = 'Token has expired') {
    super(message);
    this.code = 'EXPIRED_TOKEN';
    Object.setPrototypeOf(this, ExpiredTokenError.prototype);
  }
}

/**
 * User already exists error
 * Used during registration when email/username is taken
 */
export class UserAlreadyExistsError extends ValidationError {
  constructor(field: 'email' | 'username', value: string) {
    const message = field === 'email' 
      ? 'Email address is already registered' 
      : 'Username is already taken';
    
    super(message, [
      {
        field,
        value,
        message,
        code: field === 'email' ? 'EMAIL_ALREADY_EXISTS' : 'USERNAME_ALREADY_EXISTS'
      }
    ]);
    
    this.code = field === 'email' ? 'EMAIL_ALREADY_EXISTS' : 'USERNAME_ALREADY_EXISTS';
    Object.setPrototypeOf(this, UserAlreadyExistsError.prototype);
  }
}

/**
 * User not found error  
 * Used when user doesn't exist in database
 */
export class UserNotFoundError extends NotFoundError {
  constructor(identifier?: string) {
    const message = identifier 
      ? `User with identifier '${identifier}' not found`
      : 'User not found';
    
    super(message);
    this.code = 'USER_NOT_FOUND';
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

/**
 * Account inactive error
 * Used when user account is deactivated
 */
export class AccountInactiveError extends ForbiddenError {
  constructor() {
    super('Account is inactive');
    this.code = 'ACCOUNT_INACTIVE';
    Object.setPrototypeOf(this, AccountInactiveError.prototype);
  }
}

/**
 * Insufficient role error
 * Used for role-based access control failures
 */
export class InsufficientRoleError extends ForbiddenError {
  constructor(requiredRole?: string | string[], currentRole?: string) {
    let message = 'Insufficient permissions for this operation';
    
    if (requiredRole && currentRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole;
      message = `This operation requires ${roles} role, but user has ${currentRole} role`;
    }
    
    super(message);
    this.code = 'INSUFFICIENT_ROLE';
    Object.setPrototypeOf(this, InsufficientRoleError.prototype);
  }
}

/**
 * Rate limit exceeded error
 * Used for rate limiting authentication endpoints
 */
export class RateLimitExceededError extends AppError {
  constructor(retryAfter?: number) {
    const message = retryAfter 
      ? `Rate limit exceeded. Try again in ${retryAfter} seconds`
      : 'Rate limit exceeded. Please try again later';
    
    super(429, message, 'RATE_LIMIT_EXCEEDED');
    Object.setPrototypeOf(this, RateLimitExceededError.prototype);
  }
}

/**
 * Database operation error
 * Used for database-related failures
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', originalError?: Error) {
    super(500, message, 'DATABASE_ERROR');
    
    // Store original error for debugging (not exposed to client)
    if (originalError && process.env.NODE_ENV === 'development' && originalError.stack) {
      this.stack = originalError.stack;
    }
    
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: Error): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Type guard to check if error is a validation error
 */
export function isValidationError(error: Error): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if error is an authentication error
 */
export function isAuthenticationError(error: Error): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

/**
 * Type guard to check if error is an authorization error
 */
export function isAuthorizationError(error: Error): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

/**
 * Utility function to create error response
 */
export function createErrorResponse(error: AppError) {
  return {
    success: false,
    error: error.message,
    code: error.code,
    timestamp: error.timestamp,
    ...(error instanceof ValidationError && { details: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
}

/**
 * Error factory functions for common scenarios
 */
export const ErrorFactory = {
  validation: (message: string, errors: any[] = []) => new ValidationError(message, errors),
  unauthorized: (message?: string) => new UnauthorizedError(message),
  forbidden: (message?: string) => new ForbiddenError(message),
  notFound: (message?: string) => new NotFoundError(message),
  invalidCredentials: () => new InvalidCredentialsError(),
  accessTokenRequired: () => new AccessTokenRequiredError(),
  invalidToken: (message?: string) => new InvalidTokenError(message),
  expiredToken: (message?: string) => new ExpiredTokenError(message),
  userAlreadyExists: (field: 'email' | 'username', value: string) => 
    new UserAlreadyExistsError(field, value),
  userNotFound: (identifier?: string) => new UserNotFoundError(identifier),
  accountInactive: () => new AccountInactiveError(),
  insufficientRole: (requiredRole?: string | string[], currentRole?: string) => 
    new InsufficientRoleError(requiredRole, currentRole),
  rateLimitExceeded: (retryAfter?: number) => new RateLimitExceededError(retryAfter),
  database: (message?: string, originalError?: Error) => new DatabaseError(message, originalError),
} as const;