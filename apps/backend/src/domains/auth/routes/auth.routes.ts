/**
 * Authentication Routes Implementation
 * 
 * This module provides route configuration for authentication endpoints:
 * - POST /register - User registration
 * - POST /login - User authentication  
 * - POST /refresh - Token refresh
 * - POST /logout - Session termination
 * - GET /me - Current user profile
 * 
 * Follows the route factory pattern from PRP-002 with proper middleware
 * chains and dependency injection for clean separation and testability.
 */

import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { 
  registerRequestSchema, 
  loginRequestSchema,
  updateProfileRequestSchema
} from '@vibe/shared';
import { env } from '@vibe/shared';
import { createAuthService } from '../services/auth.service.js';
import { createJWTService } from '../services/jwt.service.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { createAuthMiddleware, validateBody } from '../middleware/index.js';
import type { JWTConfig } from '../types/auth.types.js';

/**
 * Authentication routes factory function
 * 
 * Creates a configured router with all authentication endpoints, middleware chains,
 * and proper dependency injection. This pattern allows for clean separation of
 * concerns and easier testing.
 * 
 * @param prisma - Prisma client for database operations
 * @returns Configured Express router ready for mounting
 */
export function createAuthRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // Create JWT configuration from environment variables
  const jwtConfig: JWTConfig = {
    accessSecret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'vibe-food-api',
    audience: 'vibe-food-app',
  };

  // Initialize services and middleware with dependency injection
  const jwtService = createJWTService(jwtConfig);
  const authService = createAuthService(prisma, jwtService);
  const authController = createAuthController(authService);
  const authMiddleware = createAuthMiddleware(jwtConfig);

  // Public authentication routes
  
  /**
   * User registration endpoint
   * POST /register
   * 
   * Middleware chain:
   * 1. validateBody - Validate registration data with Zod schema
   * 2. authController.register - Create user account and return tokens
   */
  router.post('/register', 
    validateBody(registerRequestSchema),
    authController.register
  );

  /**
   * User login endpoint
   * POST /login
   * 
   * Middleware chain:
   * 1. validateBody - Validate login credentials with Zod schema
   * 2. authController.login - Authenticate user and return tokens
   */
  router.post('/login',
    validateBody(loginRequestSchema),
    authController.login
  );

  /**
   * Token refresh endpoint
   * POST /refresh
   * 
   * Accepts refresh token from cookies or request body.
   * No validation middleware needed as controller handles both cases.
   * 
   * Middleware chain:
   * 1. authController.refresh - Refresh access token with rotation
   */
  router.post('/refresh',
    authController.refresh
  );

  /**
   * User logout endpoint
   * POST /logout
   * 
   * Clears refresh token cookie to terminate session.
   * No authentication required as it's a cleanup operation.
   * 
   * Middleware chain:
   * 1. authController.logout - Clear refresh token cookie
   */
  router.post('/logout',
    authController.logout
  );

  // Protected authentication routes
  
  /**
   * Current user profile endpoint
   * GET /me
   * 
   * Returns current user profile data for authenticated requests.
   * 
   * Middleware chain:
   * 1. authMiddleware.authenticate - Verify JWT token and attach user to request
   * 2. authController.me - Return current user profile
   */
  router.get('/me',
    authMiddleware.authenticate,
    authController.me
  );

  /**
   * Update user profile endpoint
   * PUT /profile
   * 
   * Updates current user's profile information (phone and address).
   * 
   * Middleware chain:
   * 1. authMiddleware.authenticate - Verify JWT token and attach user to request
   * 2. validateBody - Validate update data with Zod schema
   * 3. authController.updateProfile - Update user profile and return updated data
   */
  router.put('/profile',
    authMiddleware.authenticate,
    validateBody(updateProfileRequestSchema),
    authController.updateProfile
  );

  // Future protected routes can be added here with appropriate middleware chains

  /**
   * Example: Change password endpoint (for future implementation)
   * POST /change-password
   * 
   * router.post('/change-password',
   *   authMiddleware.authenticate,
   *   validateBody(changePasswordSchema),
   *   authController.changePassword
   * );
   */

  /**
   * Example: Admin-only route (for future implementation)
   * GET /admin/users
   * 
   * router.get('/admin/users',
   *   authMiddleware.authenticate,
   *   authMiddleware.requireAdmin,
   *   adminController.getUsers
   * );
   */

  /**
   * Example: Store owner route (for future implementation)
   * GET /store/orders
   * 
   * router.get('/store/orders',
   *   authMiddleware.authenticate,
   *   authMiddleware.requireStoreOwnerOrAdmin,
   *   storeController.getOrders
   * );
   */

  return router;
}

/**
 * Route configuration helper for different authentication scenarios
 * 
 * This object provides common middleware chain configurations that can be
 * reused across different route modules for consistency.
 */
export const AuthRouteConfig = {
  /**
   * Public route configuration
   * No authentication required
   */
  public: [],

  /**
   * Authenticated route configuration
   * Requires valid JWT access token
   */
  authenticated: ['authenticate'],

  /**
   * Admin-only route configuration
   * Requires authentication and ADMIN role
   */
  adminOnly: ['authenticate', 'requireAdmin'],

  /**
   * Store owner or admin route configuration
   * Requires authentication and STORE_OWNER or ADMIN role
   */
  storeOwnerOrAdmin: ['authenticate', 'requireStoreOwnerOrAdmin'],

  /**
   * Optional authentication configuration
   * Enhances functionality if authenticated but doesn't require it
   */
  optionalAuth: ['optionalAuth'],
} as const;

/**
 * Utility function to apply authentication middleware based on route type
 * 
 * @param router - Express router instance
 * @param authMiddleware - Authentication middleware instance
 * @param routeType - Type of route protection required
 * @returns Array of middleware functions
 */
export function getAuthMiddleware(
  authMiddleware: ReturnType<typeof createAuthMiddleware>,
  routeType: keyof typeof AuthRouteConfig
) {
  const middlewareNames = AuthRouteConfig[routeType];
  
  return middlewareNames.map(name => {
    switch (name) {
      case 'authenticate':
        return authMiddleware.authenticate;
      case 'requireAdmin':
        return authMiddleware.requireAdmin;
      case 'requireStoreOwnerOrAdmin':
        return authMiddleware.requireStoreOwnerOrAdmin;
      case 'optionalAuth':
        return authMiddleware.optionalAuth;
      default:
        throw new Error(`Unknown middleware: ${name}`);
    }
  });
}

/**
 * Route mounting helper for consistent API structure
 * 
 * @param router - Main application router
 * @param authRoutes - Authentication routes
 * @param prefix - Route prefix (default: '/auth')
 */
export function mountAuthRoutes(
  router: Router, 
  authRoutes: Router, 
  prefix: string = '/auth'
): void {
  router.use(prefix, authRoutes);
}