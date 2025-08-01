/**
 * JWT Service Implementation
 * 
 * This service handles JWT token generation and verification for the authentication system.
 * It follows the security requirements from the PRP and implements proper error handling
 * as specified in CLAUDE.md.
 */

import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import {
  JWTConfig,
  JWTAccessPayload,
  JWTRefreshPayload,
  AccessTokenInput,
  RefreshTokenInput,
  TokenVerificationResult,
  AuthTokens,
} from '../types/auth.types.js';

/**
 * JWTService class handles all JWT operations with proper security practices
 * 
 * Key features:
 * - Separate secrets for access and refresh tokens
 * - Token rotation support with unique token IDs
 * - Comprehensive error handling with specific error types
 * - Type-safe token payloads and verification results
 */
export class JWTService {
  private readonly config: JWTConfig;

  /**
   * Initialize JWT service with configuration
   * 
   * @param config - JWT configuration including secrets and expiration times
   */
  constructor(config: JWTConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Generate access token with user information
   * 
   * Access tokens are short-lived (15 minutes) and contain user data
   * for stateless authorization in API requests.
   * 
   * @param payload - User information for the token
   * @returns Signed JWT access token
   */
  generateAccessToken(payload: AccessTokenInput): string {
    const tokenPayload: Omit<JWTAccessPayload, 'iat' | 'exp'> = {
      ...payload,
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    return jwt.sign(tokenPayload, this.config.accessSecret, {
      expiresIn: this.config.accessExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token for token rotation
   * 
   * Refresh tokens are long-lived (7 days) and contain minimal information
   * for security. Each token has a unique ID for rotation tracking.
   * 
   * @param payload - Minimal user information for the token
   * @returns Signed JWT refresh token
   */
  generateRefreshToken(payload: RefreshTokenInput): string {
    const tokenPayload: Omit<JWTRefreshPayload, 'iat' | 'exp'> = {
      ...payload,
      tokenId: payload.tokenId || randomUUID(), // Generate UUID if not provided
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    return jwt.sign(tokenPayload, this.config.refreshSecret, {
      expiresIn: this.config.refreshExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Generate a complete token pair (access + refresh)
   * 
   * @param userInfo - User information for token generation
   * @returns Complete token pair with expiration info
   */
  generateTokenPair(userInfo: AccessTokenInput): AuthTokens {
    const refreshTokenId = randomUUID();
    
    const accessToken = this.generateAccessToken(userInfo);
    const refreshToken = this.generateRefreshToken({
      sub: userInfo.sub,
      tokenId: refreshTokenId,
    });

    // Calculate expiration timestamp in milliseconds
    const expiresAt = Date.now() + this.parseExpirationToMs(this.config.accessExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Verify access token and return payload
   * 
   * @param token - JWT access token to verify
   * @returns Verification result with payload or error information
   */
  verifyAccessToken(token: string): TokenVerificationResult<JWTAccessPayload> {
    try {
      const payload = jwt.verify(token, this.config.accessSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JWTAccessPayload;

      return {
        success: true,
        payload,
      };
    } catch (error) {
      return this.handleJWTError(error);
    }
  }

  /**
   * Verify refresh token and return payload
   * 
   * @param token - JWT refresh token to verify
   * @returns Verification result with payload or error information
   */
  verifyRefreshToken(token: string): TokenVerificationResult<JWTRefreshPayload> {
    try {
      const payload = jwt.verify(token, this.config.refreshSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JWTRefreshPayload;

      return {
        success: true,
        payload,
      };
    } catch (error) {
      return this.handleJWTError(error);
    }
  }

  /**
   * Validate JWT service configuration
   * 
   * @private
   */
  private validateConfig(): void {
    const { accessSecret, refreshSecret } = this.config;

    if (accessSecret.length < 32) {
      throw new Error('JWT access secret must be at least 32 characters long');
    }

    if (refreshSecret.length < 32) {
      throw new Error('JWT refresh secret must be at least 32 characters long');
    }

    if (accessSecret === refreshSecret) {
      throw new Error('Access and refresh secrets must be different for security');
    }
  }

  /**
   * Handle JWT verification errors and convert to consistent error format
   * 
   * @private
   * @param error - JWT error from verification
   * @returns Formatted error result
   */
  private handleJWTError(error: any): TokenVerificationResult<never> {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'expired',
        message: 'Token has expired',
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      // Check if it's a malformed token (not valid JWT structure)
      if (error.message.includes('malformed') || error.message.includes('jwt malformed')) {
        return {
          success: false,
          error: 'malformed',
          message: 'Token is malformed or cannot be parsed',
        };
      }
      
      return {
        success: false,
        error: 'invalid',
        message: 'Invalid token signature or claims',
      };
    }

    if (error instanceof jwt.NotBeforeError) {
      return {
        success: false,
        error: 'invalid',
        message: 'Token not active yet',
      };
    }

    // Handle other parsing errors as malformed
    return {
      success: false,
      error: 'malformed',
      message: 'Token is malformed or cannot be parsed',
    };
  }

  /**
   * Parse expiration string to milliseconds
   * 
   * @private
   * @param expiration - Expiration string (e.g., '15m', '7d')
   * @returns Milliseconds
   */
  private parseExpirationToMs(expiration: string): number {
    const timeUnit = expiration.slice(-1);
    const timeValue = parseInt(expiration.slice(0, -1), 10);

    switch (timeUnit) {
      case 's':
        return timeValue * 1000;
      case 'm':
        return timeValue * 60 * 1000;
      case 'h':
        return timeValue * 60 * 60 * 1000;
      case 'd':
        return timeValue * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unsupported time unit: ${timeUnit}`);
    }
  }

  /**
   * Extract user ID from any token without full verification
   * Useful for logging and debugging purposes only
   * 
   * @param token - JWT token
   * @returns User ID or null if extraction fails
   */
  extractUserId(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.sub || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired without full verification
   * Useful for determining refresh vs re-authentication flow
   * 
   * @param token - JWT token
   * @returns True if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded?.exp) {return true;}
      
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }
}

/**
 * Factory function to create JWT service with environment configuration
 * This follows the dependency injection pattern recommended in CLAUDE.md
 */
export function createJWTService(config: JWTConfig): JWTService {
  return new JWTService(config);
}