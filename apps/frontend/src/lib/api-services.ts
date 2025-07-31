import { apiClient } from './api-client';
import type { 
  GetStoresQuery,
  GetStoresResponse,
  GetStoreDetailsResponse,
  GetMenuQuery,
  GetMenuResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrdersQuery,
  GetOrdersResponse,
  GetOrderDetailsResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse
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
 * Order API services
 */
export const orderService = {
  /**
   * Create a new order
   * 
   * @param orderRequest - Order creation request data
   * @returns Promise with order creation response
   */
  async createOrder(orderRequest: CreateOrderRequest): Promise<CreateOrderResponse> {
    const response = await apiClient.post<CreateOrderResponse>('/api/orders', orderRequest);
    return response;
  },

  /**
   * Get order history with filtering
   * 
   * @param query - Query parameters for filtering orders
   * @returns Promise with orders response
   */
  async getOrders(query: Partial<GetOrdersQuery> = {}): Promise<GetOrdersResponse> {
    const response = await apiClient.get<GetOrdersResponse>('/api/orders', query);
    return response;
  },

  /**
   * Get order details by ID
   * 
   * @param orderId - Order ID
   * @returns Promise with order details
   */
  async getOrderDetails(orderId: string): Promise<GetOrderDetailsResponse> {
    const response = await apiClient.get<GetOrderDetailsResponse>(`/api/orders/${orderId}`);
    return response;
  },

  /**
   * Update order status
   * 
   * @param orderId - Order ID
   * @param statusUpdate - Status update request
   * @returns Promise with status update response  
   */
  async updateOrderStatus(orderId: string, statusUpdate: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResponse> {
    const response = await apiClient.put<UpdateOrderStatusResponse>(`/api/orders/${orderId}/status`, statusUpdate);
    return response;
  },

  /**
   * Cancel an order
   * 
   * @param orderId - Order ID
   * @returns Promise with cancellation response
   */
  async cancelOrder(orderId: string): Promise<UpdateOrderStatusResponse> {
    const response = await apiClient.post<UpdateOrderStatusResponse>(`/api/orders/${orderId}/cancel`, {});
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