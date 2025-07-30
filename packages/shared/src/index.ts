/**
 * @vibe/shared - Shared types, utilities, and environment validation
 * 
 * This package provides shared TypeScript types, Zod validation schemas,
 * and utility functions used across the Vibe food ordering application.
 */

// Environment validation
export * from './env.js';

// Core types and schemas
export * from './types/core.js';

// API types and schemas  
export * from './types/api.js';

// Authentication types and schemas
export * from './types/auth.js';

// Error classes
export * from './errors/index.js';

// Re-export commonly used Zod utilities
export { z } from 'zod';