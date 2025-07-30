import { QueryClient } from '@tanstack/react-query';
import { CACHE, API_CONFIG } from './constants';
import { ApiError, NetworkError, createErrorLogger } from './errors';

/**
 * TanStack Query client configuration
 * Following CLAUDE.md patterns for server state management
 */

const logger = createErrorLogger('QueryClient');

/**
 * Default query options for consistent caching and error handling
 */
const defaultQueryOptions = {
  queries: {
    // Cache configuration
    staleTime: CACHE.STORES_STALE_TIME,
    gcTime: CACHE.QUERY_CACHE_TIME,
    
    // Retry configuration
    retry: (failureCount: number, error: unknown) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        return false;
      }
      
      // Retry network errors up to 3 times
      if (error instanceof NetworkError) {
        return failureCount < API_CONFIG.RETRY_ATTEMPTS;
      }
      
      // Default retry logic for other errors
      return failureCount < 2;
    },
    
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Background refetching
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    
    // Error handling
    throwOnError: false,
    
    // Enable query retries with exponential backoff
    retryOnMount: true,
  },
  mutations: {
    // Mutation configuration
    retry: (failureCount: number, error: unknown) => {
      // Don't retry mutations on client errors
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        return false;
      }
      
      // Retry network errors once
      if (error instanceof NetworkError) {
        return failureCount < 1;
      }
      
      return false;
    },
    
    throwOnError: false,
  },
};

/**
 * Create and configure TanStack Query client
 * 
 * @returns Configured QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

/**
 * Singleton query client instance
 */
export const queryClient = createQueryClient();

/**
 * Query key factory for consistent key generation
 * Following TanStack Query best practices
 */
export const queryKeys = {
  // Base keys
  all: ['vibe'] as const,
  stores: () => [...queryKeys.all, 'stores'] as const,
  menus: () => [...queryKeys.all, 'menus'] as const,
  orders: () => [...queryKeys.all, 'orders'] as const,
  
  // Store keys
  storesList: (filters?: Record<string, any>) => 
    [...queryKeys.stores(), 'list', filters] as const,
  storeDetails: (storeId: string) => 
    [...queryKeys.stores(), 'detail', storeId] as const,
  
  // Menu keys
  menuList: (storeId: string, filters?: Record<string, any>) => 
    [...queryKeys.menus(), 'list', storeId, filters] as const,
  
  // Order keys
  ordersList: (filters?: Record<string, any>) => 
    [...queryKeys.orders(), 'list', filters] as const,
  orderDetails: (orderId: string) => 
    [...queryKeys.orders(), 'detail', orderId] as const,
} as const;

/**
 * Utility function to invalidate related queries
 * 
 * @param queryClient - Query client instance
 * @param keys - Query keys to invalidate
 */
export async function invalidateQueries(
  queryClient: QueryClient,
  keys: readonly unknown[]
): Promise<void> {
  try {
    await queryClient.invalidateQueries({ queryKey: keys });
  } catch (error) {
    logger(error, { keys });
  }
}

/**
 * Utility function to reset all queries
 * 
 * @param queryClient - Query client instance
 */
export async function resetQueries(queryClient: QueryClient): Promise<void> {
  try {
    await queryClient.resetQueries();
  } catch (error) {
    logger(error);
  }
}

/**
 * Prefetch stores for better UX
 * 
 * @param queryClient - Query client instance
 * @param filters - Store filters
 */
export async function prefetchStores(
  queryClient: QueryClient,
  filters?: Record<string, any>
): Promise<void> {
  const { apiClient } = await import('./api-client');
  
  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.storesList(filters),
      queryFn: () => apiClient.get('/api/stores', filters),
      staleTime: CACHE.STORES_STALE_TIME,
    });
  } catch (error) {
    logger(error, { filters });
  }
}