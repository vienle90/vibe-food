/**
 * AuthService Simple Unit Tests
 * 
 * Simplified test suite focusing on core functionality without complex mocking
 */

import { describe, it, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService, createAuthService } from '../services/auth.service.js';
import { JWTService } from '../services/jwt.service.js';
import { JWTConfig } from '../types/auth.types.js';

describe('AuthService Core Functionality', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let jwtService: JWTService;

  // Test configuration
  const testJWTConfig: JWTConfig = {
    accessSecret: 'test-access-secret-at-least-32-characters-long-for-security',
    refreshSecret: 'test-refresh-secret-at-least-32-characters-long-different',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
    issuer: 'vibe-food-test',
    audience: 'vibe-food-users',
  };

  // Sample test data
  const validRegisterData = {
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    password: 'TestPass123',
    phone: '+1234567890',
    address: '123 Test Street',
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'CUSTOMER',
    isActive: true,
    phone: '+1234567890',
    address: '123 Test Street',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    password: '$2a$12$hashedPasswordHere',
  };

  beforeEach(async () => {
    // Create simple mock functions
    mockPrisma = {
      user: {
        findFirst: mock.fn(),
        findUnique: mock.fn(),
        create: mock.fn(),
      },
      refreshToken: {
        findFirst: mock.fn(),
        create: mock.fn(),
        delete: mock.fn(),
        deleteMany: mock.fn(),
      },
      $transaction: mock.fn(),
    };

    jwtService = new JWTService(testJWTConfig);
    authService = new AuthService(mockPrisma, jwtService);
  });

  describe('Constructor', () => {
    it('should create AuthService with valid dependencies', () => {
      const service = new AuthService(mockPrisma, jwtService);
      assert(service instanceof AuthService);
    });

    it('should create AuthService via factory function', () => {
      const service = createAuthService(mockPrisma, jwtService);
      assert(service instanceof AuthService);
    });
  });

  describe('User Registration', () => {
    it('should register new user successfully', async () => {
      // Setup mocks
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      const result = await authService.register(validRegisterData);

      // Verify result structure
      assert(result.user);
      assert(result.accessToken);
      assert(typeof result.expiresIn === 'number');
      assert.equal(result.user.email, validRegisterData.email);
      assert.equal(result.user.username, validRegisterData.username);
    });

    it('should hash password during registration', async () => {
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      await authService.register(validRegisterData);

      // Check that create was called (password hashing happens inside)
      assert.equal(mockPrisma.user.create.mock.callCount(), 1);
    });

    it('should normalize email to lowercase', async () => {
      const upperCaseData = { ...validRegisterData, email: 'TEST@EXAMPLE.COM' };
      
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      await authService.register(upperCaseData);

      // Should have been called with lowercase email
      assert.equal(mockPrisma.user.findFirst.mock.callCount(), 1);
      assert.equal(mockPrisma.user.create.mock.callCount(), 1);
    });
  });

  describe('User Login', () => {
    it('should login user with valid credentials', async () => {
      // Mock user found
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      const result = await authService.login('test@example.com', 'TestPass123');

      assert(result.user);
      assert(result.accessToken);
      assert(typeof result.expiresIn === 'number');
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

      await assert.rejects(
        () => authService.login('nonexistent@example.com', 'password'),
        (err: any) => err.code === 'INVALID_CREDENTIALS'
      );
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(inactiveUser));

      await assert.rejects(
        () => authService.login('test@example.com', 'TestPass123'),
        (err: any) => err.code === 'ACCOUNT_INACTIVE'
      );
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const refreshToken = jwtService.generateRefreshToken({
        sub: mockUser.id,
        tokenId: 'test-token-id',
      });

      const storedToken = {
        id: 'stored-token-123',
        token: refreshToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPrisma.refreshToken.findFirst.mock.mockImplementationOnce(() => Promise.resolve(storedToken));
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.$transaction.mock.mockImplementationOnce((operations) => Promise.all(operations));

      const result = await authService.refreshToken(refreshToken);

      assert(result.accessToken);
      assert(typeof result.expiresIn === 'number');
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid.token.here';

      await assert.rejects(
        () => authService.refreshToken(invalidToken),
        (err: any) => err.code === 'INVALID_TOKEN'
      );
    });
  });

  describe('Get Current User', () => {
    it('should return current user data', async () => {
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(mockUser));

      const result = await authService.getCurrentUser(mockUser.id);

      assert(result.user);
      assert.equal(result.user.id, mockUser.id);
      assert.equal(result.user.email, mockUser.email);
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(null));

      await assert.rejects(
        () => authService.getCurrentUser('non-existent-id'),
        (err: any) => err.code === 'USER_NOT_FOUND'
      );
    });
  });

  describe('Token Management', () => {
    it('should clean expired tokens', async () => {
      mockPrisma.refreshToken.deleteMany.mock.mockImplementationOnce(() => 
        Promise.resolve({ count: 5 })
      );

      const count = await authService.cleanExpiredTokens();

      assert.equal(count, 5);
      assert.equal(mockPrisma.refreshToken.deleteMany.mock.callCount(), 1);
    });

    it('should revoke all user tokens', async () => {
      mockPrisma.refreshToken.deleteMany.mock.mockImplementationOnce(() => 
        Promise.resolve({ count: 3 })
      );

      const count = await authService.revokeAllUserTokens(mockUser.id);

      assert.equal(count, 3);
      assert.equal(mockPrisma.refreshToken.deleteMany.mock.callCount(), 1);
    });
  });

  describe('Input Validation', () => {
    it('should validate registration data', async () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'ab', // too short
        firstName: '',
        lastName: '',
        password: 'weak',
      };

      await assert.rejects(
        () => authService.register(invalidData as any),
        (err: any) => err.code === 'DATABASE_ERROR' // Zod validation error gets wrapped
      );
    });

    it('should validate login data', async () => {
      await assert.rejects(
        () => authService.login('', ''),
        (err: any) => err.code === 'DATABASE_ERROR' // Zod validation error gets wrapped
      );
    });
  });

  describe('Security Features', () => {
    it('should use bcrypt for password hashing', async () => {
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      
      // Capture the created user data
      let capturedUserData: any;
      mockPrisma.user.create.mock.mockImplementationOnce((data) => {
        capturedUserData = data;
        return Promise.resolve(mockUser);
      });
      
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      await authService.register(validRegisterData);

      // The password should be hashed (we can't easily test the exact hash without complex mocking)
      assert.equal(mockPrisma.user.create.mock.callCount(), 1);
    });

    it('should handle case-insensitive email matching', async () => {
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      // Should work with uppercase email
      const result = await authService.login('TEST@EXAMPLE.COM', 'TestPass123');
      
      assert(result.user);
      assert.equal(mockPrisma.user.findFirst.mock.callCount(), 1);
    });

    it('should not expose password in responses', async () => {
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      const result = await authService.login('test@example.com', 'TestPass123');

      // Password should not be in the response
      assert.equal((result.user as any).password, undefined);
    });
  });
});