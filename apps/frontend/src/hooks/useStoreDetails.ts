import { useQuery } from '@tanstack/react-query';
import { storeService } from '@/lib/api-services';
interface UseStoreDetailsOptions {
  storeId: string;
  enabled?: boolean;
}

export function useStoreDetails({ storeId, enabled = true }: UseStoreDetailsOptions) {
  return useQuery({
    queryKey: ['store', storeId],
    queryFn: () => storeService.getStoreDetails(storeId),
    enabled: enabled && !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useStoreMenu({ storeId, enabled = true }: UseStoreDetailsOptions) {
  return useQuery({
    queryKey: ['store-menu', storeId],
    queryFn: () => storeService.getStoreMenu({ storeId }),
    enabled: enabled && !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}