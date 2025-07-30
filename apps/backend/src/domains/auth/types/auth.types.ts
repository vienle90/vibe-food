/**
 * Authentication domain type definitions
 * 
 * This module contains all types specific to the authentication domain,
 * following the type safety requirements from CLAUDE.md.
 */

/**
 * JWT Access Token Payload
 * Contains user information for stateless authorization
 */
export interface JWTAccessPayload {
  /** User ID - branded type for enhanced type safety */
  sub: string;
  /** User email address */
  email: string;
  /** Username for display purposes */
  username: string;
  /** User first name */
  firstName: string;
  /** User last name */
  lastName: string;
  /** User role for authorization */
  role: 'CUSTOMER' | 'STORE_OWNER' | 'ADMIN';
  /** Token issued at (seconds since epoch) */
  iat: number;
  /** Token expiration (seconds since epoch) */
  exp: number;
  /** Token issuer */
  iss: string;
  /** Token audience */
  aud: string;
}

/**
 * JWT Refresh Token Payload
 * Minimal payload for security - only contains essential information
 */
export interface JWTRefreshPayload {
  /** User ID */
  sub: string;
  /** Unique token ID for rotation tracking */
  tokenId: string;
  /** Token issued at (seconds since epoch) */
  iat: number;
  /** Token expiration (seconds since epoch) */
  exp: number;
  /** Token issuer */
  iss: string;
  /** Token audience */
  aud: string;
}

/**
 * Input types for token generation (excluding automatic JWT claims)
 */
export type AccessTokenInput = Omit<JWTAccessPayload, 'iat' | 'exp' | 'iss' | 'aud'>;
export type RefreshTokenInput = Omit<JWTRefreshPayload, 'iat' | 'exp' | 'iss' | 'aud'>;

/**
 * Token verification result types
 */
export interface TokenVerificationSuccess<T> {
  success: true;
  payload: T;
}

export interface TokenVerificationFailure {
  success: false;
  error: 'expired' | 'invalid' | 'malformed';
  message: string;
}

export type TokenVerificationResult<T> = TokenVerificationSuccess<T> | TokenVerificationFailure;

/**
 * JWT Service configuration interface
 */
export interface JWTConfig {
  /** Access token secret */
  accessSecret: string;
  /** Refresh token secret */
  refreshSecret: string;
  /** Access token expiration time */
  accessExpiresIn: string;
  /** Refresh token expiration time */
  refreshExpiresIn: string;
  /** Token issuer */
  issuer: string;
  /** Token audience */
  audience: string;
}

/**
 * Authentication token pair
 */
export interface AuthTokens {
  /** Access token for API requests */
  accessToken: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Access token expiration timestamp (milliseconds since epoch) */
  expiresAt: number;
}

/**
 * JWT Error types for consistent error handling
 */
export class JWTError extends Error {
  constructor(
    public readonly type: 'expired' | 'invalid' | 'malformed',
    message: string
  ) {
    super(message);
    this.name = 'JWTError';
  }
}

export class JWTExpiredError extends JWTError {
  constructor(message = 'Token has expired') {
    super('expired', message);
    this.name = 'JWTExpiredError';
  }
}

export class JWTInvalidError extends JWTError {
  constructor(message = 'Token is invalid') {
    super('invalid', message);
    this.name = 'JWTInvalidError';
  }
}

export class JWTMalformedError extends JWTError {
  constructor(message = 'Token is malformed') {
    super('malformed', message);
    this.name = 'JWTMalformedError';
  }
}