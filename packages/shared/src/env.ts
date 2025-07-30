import { z } from 'zod';

/**
 * Environment variable validation schema using Zod.
 * This schema validates ALL environment variables used across the application
 * and provides type-safe access to configuration values.
 */

// Core environment schema with branded types and strict validation
const envSchema = z.object({
  // Environment and basic configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Database configuration
  DATABASE_URL: z.string().min(1).describe('PostgreSQL connection string'),
  REDIS_URL: z.string().url().optional().describe('Redis connection string (optional)'),
  
  // Server configuration
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('localhost'),
  
  // Authentication configuration
  JWT_SECRET: z.string().min(32).describe('JWT signing secret (minimum 32 characters)'),
  JWT_EXPIRES_IN: z.string().default('15m').describe('JWT expiration time'),
  JWT_REFRESH_SECRET: z.string().min(32).describe('JWT refresh token secret (minimum 32 characters)'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d').describe('JWT refresh token expiration time'),
  
  // Security configuration
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  CORS_ORIGIN: z.string().default('http://localhost:3000').describe('CORS allowed origins'),
  
  // API configuration
  API_BASE_URL: z.string().url().default('http://localhost:3001').describe('Backend API base URL'),
  
  // Frontend-specific environment variables (NEXT_PUBLIC_ prefix)
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001').describe('Public API URL for frontend'),
  
  // Database connection pool configuration (optional)
  DB_POOL_MIN: z.coerce.number().int().min(0).default(2).optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(10).optional(),
  
  // Logging configuration
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Upload configuration
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(5242880).describe('Max file size in bytes (default: 5MB)'),
  UPLOAD_PATH: z.string().default('./uploads').describe('File upload directory'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000).describe('Rate limit window in ms (default: 15 minutes)'),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100).describe('Max requests per window'),
});

/**
 * Branded types for enhanced type safety
 */
export const DatabaseUrlSchema = z.string().url().brand<'DatabaseUrl'>();
export type DatabaseUrl = z.infer<typeof DatabaseUrlSchema>;

export const JwtSecretSchema = z.string().min(32).brand<'JwtSecret'>();
export type JwtSecret = z.infer<typeof JwtSecretSchema>;

/**
 * Parse and validate environment variables
 * This function will throw an error if any required environment variable
 * is missing or invalid, implementing the "fail fast" principle.
 */
function parseEnv(): z.infer<typeof envSchema> {
  try {
    const result = envSchema.parse(process.env);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      
      console.error('❌ Environment validation failed:');
      errorMessages.forEach(msg => console.error(`  - ${msg}`));
      console.error('\n💡 Please check your .env file and ensure all required variables are set.');
      
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validated environment variables
 * This object provides type-safe access to all environment configuration
 * Only validates when accessed in non-test environments or when explicitly requested
 */
let _env: z.infer<typeof envSchema> | null = null;

export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop: string) {
    if (!_env) {
      // Skip validation in test environment or if SKIP_ENV_VALIDATION is set
      if (process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true') {
        return process.env[prop] || undefined;
      }
      _env = parseEnv();
    }
    return _env[prop as keyof typeof _env];
  }
});

/**
 * Force environment validation - useful for application startup
 */
export function validateEnv(): z.infer<typeof envSchema> {
  if (!_env) {
    _env = parseEnv();
  }
  return _env;
}

/**
 * Environment validation utilities for runtime checking
 */
export const envUtils = {
  /**
   * Check if running in development mode
   */
  isDevelopment: () => env.NODE_ENV === 'development',
  
  /**
   * Check if running in test mode
   */
  isTest: () => env.NODE_ENV === 'test',
  
  /**
   * Check if running in production mode
   */
  isProduction: () => env.NODE_ENV === 'production',
  
  /**
   * Get database configuration object
   */
  getDatabaseConfig: () => ({
    url: env.DATABASE_URL,
    poolMin: env.DB_POOL_MIN,
    poolMax: env.DB_POOL_MAX,
  }),
  
  /**
   * Get JWT configuration object
   */
  getJwtConfig: () => ({
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  }),
  
  /**
   * Get server configuration object
   */
  getServerConfig: () => ({
    port: env.PORT,
    host: env.HOST,
    corsOrigin: env.CORS_ORIGIN,
  }),
  
  /**
   * Validate that all critical secrets meet security requirements
   */
  validateSecrets: () => {
    const secrets = [env.JWT_SECRET, env.JWT_REFRESH_SECRET];
    secrets.forEach((secret, index) => {
      if (secret.length < 32) {
        throw new Error(`Secret ${index + 1} is too short. Minimum 32 characters required.`);
      }
    });
  },
};

/**
 * Environment variable schema for external validation
 * Export the schema for use in other modules that need to validate env vars
 */
export { envSchema };

/**
 * Type definitions for environment variables
 */
export type EnvConfig = z.infer<typeof envSchema>;
export type NodeEnv = EnvConfig['NODE_ENV'];