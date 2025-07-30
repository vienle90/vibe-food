import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with proper handling of conditional classes.
 * This is the standard Shadcn/ui utility function for className management.
 * 
 * @param inputs - Class values to merge
 * @returns Merged className string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency values for display
 * 
 * @param amount - Amount in dollars
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format delivery time for display
 * 
 * @param minutes - Delivery time in minutes
 * @returns Formatted time range string
 */
export function formatDeliveryTime(minutes: number): string {
  const minTime = minutes - 5;
  const maxTime = minutes + 5;
  return `${minTime}-${maxTime} min`;
}

/**
 * Get category emoji for visual display
 * 
 * @param category - Store category
 * @returns Emoji string
 */
export function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    LUNCH: '🍕',
    DINNER: '🍽️',
    COFFEE: '☕',
    TEA: '🍵',
    DESSERT: '🍰',
    FAST_FOOD: '🍔',
  };
  return emojiMap[category] || '🍽️';
}

/**
 * Create a debounced function that delays execution
 * 
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Generate a star rating display
 * 
 * @param rating - Rating value (0-5)
 * @returns Object with filled and empty star counts
 */
export function getStarRating(rating: number | null): {
  filled: number;
  empty: number;
  rating: number;
} {
  const safeRating = rating ?? 0;
  const filled = Math.floor(safeRating);
  const empty = 5 - filled;
  
  return {
    filled,
    empty,
    rating: safeRating,
  };
}

/**
 * Truncate text to specified length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}