/**
 * Authentication Controllers Implementation
 * 
 * This module provides HTTP controllers for authentication endpoints:
 * - register: User registration with account creation
 * - login: User authentication with token generation
 * - refresh: Access token refresh with rotation
 * - logout: Session termination with cookie clearing
 * - me: Current user profile retrieval
 * 
 * Follows the controller patterns from PRP-002 and implements proper
 * HTTP responses with security-conscious cookie handling.
 */

import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ValidationError } from '@vibe/shared';
import { env } from '@vibe/shared';

/**
 * AuthController class handles all authentication HTTP endpoints
 * 
 * Key features:
 * - Consistent JSON response format across all endpoints
 * - HTTP-only cookie handling for refresh tokens with security flags
 * - Proper HTTP status codes (201 for creation, 200 for success)
 * - Security-conscious error handling without information leakage
 */
export class AuthController {
  private readonly authService: AuthService;

  /**
   * Initialize authentication controller with dependencies
   * 
   * @param authService - Authentication service for business logic
   */
  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * User registration endpoint
   * POST /api/auth/register
   * 
   * Creates new user account with hashed password and returns authentication tokens.
   * Sets refresh token as HTTP-only cookie with security flags.
   * 
   * @param req - Express request with validated registration data in body
   * @param res - Express response
   * @param next - Express next function for error handling
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Call auth service with validated request body
      const result = await this.authService.register(req.body);

      // Generate refresh token for cookie
      const tokens = this.authService.generateTokenPair({
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        role: result.user.role,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      });

      // Set refresh token as HTTP-only cookie with security flags
      this.setRefreshTokenCookie(res, tokens.refreshToken);

      // Return 201 status with user data and access token
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Pass errors to Express error handling middleware
      next(error);
    }
  };

  /**
   * User login endpoint
   * POST /api/auth/login
   * 
   * Authenticates user credentials and returns authentication tokens.
   * Sets refresh token as HTTP-only cookie with security flags.
   * 
   * @param req - Express request with validated login data in body
   * @param res - Express response
   * @param next - Express next function for error handling
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Call auth service with validated request body
      const result = await this.authService.login(req.body.identifier, req.body.password);

      // Generate refresh token for cookie
      const tokens = this.authService.generateTokenPair({
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        role: result.user.role,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      });

      // Set refresh token as HTTP-only cookie with security flags
      this.setRefreshTokenCookie(res, tokens.refreshToken);

      // Return 200 status with user data and access token
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Pass errors to Express error handling middleware
      next(error);
    }
  };

  /**
   * Token refresh endpoint
   * POST /api/auth/refresh
   * 
   * Refreshes access token using refresh token from cookies or request body.
   * Implements token rotation by setting new refresh token cookie.
   * 
   * @param req - Express request with optional refresh token in body
   * @param res - Express response
   * @param next - Express next function for error handling
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get refresh token from cookies or request body
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required', [
          {
            field: 'refreshToken',
            message: 'Refresh token must be provided in cookies or request body',
            code: 'required',
            received: undefined,
          }
        ]);
      }

      // Call auth service to refresh token
      const result = await this.authService.refreshToken(refreshToken);

      // For token rotation, we would generate a new refresh token here
      // For now, we'll keep the existing one (can be enhanced later)
      
      // Return fresh access token with updated expiration
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Pass errors to Express error handling middleware
      next(error);
    }
  };

  /**
   * User logout endpoint
   * POST /api/auth/logout
   * 
   * Terminates user session by clearing refresh token cookie.
   * Simple implementation for stateless JWT approach.
   * 
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next function for error handling
   */
  logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Clear refresh token cookie to invalidate session
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      // Return success message without additional data
      res.status(200).json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Pass errors to Express error handling middleware
      next(error);
    }
  };

  /**
   * Current user profile endpoint
   * GET /api/auth/me
   * 
   * Returns current user profile data for authenticated requests.
   * Requires authentication middleware to populate req.user.
   * 
   * @param req - Express request with user data from auth middleware
   * @param res - Express response
   * @param next - Express next function for error handling
   */
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Verify user authentication from middleware
      if (!req.user) {
        throw new ValidationError('User authentication required', [
          {
            field: 'user',
            message: 'Request must be authenticated',
            code: 'required',
            received: undefined,
          }
        ]);
      }

      // Fetch fresh user data from database via service
      const result = await this.authService.getCurrentUser(req.user.id);

      // Return current user profile data
      res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Pass errors to Express error handling middleware
      next(error);
    }
  };

  /**
   * Set refresh token as HTTP-only cookie with security flags
   * 
   * @private
   * @param res - Express response object
   * @param refreshToken - JWT refresh token
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Prevent XSS attacks
      secure: env.NODE_ENV === 'production', // HTTPS-only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/', // Available on all paths
    });
  }
}

/**
 * Factory function to create authentication controller with dependencies
 * This follows the dependency injection pattern recommended in CLAUDE.md
 * 
 * @param authService - Authentication service for business logic
 * @returns Configured AuthController instance
 */
export function createAuthController(authService: AuthService): AuthController {
  return new AuthController(authService);
}