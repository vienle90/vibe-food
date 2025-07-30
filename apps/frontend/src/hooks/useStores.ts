import { useQuery, useQueryClient } from '@tanstack/react-query';
import { storeService } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-client';
import { CACHE } from '@/lib/constants';
import { createErrorLogger } from '@/lib/errors';
import type { GetStoresQuery, GetStoresResponse } from '@vibe/shared';

/**
 * Store filters interface for the hook
 */
export interface StoreFilters {
  search?: string | undefined;
  category?: string | undefined;
  sort?: 'relevance' | 'rating' | 'name' | 'createdAt' | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/**
 * Options for the useStores hook
 */
export interface UseStoresOptions {
  /** Enable/disable the query */
  enabled?: boolean;
  /** Custom stale time for this specific query */
  staleTime?: number;
  /** Keep previous data while fetching new data */
  keepPreviousData?: boolean;
  /** Callback on successful fetch */
  onSuccess?: (data: GetStoresResponse) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Extended query result with additional computed properties
 */
export interface UseStoresResult {
  /** Query result data */
  data?: GetStoresResponse | undefined;
  /** Stores array for easier access */
  stores: GetStoresResponse['stores'];
  /** Pagination metadata */
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  /** Loading states */
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isLoadingFirstTime: boolean;
  isRefreshing: boolean;
  isFetching: boolean;
  /** Helper functions */
  refetch: () => void;
}

const logger = createErrorLogger('useStores');

/**
 * Custom hook for fetching and managing stores data with TanStack Query.
 * 
 * Features:
 * - Automatic caching with configurable stale time
 * - Background refetching and invalidation
 * - Error handling with retry logic
 * - Loading state management
 * - Filter-based query key generation
 * - Pagination metadata computation
 * - Keep previous data during refetching
 * 
 * @param filters - Store filters and pagination options
 * @param options - Additional query options
 * @returns Query result with stores data and metadata
 * 
 * @example
 * ```tsx
 * const { stores, isLoading, error, pagination } = useStores({ 
 *   category: 'LUNCH',
 *   search: 'pizza',
 *   page: 1,
 *   limit: 12
 * });
 * ```
 */
export const useStores = (
  filters: StoreFilters = {},
  options: UseStoresOptions = {}
): UseStoresResult => {
  const {
    enabled = true,
    staleTime = CACHE.STORES_STALE_TIME,
  } = options;

  // Build query parameters
  const queryParams: Partial<GetStoresQuery> = {
    category: filters.category as any, // Will be validated by API
    search: filters.search,
    sort: filters.sort || 'rating',
    page: filters.page || 1,
    limit: filters.limit || 12,
  };

  // Remove undefined values to keep query keys clean
  const cleanParams = Object.fromEntries(
    Object.entries(queryParams).filter(([, value]) => value !== undefined)
  );

  // Query with TanStack Query
  const queryResult = useQuery({
    queryKey: queryKeys.storesList(cleanParams),
    queryFn: async () => {
      try {
        const response = await storeService.getStores(queryParams);
        
        // Validate response structure
        if (!response || !Array.isArray(response.stores)) {
          throw new Error('Invalid response format from stores API');
        }
        
        return response;
      } catch (error) {
        logger(error, { filters: cleanParams });
        throw error;
      }
    },
    enabled,
    staleTime,
    
    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof Error && error.message.includes('400')) {
        return false;
      }
      return failureCount < 3;
    },
    
    // Refetch configuration
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  // Compute pagination metadata
  const computePagination = () => {
    const data = queryResult.data;
    if (!data) {
      return {
        page: queryParams.page || 1,
        limit: queryParams.limit || 12,
        total: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }

    const currentPage = (data as any).page || queryParams.page || 1;
    const limit = (data as any).limit || queryParams.limit || 12;
    const total = (data as any).total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      page: currentPage,
      limit,
      total,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  };

  // Compute loading states
  const isLoadingFirstTime = queryResult.isLoading && !queryResult.data;
  const isRefreshing = queryResult.isFetching && !!queryResult.data;

  return {
    data: queryResult.data,
    stores: queryResult.data?.stores || [],
    pagination: computePagination(),
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    isFetching: queryResult.isFetching,
    isLoadingFirstTime,
    isRefreshing,
    refetch: queryResult.refetch,
  };
};

/**
 * Hook to prefetch stores data for better UX
 * 
 * @param filters - Store filters to prefetch
 * @returns Prefetch function
 */
export const usePrefetchStores = () => {
  const queryClient = useQueryClient();
  
  return (filters: StoreFilters = {}) => {
    const queryParams: Partial<GetStoresQuery> = {
      category: filters.category as any,
      search: filters.search,
      sort: filters.sort || 'rating',
      page: filters.page || 1,
      limit: filters.limit || 12,
    };

    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([, value]) => value !== undefined)
    );

    queryClient.prefetchQuery({
      queryKey: queryKeys.storesList(cleanParams),
      queryFn: () => storeService.getStores(queryParams),
      staleTime: CACHE.STORES_STALE_TIME,
    });
  };
};