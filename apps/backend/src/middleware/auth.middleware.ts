/**
 * Authentication middleware for the Vibe food ordering application.
 * 
 * Provides three types of authentication middleware:
 * 1. authenticate() - Basic authentication middleware (requires valid token)
 * 2. authorize(roles) - Role-based authorization middleware
 * 3. optionalAuth() - Optional authentication (doesn't fail if no token)
 * 
 * All middleware extends Express Request interface to include user property
 * and follows the security patterns from CLAUDE.md and PRP-002.
 */

import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../domains/auth/services/jwt.service.js';
import {
  AccessTokenRequiredError,
  InvalidTokenError,
  ExpiredTokenError,
  InsufficientRoleError,
  createErrorResponse,
} from '@vibe/shared';
import type { AuthenticatedUser } from '@vibe/shared';

/**
 * Extend Express Request interface to include user property
 * This allows downstream middleware and controllers to access authenticated user data
 */
declare global {
  namespace Express {
    interface Request {
      /** Authenticated user information (present only on authenticated requests) */
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication middleware class
 * 
 * Handles JWT token verification and user authentication for protected routes.
 * Uses dependency injection pattern with JWT service for testability.
 */
export class AuthMiddleware {
  constructor(private readonly jwtService: JWTService) {}

  /**
   * Basic authentication middleware
   * 
   * Extracts Bearer token from Authorization header, verifies it,
   * and attaches user data to req.user for downstream access.
   * 
   * @throws {AccessTokenRequiredError} When no token is provided
   * @throws {InvalidTokenError} When token is malformed or invalid
   * @throws {ExpiredTokenError} When token has expired
   * 
   * @returns Express middleware function
   */
  authenticate = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new AccessTokenRequiredError();
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!token.trim()) {
          throw new AccessTokenRequiredError();
        }

        // Verify token using JWT service
        const verificationResult = this.jwtService.verifyAccessToken(token);
        
        if (!verificationResult.success) {
          // Map JWT service errors to our error types
          switch (verificationResult.error) {
            case 'expired':
              throw new ExpiredTokenError(verificationResult.message);
            case 'malformed':
            case 'invalid':
              throw new InvalidTokenError(verificationResult.message);
            default:
              throw new InvalidTokenError('Token verification failed');
          }
        }

        // Transform JWT payload to AuthenticatedUser format
        const payload = verificationResult.payload;
        req.user = {
          id: payload.sub,
          email: payload.email,
          username: payload.username,
          role: payload.role,
          firstName: '',
          lastName: '',
        };

        next();
      } catch (error: unknown) {
        // Send consistent error response format
        if (error instanceof AccessTokenRequiredError || 
            error instanceof InvalidTokenError || 
            error instanceof ExpiredTokenError) {
          res.status(error.statusCode).json(createErrorResponse(error));
        } else {
          // Handle unexpected errors
          const genericError = new InvalidTokenError('Token verification failed');
          res.status(genericError.statusCode).json(createErrorResponse(genericError));
        }
      }
    };
  };

  /**
   * Role-based authorization middleware
   * 
   * Higher-order function that accepts allowed roles and returns middleware
   * that checks if the authenticated user has sufficient permissions.
   * 
   * @param allowedRoles - Array of roles that can access the route
   * @returns Express middleware function
   * 
   * @throws {AccessTokenRequiredError} When user is not authenticated
   * @throws {InsufficientRoleError} When user role is not allowed
   */
  authorize = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Check if user is authenticated first
        if (!req.user) {
          throw new AccessTokenRequiredError();
        }

        // Check if user role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
          throw new InsufficientRoleError(allowedRoles, req.user.role);
        }

        next();
      } catch (error: unknown) {
        // Send consistent error response format
        if (error instanceof AccessTokenRequiredError) {
          res.status(error.statusCode).json(createErrorResponse(error));
        } else if (error instanceof InsufficientRoleError) {
          res.status(error.statusCode).json(createErrorResponse(error));
        } else {
          // Handle unexpected errors
          const genericError = new InsufficientRoleError();
          res.status(genericError.statusCode).json(createErrorResponse(genericError));
        }
      }
    };
  };

  /**
   * Optional authentication middleware
   * 
   * Attempts to authenticate the user but doesn't fail if no token is provided
   * or if the token is invalid. Useful for routes that enhance functionality
   * with authentication but don't require it.
   * 
   * If a valid token is present, user data is attached to req.user.
   * If no token or invalid token, req.user remains undefined and processing continues.
   * 
   * @returns Express middleware function
   */
  optionalAuth = () => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          // No token provided - continue without authentication
          return next();
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!token.trim()) {
          // Empty token - continue without authentication
          return next();
        }

        // Attempt to verify token
        const verificationResult = this.jwtService.verifyAccessToken(token);
        
        if (verificationResult.success) {
          // Valid token - attach user data
          const payload = verificationResult.payload;
          req.user = {
            id: payload.sub,
            email: payload.email,
            username: payload.username,
            role: payload.role,
            firstName: '',
            lastName: '',
          };
        }
        
        // Continue processing regardless of token validity
        // This allows routes to work for both authenticated and unauthenticated users
        next();
      } catch (error: unknown) {
        // Silently fail for optional authentication
        // Continue processing without user data
        next();
      }
    };
  };

  /**
   * Extract user ID from token without full verification
   * 
   * Utility method for logging and debugging purposes.
   * Should not be used for authorization decisions.
   * 
   * @param authHeader - Authorization header value
   * @returns User ID or null if extraction fails
   */
  extractUserIdFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return this.jwtService.extractUserId(token);
  }

  /**
   * Check if request has authenticated user
   * 
   * Type guard function to check if req.user is defined
   * 
   * @param req - Express request object
   * @returns True if user is authenticated
   */
  isAuthenticated(req: Request): req is Request & { user: AuthenticatedUser } {
    return req.user !== undefined;
  }

  /**
   * Check if authenticated user has specific role
   * 
   * @param req - Express request object
   * @param role - Role to check for
   * @returns True if user has the specified role
   */
  hasRole(req: Request, role: string): boolean {
    return req.user?.role === role;
  }

  /**
   * Check if authenticated user has any of the specified roles
   * 
   * @param req - Express request object
   * @param roles - Array of roles to check for
   * @returns True if user has any of the specified roles
   */
  hasAnyRole(req: Request, roles: string[]): boolean {
    return req.user ? roles.includes(req.user.role) : false;
  }
}

/**
 * Factory function to create authentication middleware
 * 
 * Uses dependency injection pattern for testability and clean separation of concerns.
 * 
 * @param jwtService - JWT service instance for token operations
 * @returns Configured AuthMiddleware instance
 */
export function createAuthMiddleware(jwtService: JWTService): AuthMiddleware {
  return new AuthMiddleware(jwtService);
}

/**
 * Type definitions for middleware functions
 */
export type AuthenticateMiddleware = ReturnType<AuthMiddleware['authenticate']>;
export type AuthorizeMiddleware = ReturnType<AuthMiddleware['authorize']>;
export type OptionalAuthMiddleware = ReturnType<AuthMiddleware['optionalAuth']>;