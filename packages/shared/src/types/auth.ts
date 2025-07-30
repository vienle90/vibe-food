import { z } from 'zod';
import { UserIdSchema, UserRoleSchema, userSchema } from './core.js';

/**
 * Authentication schemas and types for the Vibe food ordering application.
 * 
 * Provides comprehensive validation for:
 * - User registration and login
 * - JWT token payloads
 * - Authentication responses
 * - Password strength requirements
 */

/**
 * Strong password validation schema
 * Requirements: minimum 8 characters, uppercase, lowercase, number
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Username validation schema
 * Requirements: 3-20 characters, alphanumeric and underscore only
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(20, 'Username must be at most 20 characters long')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * User registration request schema
 * Includes username validation and strong password requirements
 */
export const registerRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: usernameSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be at most 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be at most 50 characters'),
  password: strongPasswordSchema,
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number').optional(),
  address: z.string().max(200, 'Address must be at most 200 characters').optional(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/**
 * User login request schema
 * Supports both email and username as identifier
 */
export const loginRequestSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * JWT access token payload schema
 * Contains user data for stateless authorization
 */
export const jwtAccessPayloadSchema = z.object({
  sub: UserIdSchema, // Subject (user ID)
  email: z.string().email(),
  username: usernameSchema,
  role: UserRoleSchema,
  firstName: z.string(),
  lastName: z.string(),
  // JWT claims (iat, exp) are added automatically by JWT library
});

export type JwtAccessPayload = z.infer<typeof jwtAccessPayloadSchema>;

/**
 * JWT refresh token payload schema
 * Minimal payload for security - only user ID and token ID for rotation tracking
 */
export const jwtRefreshPayloadSchema = z.object({
  sub: UserIdSchema, // Subject (user ID)
  tokenId: z.string().uuid(), // For token rotation tracking
  // JWT claims (iat, exp) are added automatically by JWT library
});

export type JwtRefreshPayload = z.infer<typeof jwtRefreshPayloadSchema>;

/**
 * Authentication tokens response schema
 */
export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(), // Access token expiration in milliseconds
});

export type AuthTokens = z.infer<typeof authTokensSchema>;

/**
 * Authenticated user profile schema
 * Excludes sensitive information like password hash
 */
export const authUserSchema = userSchema.omit({
  // No sensitive fields to omit in the current user schema
});

export type AuthUser = z.infer<typeof authUserSchema>;

/**
 * Complete authentication response schema
 * Used for registration and login responses
 */
export const authResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(), // Access token expiration in milliseconds
  // Note: refreshToken is sent as HTTP-only cookie, not in response body
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/**
 * Token refresh request schema
 * Accepts refresh token from either cookies or request body
 */
export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1).optional(), // Optional if sent via cookie
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;

/**
 * Token refresh response schema
 */
export const refreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(), // Access token expiration in milliseconds
  // Note: new refreshToken is sent as HTTP-only cookie, not in response body
});

export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

/**
 * Password reset request schema (for future implementation)
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password reset confirmation schema (for future implementation)
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: strongPasswordSchema,
});

export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;

/**
 * Current user response schema
 * Used for /me endpoint
 */
export const currentUserResponseSchema = z.object({
  user: authUserSchema,
});

export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;

/**
 * JWT standard claims
 */
export interface JwtStandardClaims {
  iat: number; // Issued at
  exp: number; // Expires at
  iss?: string; // Issuer
  aud?: string; // Audience
}

/**
 * JWT decoded access token
 */
export interface JwtDecodedAccessToken extends JwtAccessPayload, JwtStandardClaims {}

/**
 * JWT decoded refresh token
 */
export interface JwtDecodedRefreshToken extends JwtRefreshPayload, JwtStandardClaims {}

/**
 * User data attached to authenticated requests
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;   
  firstName: string;
  lastName: string;
}