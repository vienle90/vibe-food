/**
 * Authentication Service Implementation
 * 
 * This service handles all authentication operations including user registration,
 * login, token refresh, and user profile management. It follows the security
 * requirements from the PRP and implements proper error handling as specified
 * in CLAUDE.md.
 * 
 * Key Features:
 * - User registration with email/username validation and password hashing
 * - Login with email or username support
 * - JWT token generation and refresh token rotation
 * - Comprehensive input validation using Zod schemas
 * - Custom error handling with appropriate HTTP status codes
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { JWTService } from './jwt.service.js';
import { AuthTokens, AccessTokenInput } from '../types/auth.types.js';

// Local type definitions for self-contained service
interface RegisterRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  address?: string;
}


interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

interface CurrentUserResponse {
  user: AuthUser;
}

// Validation schemas
const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(20, 'Username must be at most 20 characters long')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

const registerRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: usernameSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be at most 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be at most 50 characters'),
  password: strongPasswordSchema,
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number').optional(),
  address: z.string().max(200, 'Address must be at most 200 characters').optional(),
});

const loginRequestSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Error classes - simplified versions for testing
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
  }
}

class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', public errors: any[] = []) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

class UserAlreadyExistsError extends ValidationError {
  constructor(field: 'email' | 'username', _value: string) {
    const message = field === 'email' 
      ? 'Email address is already registered' 
      : 'Username is already taken';
    super(message);
  }
}

class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }
}

class UserNotFoundError extends AppError {
  constructor(_identifier?: string) {
    super(404, 'User not found', 'USER_NOT_FOUND');
  }
}

class AccountInactiveError extends AppError {
  constructor() {
    super(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
  }
}

class InvalidTokenError extends AppError {
  constructor(message: string = 'Invalid token') {
    super(401, message, 'INVALID_TOKEN');
  }
}

class ExpiredTokenError extends AppError {
  constructor(message: string = 'Token has expired') {
    super(401, message, 'EXPIRED_TOKEN');
  }
}

class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', _originalError?: Error) {
    super(500, message, 'DATABASE_ERROR');
  }
}

/**
 * AuthService class handles all authentication business logic
 * 
 * Uses dependency injection for Prisma client and JWT service to enable
 * proper testing and maintain separation of concerns.
 */
export class AuthService {
  private readonly prisma: PrismaClient;
  private readonly jwtService: JWTService;
  private readonly BCRYPT_ROUNDS = 12; // Security requirement from PRP

  /**
   * Initialize authentication service with dependencies
   * 
   * @param prisma - Prisma client for database operations
   * @param jwtService - JWT service for token operations
   */
  constructor(prisma: PrismaClient, jwtService: JWTService) {
    this.prisma = prisma;
    this.jwtService = jwtService;
  }

  /**
   * Register a new user with email/username validation and password hashing
   * 
   * Flow:
   * 1. Validate input data with Zod schema
   * 2. Check for existing users with same email or username
   * 3. Hash password with bcrypt (12 rounds for security)
   * 4. Create user in database with proper field selection
   * 5. Generate JWT token pair and return authentication response
   * 
   * @param data - User registration data
   * @returns Authentication response with user data and access token
   * @throws ValidationError for invalid input data
   * @throws UserAlreadyExistsError for duplicate email/username
   * @throws DatabaseError for database operation failures
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Validate input data using Zod schema
      const validatedData = registerRequestSchema.parse(data);

      // Check for existing users with same email or username
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: validatedData.email.toLowerCase() },
            { username: validatedData.username },
          ],
        },
        select: { email: true, username: true },
      });

      if (existingUser) {
        if (existingUser.email === validatedData.email.toLowerCase()) {
          throw new UserAlreadyExistsError('email', validatedData.email);
        } else {
          throw new UserAlreadyExistsError('username', validatedData.username);
        }
      }

      // Hash password with bcrypt (12 rounds for security)
      const hashedPassword = await bcrypt.hash(validatedData.password, this.BCRYPT_ROUNDS);

      // Create user in database, excluding sensitive fields from response
      const newUser = await this.prisma.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          username: validatedData.username,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          password: hashedPassword,
          phone: validatedData.phone ?? null,
          address: validatedData.address ?? null,
          role: 'CUSTOMER', // Default role
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Generate JWT token pair
      const tokenPair = this.generateTokenPair(newUser);

      // Store refresh token in database for rotation tracking
      await this.storeRefreshToken(newUser.id, tokenPair.refreshToken);

      return {
        user: {
          ...newUser,
          createdAt: newUser.createdAt.toISOString(),
          updatedAt: newUser.updatedAt.toISOString(),
        } as AuthUser,
        accessToken: tokenPair.accessToken,
        expiresIn: tokenPair.expiresAt,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UserAlreadyExistsError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to register user', error as Error);
    }
  }

  /**
   * Authenticate user with email or username and password
   * 
   * Flow:
   * 1. Validate input data with Zod schema
   * 2. Find user by email OR username using flexible identifier
   * 3. Verify user account is active
   * 4. Compare password with stored hash using bcrypt
   * 5. Generate fresh JWT token pair and return authentication response
   * 
   * @param identifier - Email or username
   * @param password - Plain text password
   * @returns Authentication response with user data and access token
   * @throws ValidationError for invalid input data
   * @throws InvalidCredentialsError for authentication failures (generic message for security)
   * @throws AccountInactiveError for deactivated accounts
   * @throws DatabaseError for database operation failures
   */
  async login(identifier: string, password: string): Promise<AuthResponse> {
    try {
      // Validate input data
      const validatedData = loginRequestSchema.parse({ identifier, password });

      // Find user by email OR username (case-insensitive email)
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: validatedData.identifier.toLowerCase() },
            { username: validatedData.identifier },
          ],
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          password: true, // Need password for comparison
          role: true,
          isActive: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Use generic error message for security (don't reveal if user exists)
      if (!user) {
        throw new InvalidCredentialsError();
      }

      // Check if user account is active
      if (!user.isActive) {
        throw new AccountInactiveError();
      }

      // Compare password with stored hash
      const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
      if (!isPasswordValid) {
        throw new InvalidCredentialsError();
      }

      // Generate fresh JWT token pair
      const tokenPair = this.generateTokenPair(user);

      // Store refresh token in database for rotation tracking
      await this.storeRefreshToken(user.id, tokenPair.refreshToken);

      // Return user data without password hash
      const userWithoutPassword = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      
      return {
        user: {
          ...userWithoutPassword,
          createdAt: userWithoutPassword.createdAt.toISOString(),
          updatedAt: userWithoutPassword.updatedAt.toISOString(),
        } as AuthUser,
        accessToken: tokenPair.accessToken,
        expiresIn: tokenPair.expiresAt,
      };
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof InvalidCredentialsError ||
        error instanceof AccountInactiveError
      ) {
        throw error;
      }
      
      throw new DatabaseError('Failed to authenticate user', error as Error);
    }
  }

  /**
   * Refresh access token using valid refresh token with rotation
   * 
   * Flow:
   * 1. Verify refresh token signature and expiration
   * 2. Look up current user data for fresh access token
   * 3. Verify refresh token exists in database and is valid
   * 4. Generate new access token with current user data
   * 5. Rotate refresh token (invalidate old, create new)
   * 6. Return new access token with updated expiration
   * 
   * @param refreshToken - JWT refresh token
   * @returns New access token with expiration time
   * @throws InvalidTokenError for invalid/malformed tokens
   * @throws ExpiredTokenError for expired tokens
   * @throws UserNotFoundError if user no longer exists
   * @throws DatabaseError for database operation failures
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      // Verify refresh token signature and expiration
      const verificationResult = this.jwtService.verifyRefreshToken(refreshToken);

      if (!verificationResult.success) {
        if (verificationResult.error === 'expired') {
          throw new ExpiredTokenError('Refresh token has expired');
        } else if (verificationResult.error === 'malformed') {
          throw new InvalidTokenError('Refresh token is malformed');
        } else {
          throw new InvalidTokenError('Invalid refresh token');
        }
      }

      const { payload } = verificationResult;

      // Check if refresh token exists in database and is still valid
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.sub,
          expiresAt: {
            gt: new Date(), // Token should not be expired
          },
        },
      });

      if (!storedToken) {
        throw new InvalidTokenError('Refresh token not found or expired');
      }

      // Get current user data for fresh access token
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new UserNotFoundError(payload.sub);
      }

      if (!user.isActive) {
        throw new AccountInactiveError();
      }

      // Generate new token pair (includes rotation)
      const newTokenPair = this.generateTokenPair(user);

      // Rotate refresh token: invalidate old token and store new one
      await this.prisma.$transaction([
        // Delete old refresh token
        this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        }),
        // Store new refresh token
        this.prisma.refreshToken.create({
          data: {
            token: newTokenPair.refreshToken,
            userId: user.id,
            expiresAt: new Date(newTokenPair.expiresAt + (7 * 24 * 60 * 60 * 1000)), // 7 days from now
          },
        }),
      ]);

      return {
        accessToken: newTokenPair.accessToken,
        expiresIn: newTokenPair.expiresAt,
      };
    } catch (error) {
      if (
        error instanceof InvalidTokenError ||
        error instanceof ExpiredTokenError ||
        error instanceof UserNotFoundError ||
        error instanceof AccountInactiveError
      ) {
        throw error;
      }
      
      throw new DatabaseError('Failed to refresh token', error as Error);
    }
  }

  /**
   * Get current user data for authenticated requests
   * 
   * Used by the /me endpoint to return current user profile information.
   * Fetches fresh user data from database to ensure accuracy.
   * 
   * @param userId - User ID from authenticated request
   * @returns Current user profile data
   * @throws UserNotFoundError if user no longer exists
   * @throws AccountInactiveError for deactivated accounts
   * @throws DatabaseError for database operation failures
   */
  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      if (!user.isActive) {
        throw new AccountInactiveError();
      }

      return {
        user: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        } as AuthUser,
      };
    } catch (error) {
      if (error instanceof UserNotFoundError || error instanceof AccountInactiveError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to get current user', error as Error);
    }
  }

  /**
   * Generate JWT token pair for a user
   * 
   * Private helper method that creates both access and refresh tokens
   * with proper user information and expiration times.
   * 
   * @param user - User data for token generation
   * @returns Complete token pair with expiration info
   */
  public generateTokenPair(user: any): AuthTokens {
    const accessTokenInput: AccessTokenInput = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return this.jwtService.generateTokenPair(accessTokenInput);
  }

  /**
   * Store refresh token in database for rotation tracking
   * 
   * Private helper method that stores refresh tokens in the database
   * to enable proper token rotation and invalidation.
   * 
   * @private
   * @param userId - User ID
   * @param refreshToken - JWT refresh token
   */
  private async storeRefreshToken(
    userId: string, 
    refreshToken: string
  ): Promise<void> {
    // Refresh token expires 7 days from now
    const refreshTokenExpiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
    
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: refreshTokenExpiresAt,
      },
    });
  }

  /**
   * Clean up expired refresh tokens (maintenance operation)
   * 
   * This method can be called periodically to remove expired refresh tokens
   * from the database to prevent table bloat.
   * 
   * @returns Number of tokens cleaned up
   */
  async cleanExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(), // Delete tokens that are expired
          },
        },
      });

      return result.count;
    } catch (error) {
      throw new DatabaseError('Failed to clean expired tokens', error as Error);
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   * 
   * This method can be used to implement "logout from all devices" functionality
   * or when a user's account security may be compromised.
   * 
   * @param userId - User ID whose tokens should be revoked
   * @returns Number of tokens revoked
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });

      return result.count;
    } catch (error) {
      throw new DatabaseError('Failed to revoke user tokens', error as Error);
    }
  }

  /**
   * Update user profile information
   * 
   * Allows users to update their phone number and address.
   * Email and username cannot be changed for security reasons.
   * 
   * @param userId - User ID from authenticated request
   * @param updates - Profile fields to update
   * @returns Updated user profile data
   * @throws UserNotFoundError if user no longer exists
   * @throws ValidationError if updates are invalid
   * @throws DatabaseError for database operations
   */
  async updateProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
    }
  ): Promise<AuthUser> {
    try {
      // Validate that user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new UserNotFoundError(userId);
      }

      // Update user profile
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(updates.firstName && { firstName: updates.firstName }),
          ...(updates.lastName && { lastName: updates.lastName }),
          ...(updates.phone !== undefined && { phone: updates.phone || null }),
          ...(updates.address !== undefined && { address: updates.address || null }),
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to update profile', error as Error);
    }
  }
}

/**
 * Factory function to create AuthService with dependency injection
 * This follows the dependency injection pattern recommended in CLAUDE.md
 * 
 * @param prisma - Prisma client for database operations
 * @param jwtService - JWT service for token operations
 * @returns Configured AuthService instance
 */
export function createAuthService(prisma: PrismaClient, jwtService: JWTService): AuthService {
  return new AuthService(prisma, jwtService);
}

// Export error classes for use in tests and other modules
export {
  ValidationError,
  UserAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
  AccountInactiveError,
  InvalidTokenError,
  ExpiredTokenError,
  DatabaseError,
};