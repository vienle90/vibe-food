import { z } from 'zod';
import { strongPasswordSchema, usernameSchema, type JwtAccessPayload, type JwtRefreshPayload } from './core';
import { userEntitySchema } from './entities';

/**
 * Authentication schemas and types for the Vibe food ordering application.
 * 
 * Provides comprehensive validation for:
 * - User registration and login
 * - JWT token payloads (imported from core.ts)
 * - Authentication responses
 * - Password reset workflows
 * 
 * Note: Password and username validation schemas are imported from core.ts
 * to maintain consistency across the application.
 */

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
export const authUserSchema = userEntitySchema.omit({
  password: true, // Exclude password hash from API responses
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