/**
 * Error handling utilities for the frontend
 * Following CLAUDE.md error handling patterns
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: any[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Parse error into user-friendly message
 * 
 * @param error - Error object
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof ValidationError) {
    return error.message;
  }
  
  if (error instanceof NetworkError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if error is a network-related error
 * 
 * @param error - Error object
 * @returns True if network error
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError || 
         (error instanceof Error && error.message.includes('fetch'));
}

/**
 * Check if error is a validation error
 * 
 * @param error - Error object
 * @returns True if validation error
 */
export function isValidationError(error: unknown): boolean {
  return error instanceof ValidationError ||
         (error instanceof ApiError && error.status === 400);
}

/**
 * Check if error is a not found error
 * 
 * @param error - Error object
 * @returns True if not found error
 */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/**
 * Create error logger with context
 * 
 * @param context - Context information
 * @returns Logger function
 */
export function createErrorLogger(context: string) {
  return (error: unknown, additional?: Record<string, any>) => {
    console.error(`[${context}] Error:`, error, additional);
  };
}