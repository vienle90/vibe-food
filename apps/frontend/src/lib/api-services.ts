import { apiClient } from './api-client';
import type { 
  GetStoresQuery,
  GetStoresResponse,
  GetStoreDetailsResponse,
  GetMenuQuery,
  GetMenuResponse
} from '@vibe/shared';

/**
 * API service functions for store-related operations
 * Following CLAUDE.md API integration patterns with shared types
 */

/**
 * Store API services
 */
export const storeService = {
  /**
   * Fetch stores with filtering and pagination
   * 
   * @param query - Query parameters for filtering and pagination
   * @returns Promise with stores response
   */
  async getStores(query: Partial<GetStoresQuery> = {}): Promise<GetStoresResponse> {
    const response = await apiClient.get<GetStoresResponse>('/api/stores', query);
    return response;
  },
  
  /**
   * Fetch store details by ID
   * 
   * @param storeId - Store ID
   * @returns Promise with store details
   */
  async getStoreDetails(storeId: string): Promise<GetStoreDetailsResponse> {
    const response = await apiClient.get<GetStoreDetailsResponse>(`/api/stores/${storeId}`);
    return response;
  },
  
  /**
   * Fetch store menu with filtering
   * 
   * @param query - Query parameters including storeId and filters
   * @returns Promise with menu response
   */
  async getStoreMenu(query: GetMenuQuery): Promise<GetMenuResponse> {
    const { storeId, ...params } = query;
    const response = await apiClient.get<GetMenuResponse>(`/api/stores/${storeId}/menu`, params);
    return response;
  },
} as const;

/**
 * Health check service
 */
export const healthService = {
  /**
   * Check API health status
   * 
   * @returns Promise with health check response
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await apiClient.get<{ status: string; timestamp: string }>('/api/health');
    return response;
  },
} as const;

/**
 * Export all services for easy import
 */
export const apiServices = {
  stores: storeService,
  health: healthService,
} as const;