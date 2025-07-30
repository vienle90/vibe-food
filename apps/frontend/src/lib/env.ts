import { z } from 'zod';

/**
 * Environment variable schema validation following CLAUDE.md requirements
 * All environment variables must be validated with Zod at startup
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Vibe Food Ordering'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
});

/**
 * Parsed and validated environment variables
 * This will throw an error at build time if validation fails
 */
export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
});

/**
 * Type-safe environment variables for use throughout the application
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Check if we're in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';