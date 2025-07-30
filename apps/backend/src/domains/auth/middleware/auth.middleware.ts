/**
 * Authentication Middleware Implementation
 * 
 * This module provides middleware functions for authentication and authorization:
 * - authenticate: Verify JWT access tokens and attach user to request
 * - authorize: Check user roles for protected operations
 * - optionalAuth: Attempt authentication without throwing errors
 * 
 * Follows the security requirements from PRP-002 and implements proper
 * error handling as specified in CLAUDE.md.
 */

import type { Request, Response, NextFunction } from 'express';
import { 
  AccessTokenRequiredError, 
  InvalidTokenError, 
  ExpiredTokenError,
  InsufficientRoleError
} from '@vibe/shared';
import { JWTService } from '../services/jwt.service.js';
import type { JWTConfig } from '../types/auth.types.js';

/**
 * AuthMiddleware class provides authentication and authorization middleware
 * 
 * Key features:
 * - JWT token verification with proper error handling
 * - Role-based authorization with flexible role checking
 * - Optional authentication for routes that enhance with auth but don't require it
 * - Consistent error responses across all auth failures
 */
export class AuthMiddleware {
  private readonly jwtService: JWTService;

  /**
   * Initialize authentication middleware with JWT service
   * 
   * @param jwtConfig - JWT configuration for token verification
   */
  constructor(jwtConfig: JWTConfig) {
    this.jwtService = new JWTService(jwtConfig);
  }

  /**
   * Basic authentication middleware
   * 
   * Extracts Bearer token from Authorization header, verifies it,
   * and attaches decoded user data to req.user for downstream access.
   * 
   * @param req - Express request object
   * @param res - Express response object  
   * @param next - Express next function
   * @throws AccessTokenRequiredError for missing tokens
   * @throws InvalidTokenError for invalid tokens
   * @throws ExpiredTokenError for expired tokens
   */
  authenticate = (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Extract Bearer token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AccessTokenRequiredError();
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      if (!token) {
        throw new AccessTokenRequiredError();
      }

      // Verify token using JWT service
      const verificationResult = this.jwtService.verifyAccessToken(token);
      
      if (!verificationResult.success) {
        if (verificationResult.error === 'expired') {
          throw new ExpiredTokenError('Access token has expired');
        }
        throw new InvalidTokenError('Invalid access token');
      }

      // Attach user data to request for downstream middleware
      req.user = {
        id: verificationResult.payload.sub,
        email: verificationResult.payload.email,
        username: verificationResult.payload.username,
        role: verificationResult.payload.role,
        firstName: verificationResult.payload.firstName || '',
        lastName: verificationResult.payload.lastName || '',
      };

      next();
    } catch (error) {
      // Pass authentication errors to Express error handler
      next(error);
    }
  };

  /**
   * Role-based authorization middleware factory
   * 
   * Creates middleware that checks if authenticated user has required role(s).
   * Must be used after authenticate middleware.
   * 
   * @param allowedRoles - Single role or array of roles that are allowed
   * @returns Express middleware function
   * @throws AccessTokenRequiredError if user is not authenticated
   * @throws InsufficientRoleError if user doesn't have required role
   */
  authorize = (allowedRoles: string | string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      try {
        // Check if user is authenticated
        if (!req.user) {
          throw new AccessTokenRequiredError();
        }

        // Normalize roles to array for consistent checking
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        // Check if user role is in allowed roles
        if (!rolesArray.includes(req.user.role)) {
          throw new InsufficientRoleError(allowedRoles, req.user.role);
        }

        next();
      } catch (error) {
        // Pass authorization errors to Express error handler
        next(error);
      }
    };
  };

  /**
   * Optional authentication middleware
   * 
   * Attempts token verification without throwing errors for missing/invalid tokens.
   * Silently fails for missing or invalid tokens and continues processing.
   * Attaches user data if valid token is present.
   * 
   * Useful for routes that enhance functionality with auth but don't require it.
   * 
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Extract Bearer token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided - continue without authentication
        return next();
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      if (!token) {
        // Empty token - continue without authentication
        return next();
      }

      // Verify token using JWT service
      const verificationResult = this.jwtService.verifyAccessToken(token);
      
      if (verificationResult.success) {
        // Valid token - attach user data to request
        req.user = {
          id: verificationResult.payload.sub,
          email: verificationResult.payload.email,
          username: verificationResult.payload.username,
          role: verificationResult.payload.role,
          firstName: verificationResult.payload.firstName || '',
          lastName: verificationResult.payload.lastName || '',
        };
      }

      // Continue processing regardless of token validity
      next();
    } catch (error) {
      // Silently ignore authentication errors and continue
      next();
    }
  };

  /**
   * Admin-only authorization middleware
   * 
   * Convenience method for admin-only routes.
   * 
   * @returns Express middleware function that requires ADMIN role
   */
  requireAdmin = this.authorize('ADMIN');

  /**
   * Store owner or admin authorization middleware
   * 
   * Convenience method for store management routes.
   * 
   * @returns Express middleware function that requires STORE_OWNER or ADMIN role
   */
  requireStoreOwnerOrAdmin = this.authorize(['STORE_OWNER', 'ADMIN']);

  /**
   * Any authenticated user middleware
   * 
   * Convenience method for routes that require any authenticated user.
   * 
   * @returns Express middleware function that requires authentication
   */
  requireAuth = this.authenticate;
}

/**
 * Factory function to create authentication middleware with dependencies
 * This follows the dependency injection pattern recommended in CLAUDE.md
 * 
 * @param jwtConfig - JWT configuration for token verification
 * @returns Configured AuthMiddleware instance
 */
export function createAuthMiddleware(jwtConfig: JWTConfig): AuthMiddleware {
  return new AuthMiddleware(jwtConfig);
}