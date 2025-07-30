/**
 * Unit tests for authentication middleware
 * 
 * Tests all authentication middleware functionality including:
 * - Basic authentication with Bearer tokens
 * - Role-based authorization
 * - Optional authentication
 * - Error handling and response formats
 * - Type safety and user data transformation
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware, createAuthMiddleware } from '../auth.middleware.js';
import { JWTService } from '../../domains/auth/services/jwt.service.js';
import { JWTAccessPayload, TokenVerificationResult } from '../../domains/auth/types/auth.types.js';
import {
  AccessTokenRequiredError,
  InvalidTokenError,
  ExpiredTokenError,
  InsufficientRoleError,
} from '@vibe/shared/errors';

/**
 * Mock JWT service for testing
 */
function createMockJWTService() {
  return {
    verifyAccessToken: mock.fn(),
    extractUserId: mock.fn(),
    generateAccessToken: mock.fn(),
    generateRefreshToken: mock.fn(),
    generateTokenPair: mock.fn(),
    verifyRefreshToken: mock.fn(),
    isTokenExpired: mock.fn(),
  } as any;
}

/**
 * Mock Express request object
 */
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    user: undefined,
    ...overrides,
  } as Request;
}

/**
 * Mock Express response object with spy functions
 */
function createMockResponse(): Response & {
  statusCode: number;
  jsonData: any;
  status: ReturnType<typeof mock.fn>;
  json: ReturnType<typeof mock.fn>;
} {
  const res = {
    statusCode: 200,
    jsonData: null,
    status: mock.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: mock.fn((data: any) => {
      res.jsonData = data;
      return res;
    }),
  };
  return res as any;
}

/**
 * Mock Express next function
 */
function createMockNext(): NextFunction & ReturnType<typeof mock.fn> {
  return mock.fn();
}

/**
 * Sample JWT payload for testing
 */
const sampleJWTPayload: JWTAccessPayload = {
  sub: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'CUSTOMER',
  firstName: 'Test',
  lastName: 'User',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  iss: 'vibe-food',
  aud: 'vibe-app',
};

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockJWTService: ReturnType<typeof createMockJWTService>;

  beforeEach(() => {
    mockJWTService = createMockJWTService();
    authMiddleware = new AuthMiddleware(mockJWTService);
  });

  describe('authenticate()', () => {
    it('should authenticate valid Bearer token and attach user to request', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const successResult: TokenVerificationResult<JWTAccessPayload> = {
        success: true,
        payload: sampleJWTPayload,
      };
      mockJWTService.verifyAccessToken.mock.mockImplementationOnce(() => successResult);

      const middleware = authMiddleware.authenticate();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(mockJWTService.verifyAccessToken.mock.calls.length, 1);
      assert.equal(mockJWTService.verifyAccessToken.mock.calls[0][0], 'valid-token');
      assert.equal(next.mock.calls.length, 1);
      
      assert(req.user);
      assert.equal(req.user.id, 'user-123');
      assert.equal(req.user.email, 'test@example.com');
      assert.equal(req.user.username, 'testuser');
      assert.equal(req.user.role, 'CUSTOMER');
      assert.equal(req.user.firstName, 'Test');
      assert.equal(req.user.lastName, 'User');
    });

    it('should return 401 when no Authorization header is provided', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.authenticate();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 401);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'ACCESS_TOKEN_REQUIRED');
      assert.equal(next.mock.calls.length, 0);
      assert.equal(mockJWTService.verifyAccessToken.mock.calls.length, 0);
    });

    it('should return 401 when Authorization header does not start with Bearer', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Basic some-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.authenticate();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 401);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'ACCESS_TOKEN_REQUIRED');
      assert.equal(next.mock.calls.length, 0);
    });

    it('should return 401 when Bearer token is empty', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer   ' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.authenticate();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 401);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'ACCESS_TOKEN_REQUIRED');
      assert.equal(next.mock.calls.length, 0);
    });

    it('should return 401 when token is expired', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer expired-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const expiredResult: TokenVerificationResult<never> = {
        success: false,
        error: 'expired',
        message: 'Token has expired',
      };
      mockJWTService.verifyAccessToken.mock.mockImplementationOnce(() => expiredResult);

      const middleware = authMiddleware.authenticate();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 401);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'EXPIRED_TOKEN');
      assert.equal(res.jsonData.error, 'Token has expired');
      assert.equal(next.mock.calls.length, 0);
    });

    it('should return 401 when token is invalid', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const invalidResult: TokenVerificationResult<never> = {
        success: false,
        error: 'invalid',
        message: 'Invalid token signature',
      };
      mockJWTService.verifyAccessToken.mock.mockImplementationOnce(() => invalidResult);

      const middleware = authMiddleware.authenticate();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 401);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'INVALID_TOKEN');
      assert.equal(res.jsonData.error, 'Invalid token signature');
      assert.equal(next.mock.calls.length, 0);
    });

    it('should return 401 when token is malformed', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer malformed-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const malformedResult: TokenVerificationResult<never> = {
        success: false,
        error: 'malformed',
        message: 'Token is malformed',
      };
      mockJWTService.verifyAccessToken.mock.mockImplementationOnce(() => malformedResult);

      const middleware = authMiddleware.authenticate();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 401);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'INVALID_TOKEN');
      assert.equal(res.jsonData.error, 'Token is malformed');
      assert.equal(next.mock.calls.length, 0);
    });

    it('should handle unexpected errors during token verification', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer some-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockJWTService.verifyAccessToken.mock.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const middleware = authMiddleware.authenticate();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 401);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'INVALID_TOKEN');
      assert.equal(next.mock.calls.length, 0);
    });
  });

  describe('authorize()', () => {
    it('should allow access when user has required role', () => {
      // Arrange
      const req = createMockRequest({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          role: 'ADMIN',
          firstName: 'Test',
          lastName: 'User',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.authorize(['ADMIN', 'STORE_OWNER']);

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(next.mock.calls.length, 1);
      assert.equal(res.status.mock.calls.length, 0);
    });

    it('should return 401 when user is not authenticated', () => {
      // Arrange
      const req = createMockRequest(); // No user attached
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.authorize(['ADMIN']);

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 401);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'ACCESS_TOKEN_REQUIRED');
      assert.equal(next.mock.calls.length, 0);
    });

    it('should return 403 when user does not have required role', () => {
      // Arrange
      const req = createMockRequest({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          role: 'CUSTOMER',
          firstName: 'Test',
          lastName: 'User',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.authorize(['ADMIN', 'STORE_OWNER']);

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 403);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'INSUFFICIENT_ROLE');
      assert(res.jsonData.error.includes('CUSTOMER'));
      assert.equal(next.mock.calls.length, 0);
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      // Arrange
      const req = createMockRequest({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          role: 'STORE_OWNER',
          firstName: 'Test',
          lastName: 'User',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.authorize(['ADMIN', 'STORE_OWNER']);

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(next.mock.calls.length, 1);
      assert.equal(res.status.mock.calls.length, 0);
    });

    it('should handle unexpected errors during authorization', () => {
      // Arrange - Create a user object that will cause an error when accessing role
      const req = createMockRequest({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          get role() {
            throw new Error('Unexpected error');
          },
          firstName: 'Test',
          lastName: 'User',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.authorize(['ADMIN']);

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(res.statusCode, 403);
      assert.equal(res.jsonData.success, false);
      assert.equal(res.jsonData.code, 'INSUFFICIENT_ROLE');
      assert.equal(next.mock.calls.length, 0);
    });
  });

  describe('optionalAuth()', () => {
    it('should attach user when valid token is provided', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const successResult: TokenVerificationResult<JWTAccessPayload> = {
        success: true,
        payload: sampleJWTPayload,
      };
      mockJWTService.verifyAccessToken.mock.mockImplementationOnce(() => successResult);

      const middleware = authMiddleware.optionalAuth();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(next.mock.calls.length, 1);
      assert.equal(res.status.mock.calls.length, 0);
      
      assert(req.user);
      assert.equal(req.user.id, 'user-123');
      assert.equal(req.user.email, 'test@example.com');
    });

    it('should continue without user when no token is provided', () => {
      // Arrange
      const req = createMockRequest(); // No authorization header
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.optionalAuth();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(next.mock.calls.length, 1);
      assert.equal(res.status.mock.calls.length, 0);
      assert.equal(req.user, undefined);
      assert.equal(mockJWTService.verifyAccessToken.mock.calls.length, 0);
    });

    it('should continue without user when token is invalid', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const invalidResult: TokenVerificationResult<never> = {
        success: false,
        error: 'invalid',
        message: 'Invalid token',
      };
      mockJWTService.verifyAccessToken.mock.mockImplementationOnce(() => invalidResult);

      const middleware = authMiddleware.optionalAuth();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(next.mock.calls.length, 1);
      assert.equal(res.status.mock.calls.length, 0);
      assert.equal(req.user, undefined);
    });

    it('should continue without user when token is expired', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer expired-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const expiredResult: TokenVerificationResult<never> = {
        success: false,
        error: 'expired',
        message: 'Token has expired',
      };
      mockJWTService.verifyAccessToken.mock.mockImplementationOnce(() => expiredResult);

      const middleware = authMiddleware.optionalAuth();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(next.mock.calls.length, 1);
      assert.equal(res.status.mock.calls.length, 0);
      assert.equal(req.user, undefined);
    });

    it('should continue without user when authorization header format is incorrect', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Basic some-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = authMiddleware.optionalAuth();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(next.mock.calls.length, 1);
      assert.equal(res.status.mock.calls.length, 0);
      assert.equal(req.user, undefined);
      assert.equal(mockJWTService.verifyAccessToken.mock.calls.length, 0);
    });

    it('should continue without user when token verification throws unexpected error', () => {
      // Arrange
      const req = createMockRequest({
        headers: { authorization: 'Bearer some-token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockJWTService.verifyAccessToken.mock.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const middleware = authMiddleware.optionalAuth();

      // Act
      middleware(req, res, next);

      // Assert
      assert.equal(next.mock.calls.length, 1);
      assert.equal(res.status.mock.calls.length, 0);
      assert.equal(req.user, undefined);
    });
  });

  describe('utility methods', () => {
    describe('extractUserIdFromHeader()', () => {
      it('should extract user ID from valid Bearer token', () => {
        // Arrange
        const authHeader = 'Bearer valid-token';
        mockJWTService.extractUserId.mock.mockImplementationOnce(() => 'user-123');

        // Act
        const userId = authMiddleware.extractUserIdFromHeader(authHeader);

        // Assert
        assert.equal(userId, 'user-123');
        assert.equal(mockJWTService.extractUserId.mock.calls.length, 1);
        assert.equal(mockJWTService.extractUserId.mock.calls[0][0], 'valid-token');
      });

      it('should return null for invalid authorization header format', () => {
        // Act
        const userId1 = authMiddleware.extractUserIdFromHeader('Basic token');
        const userId2 = authMiddleware.extractUserIdFromHeader(undefined);

        // Assert
        assert.equal(userId1, null);
        assert.equal(userId2, null);
        assert.equal(mockJWTService.extractUserId.mock.calls.length, 0);
      });
    });

    describe('isAuthenticated()', () => {
      it('should return true when user is attached to request', () => {
        // Arrange
        const req = createMockRequest({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            role: 'CUSTOMER',
            firstName: 'Test',
            lastName: 'User',
          },
        });

        // Act
        const isAuth = authMiddleware.isAuthenticated(req);

        // Assert
        assert.equal(isAuth, true);
      });

      it('should return false when user is not attached to request', () => {
        // Arrange
        const req = createMockRequest();

        // Act
        const isAuth = authMiddleware.isAuthenticated(req);

        // Assert
        assert.equal(isAuth, false);
      });
    });

    describe('hasRole()', () => {
      it('should return true when user has specified role', () => {
        // Arrange
        const req = createMockRequest({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            role: 'ADMIN',
            firstName: 'Test',
            lastName: 'User',
          },
        });

        // Act
        const hasRole = authMiddleware.hasRole(req, 'ADMIN');

        // Assert
        assert.equal(hasRole, true);
      });

      it('should return false when user does not have specified role', () => {
        // Arrange
        const req = createMockRequest({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            role: 'CUSTOMER',
            firstName: 'Test',
            lastName: 'User',
          },
        });

        // Act
        const hasRole = authMiddleware.hasRole(req, 'ADMIN');

        // Assert
        assert.equal(hasRole, false);
      });

      it('should return false when user is not authenticated', () => {
        // Arrange
        const req = createMockRequest();

        // Act
        const hasRole = authMiddleware.hasRole(req, 'ADMIN');

        // Assert
        assert.equal(hasRole, false);
      });
    });

    describe('hasAnyRole()', () => {
      it('should return true when user has one of the specified roles', () => {
        // Arrange
        const req = createMockRequest({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            role: 'STORE_OWNER',
            firstName: 'Test',
            lastName: 'User',
          },
        });

        // Act
        const hasAnyRole = authMiddleware.hasAnyRole(req, ['ADMIN', 'STORE_OWNER']);

        // Assert
        assert.equal(hasAnyRole, true);
      });

      it('should return false when user does not have any of the specified roles', () => {
        // Arrange
        const req = createMockRequest({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            role: 'CUSTOMER',
            firstName: 'Test',
            lastName: 'User',
          },
        });

        // Act
        const hasAnyRole = authMiddleware.hasAnyRole(req, ['ADMIN', 'STORE_OWNER']);

        // Assert
        assert.equal(hasAnyRole, false);
      });

      it('should return false when user is not authenticated', () => {
        // Arrange
        const req = createMockRequest();

        // Act
        const hasAnyRole = authMiddleware.hasAnyRole(req, ['ADMIN', 'STORE_OWNER']);

        // Assert
        assert.equal(hasAnyRole, false);
      });
    });
  });

  describe('createAuthMiddleware()', () => {
    it('should create AuthMiddleware instance with JWT service', () => {
      // Arrange
      const jwtService = createMockJWTService();

      // Act
      const middleware = createAuthMiddleware(jwtService as any);

      // Assert
      assert(middleware instanceof AuthMiddleware);
    });
  });
});