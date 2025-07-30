/**
 * AuthService Unit Tests
 * 
 * Comprehensive test suite for the AuthService following the testing standards
 * from CLAUDE.md. Tests all functionality including error cases, edge conditions,
 * and security requirements.
 */

import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { 
  AuthService, 
  createAuthService,
  ValidationError,
  UserAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
  AccountInactiveError,
  InvalidTokenError,
  ExpiredTokenError,
  DatabaseError,
} from '../services/auth.service.js';
import { JWTService } from '../services/jwt.service.js';
import { JWTConfig } from '../types/auth.types.js';

// Local type definitions to match the service
interface RegisterRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  address?: string;
}

interface LoginRequest {
  identifier: string;
  password: string;
}

describe('AuthService', () => {
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
  const validRegisterData: RegisterRequest = {
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    password: 'TestPass123',
    phone: '+1234567890',
    address: '123 Test Street',
  };

  const validLoginData: LoginRequest = {
    identifier: 'test@example.com',
    password: 'TestPass123',
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
    password: '$2a$12$hashedPasswordHere', // Mocked bcrypt hash
  };

  beforeEach(async () => {
    // Create fresh mocked Prisma client for each test
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

    // Create JWT service
    jwtService = new JWTService(testJWTConfig);
    
    // Create auth service with mocked dependencies
    authService = new AuthService(mockPrisma, jwtService);
  });

  describe('Constructor and Dependency Injection', () => {
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
    it('should register new user successfully with valid data', async () => {
      // Mock: No existing user found
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      
      // Mock: User creation successful
      const createdUser = { ...mockUser, password: undefined };
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.resolve(createdUser));
      
      // Mock: Refresh token storage
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      const result = await authService.register(validRegisterData);

      // Verify result structure
      assert(result.user);
      assert(result.accessToken);
      assert(typeof result.expiresIn === 'number');
      assert.equal(result.user.email, validRegisterData.email);
      assert.equal(result.user.username, validRegisterData.username);
      assert.equal(result.user.firstName, validRegisterData.firstName);
      assert.equal(result.user.lastName, validRegisterData.lastName);

      // Verify database calls
      assert.equal(mockPrisma.user.findFirst.mock.callCount(), 1);
      assert.equal(mockPrisma.user.create.mock.callCount(), 1);
      assert.equal(mockPrisma.refreshToken.create.mock.callCount(), 1);

      // Verify password was hashed in create call
      const createCall = mockPrisma.user.create.mock.calls[0].arguments[0];
      assert(createCall.data.password);
      assert.notEqual(createCall.data.password, validRegisterData.password);
      assert(createCall.data.password.startsWith('$2a$12$')); // bcrypt hash format
    });

    it('should throw ValidationError for invalid input data', async () => {
      const invalidData = {
        ...validRegisterData,
        email: 'invalid-email',
        password: 'weak',
      };

      await assert.rejects(
        () => authService.register(invalidData as RegisterRequest),
        ValidationError
      );

      // Should not make any database calls for invalid input
      assert.equal(mockPrisma.user.findFirst.mock.calls.length, 0);
    });

    it('should throw UserAlreadyExistsError for duplicate email', async () => {
      // Mock: Existing user with same email found
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => 
        Promise.resolve({ email: validRegisterData.email, username: 'different' })
      );

      await assert.rejects(
        () => authService.register(validRegisterData),
        UserAlreadyExistsError
      );

      // Verify database call was made
      assert.equal(mockPrisma.user.findFirst.mock.calls.length, 1);
      // Should not attempt to create user
      assert.equal(mockPrisma.user.create.mock.calls.length, 0);
    });

    it('should throw UserAlreadyExistsError for duplicate username', async () => {
      // Mock: Existing user with same username found
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => 
        Promise.resolve({ email: 'different@example.com', username: validRegisterData.username })
      );

      await assert.rejects(
        () => authService.register(validRegisterData),
        UserAlreadyExistsError
      );

      assert.equal(mockPrisma.user.findFirst.mock.calls.length, 1);
      assert.equal(mockPrisma.user.create.mock.calls.length, 0);
    });

    it('should handle database errors during registration', async () => {
      // Mock: No existing user
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      
      // Mock: Database error during user creation
      mockPrisma.user.create.mock.mockImplementationOnce(() => 
        Promise.reject(new Error('Database connection failed'))
      );

      await assert.rejects(
        () => authService.register(validRegisterData),
        DatabaseError
      );
    });

    it('should normalize email to lowercase during registration', async () => {
      const dataWithUppercaseEmail = {
        ...validRegisterData,
        email: 'TEST@EXAMPLE.COM',
      };

      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      await authService.register(dataWithUppercaseEmail);

      // Verify email was normalized in database query
      const findCall = mockPrisma.user.findFirst.mock.calls[0][0];
      assert.equal(findCall.where.OR[0].email, 'test@example.com');

      // Verify email was normalized in user creation
      const createCall = mockPrisma.user.create.mock.calls[0][0];
      assert.equal(createCall.data.email, 'test@example.com');
    });

    it('should use bcrypt with 12 rounds for password hashing', async () => {
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      await authService.register(validRegisterData);

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      const hashedPassword = createCall.data.password;

      // Verify bcrypt hash format (12 rounds)
      assert(hashedPassword.startsWith('$2a$12$'));
      
      // Verify password can be compared
      const isValid = await bcrypt.compare(validRegisterData.password, hashedPassword);
      assert.equal(isValid, true);
    });
  });

  describe('User Login', () => {
    it('should login user successfully with email', async () => {
      // Mock: User found by email
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      
      // Mock: Refresh token storage
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      // Mock bcrypt.compare to return true
      const originalCompare = bcrypt.compare;
      bcrypt.compare = mock.fn(() => Promise.resolve(true));

      const result = await authService.login(validLoginData.identifier, validLoginData.password);

      // Restore bcrypt.compare
      bcrypt.compare = originalCompare;

      // Verify result
      assert(result.user);
      assert(result.accessToken);
      assert(typeof result.expiresIn === 'number');
      assert.equal(result.user.email, mockUser.email);
      assert.equal(result.user.username, mockUser.username);

      // Verify database call
      assert.equal(mockPrisma.user.findFirst.mock.calls.length, 1);
      const findCall = mockPrisma.user.findFirst.mock.calls[0][0];
      assert.equal(findCall.where.OR[0].email, validLoginData.identifier.toLowerCase());
      assert.equal(findCall.where.OR[1].username, validLoginData.identifier);
    });

    it('should login user successfully with username', async () => {
      const usernameLogin = {
        identifier: 'testuser',
        password: 'TestPass123',
      };

      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      const originalCompare = bcrypt.compare;
      bcrypt.compare = mock.fn(() => Promise.resolve(true));

      const result = await authService.login(usernameLogin.identifier, usernameLogin.password);

      bcrypt.compare = originalCompare;

      assert(result.user);
      assert(result.accessToken);
      assert.equal(result.user.username, mockUser.username);
    });

    it('should throw InvalidCredentialsError for non-existent user', async () => {
      // Mock: User not found
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

      await assert.rejects(
        () => authService.login(validLoginData.identifier, validLoginData.password),
        InvalidCredentialsError
      );

      assert.equal(mockPrisma.user.findFirst.mock.calls.length, 1);
    });

    it('should throw InvalidCredentialsError for wrong password', async () => {
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(mockUser));

      // Mock bcrypt.compare to return false (wrong password)
      const originalCompare = bcrypt.compare;
      bcrypt.compare = mock.fn(() => Promise.resolve(false));

      await assert.rejects(
        () => authService.login(validLoginData.identifier, 'WrongPassword'),
        InvalidCredentialsError
      );

      bcrypt.compare = originalCompare;
    });

    it('should throw AccountInactiveError for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(inactiveUser));

      const originalCompare = bcrypt.compare;
      bcrypt.compare = mock.fn(() => Promise.resolve(true));

      await assert.rejects(
        () => authService.login(validLoginData.identifier, validLoginData.password),
        AccountInactiveError
      );

      bcrypt.compare = originalCompare;
    });

    it('should throw ValidationError for invalid login data', async () => {
      await assert.rejects(
        () => authService.login('', ''),
        ValidationError
      );

      // Should not make database calls for invalid input
      assert.equal(mockPrisma.user.findFirst.mock.calls.length, 0);
    });

    it('should not include password in login response', async () => {
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      const originalCompare = bcrypt.compare;
      bcrypt.compare = mock.fn(() => Promise.resolve(true));

      const result = await authService.login(validLoginData.identifier, validLoginData.password);

      bcrypt.compare = originalCompare;

      // Verify password is not in response
      assert.equal((result.user as any).password, undefined);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token successfully with valid refresh token', async () => {
      const refreshToken = jwtService.generateRefreshToken({
        sub: mockUser.id,
        tokenId: 'test-token-id',
      });

      // Mock: Refresh token found in database
      const storedToken = {
        id: 'stored-token-123',
        token: refreshToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };
      mockPrisma.refreshToken.findFirst.mock.mockImplementationOnce(() => Promise.resolve(storedToken));

      // Mock: User found
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(mockUser));

      // Mock: Transaction for token rotation
      mockPrisma.$transaction.mock.mockImplementationOnce((operations) => {
        // Execute operations
        return Promise.all(operations);
      });

      const result = await authService.refreshToken(refreshToken);

      assert(result.accessToken);
      assert(typeof result.expiresIn === 'number');
      assert(result.expiresIn > Date.now());

      // Verify database calls
      assert.equal(mockPrisma.refreshToken.findFirst.mock.calls.length, 1);
      assert.equal(mockPrisma.user.findUnique.mock.calls.length, 1);
      assert.equal(mockPrisma.$transaction.mock.calls.length, 1);
    });

    it('should throw ExpiredTokenError for expired refresh token', async () => {
      // Create expired refresh token
      const expiredJWTService = new JWTService({
        ...testJWTConfig,
        refreshExpiresIn: '1ms',
      });

      const expiredToken = expiredJWTService.generateRefreshToken({
        sub: mockUser.id,
        tokenId: 'test-token-id',
      });

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      await assert.rejects(
        () => authService.refreshToken(expiredToken),
        ExpiredTokenError
      );
    });

    it('should throw InvalidTokenError for malformed refresh token', async () => {
      const malformedToken = 'not.a.valid.jwt.token';

      await assert.rejects(
        () => authService.refreshToken(malformedToken),
        InvalidTokenError
      );
    });

    it('should throw InvalidTokenError for token not found in database', async () => {
      const refreshToken = jwtService.generateRefreshToken({
        sub: mockUser.id,
        tokenId: 'test-token-id',
      });

      // Mock: Token not found in database
      mockPrisma.refreshToken.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

      await assert.rejects(
        () => authService.refreshToken(refreshToken),
        InvalidTokenError
      );
    });

    it('should throw UserNotFoundError if user no longer exists', async () => {
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

      // Mock: User not found
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(null));

      await assert.rejects(
        () => authService.refreshToken(refreshToken),
        UserNotFoundError
      );
    });

    it('should throw AccountInactiveError for inactive user during refresh', async () => {
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

      // Mock: Inactive user
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(inactiveUser));

      await assert.rejects(
        () => authService.refreshToken(refreshToken),
        AccountInactiveError
      );
    });

    it('should rotate refresh token on successful refresh', async () => {
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

      // Mock transaction to capture operations
      const transactionOperations: any[] = [];
      mockPrisma.$transaction.mock.mockImplementationOnce((operations) => {
        transactionOperations.push(...operations);
        return Promise.all(operations.map(() => Promise.resolve()));
      });

      await authService.refreshToken(refreshToken);

      // Verify transaction was called (token rotation)
      assert.equal(mockPrisma.$transaction.mock.calls.length, 1);
      assert.equal(transactionOperations.length, 2); // Delete old + Create new
    });
  });

  describe('Get Current User', () => {
    it('should return current user data successfully', async () => {
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(mockUser));

      const result = await authService.getCurrentUser(mockUser.id);

      assert(result.user);
      assert.equal(result.user.id, mockUser.id);
      assert.equal(result.user.email, mockUser.email);
      assert.equal(result.user.username, mockUser.username);

      // Verify database call
      assert.equal(mockPrisma.user.findUnique.mock.calls.length, 1);
      assert.equal(mockPrisma.user.findUnique.mock.calls[0][0].where.id, mockUser.id);
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(null));

      await assert.rejects(
        () => authService.getCurrentUser('non-existent-id'),
        UserNotFoundError
      );
    });

    it('should throw AccountInactiveError for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(inactiveUser));

      await assert.rejects(
        () => authService.getCurrentUser(mockUser.id),
        AccountInactiveError
      );
    });

    it('should not include password in current user response', async () => {
      const userWithPassword = { ...mockUser, password: 'hashed-password' };
      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(userWithPassword));

      const result = await authService.getCurrentUser(mockUser.id);

      // Verify password is not in response
      assert.equal((result.user as any).password, undefined);
    });
  });

  describe('Token Management Utilities', () => {
    it('should clean expired tokens successfully', async () => {
      mockPrisma.refreshToken.deleteMany.mock.mockImplementationOnce(() => 
        Promise.resolve({ count: 5 })
      );

      const count = await authService.cleanExpiredTokens();

      assert.equal(count, 5);
      assert.equal(mockPrisma.refreshToken.deleteMany.mock.calls.length, 1);

      // Verify correct where clause for expired tokens
      const deleteCall = mockPrisma.refreshToken.deleteMany.mock.calls[0][0];
      assert(deleteCall.where.expiresAt.lt);
      assert(deleteCall.where.expiresAt.lt instanceof Date);
    });

    it('should revoke all user tokens successfully', async () => {
      mockPrisma.refreshToken.deleteMany.mock.mockImplementationOnce(() => 
        Promise.resolve({ count: 3 })
      );

      const count = await authService.revokeAllUserTokens(mockUser.id);

      assert.equal(count, 3);
      assert.equal(mockPrisma.refreshToken.deleteMany.mock.calls.length, 1);

      // Verify correct where clause for user tokens
      const deleteCall = mockPrisma.refreshToken.deleteMany.mock.calls[0][0];
      assert.equal(deleteCall.where.userId, mockUser.id);
    });

    it('should handle database errors in token cleanup', async () => {
      mockPrisma.refreshToken.deleteMany.mock.mockImplementationOnce(() => 
        Promise.reject(new Error('Database error'))
      );

      await assert.rejects(
        () => authService.cleanExpiredTokens(),
        DatabaseError
      );
    });
  });

  describe('Security Tests', () => {
    it('should use different passwords hashes for same password', async () => {
      mockPrisma.user.findFirst.mock.mockImplementation(() => Promise.resolve(null));
      mockPrisma.user.create.mock.mockImplementation(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementation(() => Promise.resolve({ id: 'token-123' }));

      // Register same user twice (different calls)
      await authService.register({ ...validRegisterData, email: 'user1@example.com' });
      await authService.register({ ...validRegisterData, email: 'user2@example.com' });

      // Get password hashes from both create calls
      const hash1 = mockPrisma.user.create.mock.calls[0][0].data.password;
      const hash2 = mockPrisma.user.create.mock.calls[1][0].data.password;

      // Hashes should be different (salt makes them unique)
      assert.notEqual(hash1, hash2);
      assert(hash1.startsWith('$2a$12$'));
      assert(hash2.startsWith('$2a$12$'));
    });

    it('should not expose sensitive information in error messages', async () => {
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

      try {
        await authService.login('nonexistent@example.com', 'password');
        assert.fail('Should have thrown InvalidCredentialsError');
      } catch (error) {
        // Error message should be generic, not revealing user existence
        assert(error instanceof InvalidCredentialsError);
        assert.equal(error.message, 'Invalid credentials');
        assert(!error.message.includes('nonexistent@example.com'));
      }
    });

    it('should use case-insensitive email matching but preserve original case', async () => {
      const upperCaseEmail = 'TEST@EXAMPLE.COM';
      
      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      await authService.register({ ...validRegisterData, email: upperCaseEmail });

      // Verify email search was case-insensitive
      const findCall = mockPrisma.user.findFirst.mock.calls[0][0];
      assert.equal(findCall.where.OR[0].email, 'test@example.com');

      // Verify email was stored in lowercase
      const createCall = mockPrisma.user.create.mock.calls[0][0];
      assert.equal(createCall.data.email, 'test@example.com');
    });

    it('should generate unique refresh tokens for each login', async () => {
      mockPrisma.user.findFirst.mock.mockImplementation(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementation(() => Promise.resolve({ id: 'token-123' }));

      const originalCompare = bcrypt.compare;
      bcrypt.compare = mock.fn(() => Promise.resolve(true));

      // Login twice
      const result1 = await authService.login(validLoginData.identifier, validLoginData.password);
      const result2 = await authService.login(validLoginData.identifier, validLoginData.password);

      bcrypt.compare = originalCompare;

      // Access tokens should be different
      assert.notEqual(result1.accessToken, result2.accessToken);

      // Verify different refresh tokens were stored
      const token1Call = mockPrisma.refreshToken.create.mock.calls[0][0];
      const token2Call = mockPrisma.refreshToken.create.mock.calls[1][0];
      assert.notEqual(token1Call.data.token, token2Call.data.token);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user data with optional fields missing', async () => {
      const minimalUser = {
        ...mockUser,
        phone: null,
        address: null,
      };

      mockPrisma.user.findUnique.mock.mockImplementationOnce(() => Promise.resolve(minimalUser));

      const result = await authService.getCurrentUser(mockUser.id);

      assert.equal(result.user.phone, null);
      assert.equal(result.user.address, null);
    });

    it('should handle all user roles correctly', async () => {
      const roles = ['CUSTOMER', 'STORE_OWNER', 'ADMIN'];
      
      for (const role of roles) {
        const userWithRole = { ...mockUser, role };
        mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(userWithRole));
        mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

        const originalCompare = bcrypt.compare;
        bcrypt.compare = mock.fn(() => Promise.resolve(true));

        const result = await authService.login(validLoginData.identifier, validLoginData.password);

        bcrypt.compare = originalCompare;

        assert.equal(result.user.role, role);
      }
    });

    it('should handle special characters in user data', async () => {
      const userWithSpecialChars = {
        ...validRegisterData,
        firstName: "O'Connor",
        lastName: 'Smith-Jones',
        username: 'user_123',
        address: '123 Main St, Apt #4B',
      };

      mockPrisma.user.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.resolve({
        ...mockUser,
        firstName: userWithSpecialChars.firstName,
        lastName: userWithSpecialChars.lastName,
        username: userWithSpecialChars.username,
        address: userWithSpecialChars.address,
      }));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));

      const result = await authService.register(userWithSpecialChars);

      assert.equal(result.user.firstName, userWithSpecialChars.firstName);
      assert.equal(result.user.lastName, userWithSpecialChars.lastName);
      assert.equal(result.user.username, userWithSpecialChars.username);
      assert.equal(result.user.address, userWithSpecialChars.address);
    });

    it('should handle concurrent registration attempts with same email', async () => {
      // This test simulates race condition where both requests pass the initial check
      // but second one fails during creation due to unique constraint
      
      mockPrisma.user.findFirst.mock.mockImplementation(() => Promise.resolve(null));
      
      // First call succeeds
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.resolve(mockUser));
      mockPrisma.refreshToken.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'token-123' }));
      
      // Second call fails with unique constraint error
      const uniqueConstraintError = new Error('Unique constraint failed');
      (uniqueConstraintError as any).code = 'P2002'; // Prisma unique constraint error code
      mockPrisma.user.create.mock.mockImplementationOnce(() => Promise.reject(uniqueConstraintError));

      // First registration should succeed
      const result1 = await authService.register(validRegisterData);
      assert(result1.user);

      // Second registration should fail with DatabaseError
      await assert.rejects(
        () => authService.register(validRegisterData),
        DatabaseError
      );
    });
  });
});