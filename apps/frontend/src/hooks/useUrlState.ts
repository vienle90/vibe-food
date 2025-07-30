import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';

/**
 * Store filters schema for URL validation
 */
const storeFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.enum(['LUNCH', 'DINNER', 'COFFEE', 'TEA', 'DESSERT', 'FAST_FOOD']).optional(),
  sort: z.enum(['relevance', 'rating', 'name', 'createdAt']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/**
 * Store filters type derived from schema
 */
export type UrlStoreFilters = z.infer<typeof storeFiltersSchema>;

/**
 * Options for URL state management
 */
export interface UseUrlStateOptions {
  /** Default values for filters */
  defaultValues?: Partial<UrlStoreFilters>;
  /** Whether to replace the current history entry instead of pushing a new one */
  replace?: boolean;
  /** Whether to update URL immediately on filter changes */
  immediate?: boolean;
}

/**
 * Custom hook for managing store filters in URL search parameters.
 * 
 * Features:
 * - Syncs filter state with URL search parameters for shareable URLs
 * - Validates URL parameters with Zod schema
 * - Supports browser back/forward navigation
 * - Provides clean parameter handling (removes undefined/empty values)
 * - Type-safe parameter access with proper defaults
 * - History management (push vs replace)
 * 
 * @param options - Configuration options
 * @returns Filter state and update functions
 * 
 * @example
 * ```tsx
 * const { filters, updateFilters, resetFilters } = useUrlState({
 *   defaultValues: { sort: 'rating', limit: 12 }
 * });
 * 
 * // Update single filter
 * updateFilters({ category: 'LUNCH' });
 * 
 * // Update multiple filters
 * updateFilters({ search: 'pizza', page: 1 });
 * 
 * // Reset to defaults
 * resetFilters();
 * ```
 */
export const useUrlState = (options: UseUrlStateOptions = {}) => {
  const { defaultValues = {}, replace = false, immediate = true } = options;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Parse URL parameters with validation
  const parseUrlParams = useCallback((): UrlStoreFilters => {
    const params: Record<string, any> = {};
    
    // Extract all search parameters
    searchParams.forEach((value, key) => {
      if (value) {
        params[key] = value;
      }
    });
    
    // Validate and parse with schema
    const result = storeFiltersSchema.safeParse(params);
    
    if (result.success) {
      return { ...defaultValues, ...result.data };
    }
    
    // If validation fails, return default values
    console.warn('Invalid URL parameters, using defaults:', result.error);
    return { ...defaultValues };
  }, [searchParams, defaultValues]);
  
  // Initialize state from URL
  const [filters, setFilters] = useState<UrlStoreFilters>(parseUrlParams);
  
  // Update URL with new filter values
  const updateUrl = useCallback((newFilters: UrlStoreFilters) => {
    const params = new URLSearchParams();
    
    // Add only defined values to URL
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    
    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : '/';
    
    if (replace) {
      router.replace(newUrl);
    } else {
      router.push(newUrl);
    }
  }, [router, replace]);
  
  // Update filters and optionally URL
  const updateFilters = useCallback((updates: Partial<UrlStoreFilters>) => {
    const newFilters = { ...filters, ...updates };
    
    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([, value]) => value !== undefined)
    ) as UrlStoreFilters;
    
    setFilters(cleanFilters);
    
    if (immediate) {
      updateUrl(cleanFilters);
    }
  }, [filters, immediate, updateUrl]);
  
  // Reset to default values
  const resetFilters = useCallback(() => {
    setFilters(defaultValues);
    if (immediate) {
      updateUrl(defaultValues);
    }
  }, [defaultValues, immediate, updateUrl]);
  
  // Apply filters without updating URL (useful for controlled updates)
  const setFiltersOnly = useCallback((newFilters: UrlStoreFilters) => {
    setFilters(newFilters);
  }, []);
  
  // Manually sync to URL (useful when immediate = false)
  const syncToUrl = useCallback(() => {
    updateUrl(filters);
  }, [filters, updateUrl]);
  
  // Update state when URL changes (browser navigation)
  useEffect(() => {
    const params: Record<string, any> = {};
    
    // Extract all search parameters
    searchParams.forEach((value, key) => {
      if (value) {
        params[key] = value;
      }
    });
    
    // Validate and parse with schema
    const result = storeFiltersSchema.safeParse(params);
    
    let newFilters: UrlStoreFilters;
    if (result.success) {
      newFilters = { ...defaultValues, ...result.data };
    } else {
      // If validation fails, return default values
      console.warn('Invalid URL parameters, using defaults:', result.error);
      newFilters = { ...defaultValues };
    }
    
    setFilters(newFilters);
  }, [searchParams, defaultValues]);
  
  // Helper to check if any filters are active
  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof UrlStoreFilters];
    const defaultValue = defaultValues[key as keyof UrlStoreFilters];
    return value !== undefined && value !== defaultValue;
  });
  
  // Get active filter count for display
  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof UrlStoreFilters];
    const defaultValue = defaultValues[key as keyof UrlStoreFilters];
    return value !== undefined && value !== defaultValue;
  }).length;
  
  return {
    /** Current filter values */
    filters,
    /** Update one or more filters */
    updateFilters,
    /** Reset all filters to defaults */
    resetFilters,
    /** Set filters without updating URL */
    setFiltersOnly,
    /** Manually sync current state to URL */
    syncToUrl,
    /** Whether any filters are active (different from defaults) */
    hasActiveFilters,
    /** Number of active filters */
    activeFilterCount,
  };
};