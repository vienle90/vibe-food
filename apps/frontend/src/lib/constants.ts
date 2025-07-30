/**
 * Application constants and configuration values
 * Following CLAUDE.md guidelines for centralized constants
 */

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12, // Good for responsive grid layouts
  MAX_LIMIT: 50,
} as const;

export const SEARCH = {
  DEBOUNCE_DELAY: 300, // milliseconds
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_LENGTH: 100,
} as const;

export const CACHE = {
  STORES_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  STORE_DETAILS_STALE_TIME: 3 * 60 * 1000, // 3 minutes
  QUERY_CACHE_TIME: 10 * 60 * 1000, // 10 minutes
} as const;

export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
} as const;

export const STORE_CATEGORIES = [
  { value: 'LUNCH', label: 'Lunch', emoji: '🍕' },
  { value: 'DINNER', label: 'Dinner', emoji: '🍽️' },
  { value: 'COFFEE', label: 'Coffee', emoji: '☕' },
  { value: 'TEA', label: 'Tea', emoji: '🍵' },
  { value: 'DESSERT', label: 'Dessert', emoji: '🍰' },
  { value: 'FAST_FOOD', label: 'Fast Food', emoji: '🍔' },
] as const;

export const SORT_OPTIONS = [
  { value: 'rating', label: 'Rating' },
  { value: 'name', label: 'Name' },
  { value: 'createdAt', label: 'Newest' },
  { value: 'relevance', label: 'Relevance' },
] as const;

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  
  // API errors
  STORES_FETCH_ERROR: 'Failed to load stores. Please try again.',
  STORE_NOT_FOUND: 'Store not found.',
  
  // Validation errors
  INVALID_SEARCH: 'Search query is too short or invalid.',
  INVALID_CATEGORY: 'Invalid category selected.',
  
  // General errors
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
  EMPTY_RESULTS: 'No stores found. Try adjusting your filters.',
} as const;

export const SUCCESS_MESSAGES = {
  STORES_LOADED: 'Stores loaded successfully',
} as const;

// Image optimization settings
export const IMAGE_CONFIG = {
  PLACEHOLDER: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=240&fit=crop&crop=center',
  QUALITY: 85,
  SIZES: {
    CARD: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
    HERO: '100vw',
  },
} as const;

// Animation durations (in milliseconds)
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;