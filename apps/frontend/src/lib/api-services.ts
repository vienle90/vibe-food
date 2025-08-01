import { apiClient, createAuthenticatedClient } from './api-client';
import type { 
  GetStoresQuery,
  GetStoresResponse,
  GetStoreDetailsResponse,
  GetMenuQuery,
  GetMenuResponse,
  CreateOrderResponse,
  GetOrdersQuery,
  GetOrdersResponse,
  GetOrderDetailsResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CurrentUserResponse
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
   * Create a new order (requires authentication)
   * 
   * @param orderRequest - Order creation request data
   * @param token - Access token for authentication
   * @returns Promise with order creation response
   */
  async createOrder(orderRequest: any, token: string): Promise<CreateOrderResponse> {
    const authenticatedClient = createAuthenticatedClient(token);
    const response = await authenticatedClient.post<CreateOrderResponse>('/api/orders', orderRequest);
    return response;
  },

  /**
   * Get order history with filtering (requires authentication)
   * 
   * @param query - Query parameters for filtering orders
   * @param token - Access token for authentication
   * @returns Promise with orders response
   */
  async getOrders(query: Partial<GetOrdersQuery> = {}, token: string): Promise<GetOrdersResponse> {
    const authenticatedClient = createAuthenticatedClient(token);
    const response = await authenticatedClient.get<GetOrdersResponse>('/api/orders', query);
    return response;
  },

  /**
   * Get order details by ID (requires authentication)
   * 
   * @param orderId - Order ID
   * @param token - Access token for authentication
   * @returns Promise with order details
   */
  async getOrderDetails(orderId: string, token: string): Promise<GetOrderDetailsResponse> {
    const authenticatedClient = createAuthenticatedClient(token);
    const response = await authenticatedClient.get<GetOrderDetailsResponse>(`/api/orders/${orderId}`);
    return response;
  },

  /**
   * Update order status (requires authentication)
   * 
   * @param orderId - Order ID
   * @param statusUpdate - Status update request
   * @param token - Access token for authentication
   * @returns Promise with status update response  
   */
  async updateOrderStatus(orderId: string, statusUpdate: UpdateOrderStatusRequest, token: string): Promise<UpdateOrderStatusResponse> {
    const authenticatedClient = createAuthenticatedClient(token);
    const response = await authenticatedClient.put<UpdateOrderStatusResponse>(`/api/orders/${orderId}/status`, statusUpdate);
    return response;
  },

  /**
   * Cancel an order (requires authentication)
   * 
   * @param orderId - Order ID
   * @param token - Access token for authentication
   * @returns Promise with cancellation response
   */
  async cancelOrder(orderId: string, token: string): Promise<UpdateOrderStatusResponse> {
    const authenticatedClient = createAuthenticatedClient(token);
    const response = await authenticatedClient.post<UpdateOrderStatusResponse>(`/api/orders/${orderId}/cancel`, {});
    return response;
  },

  /**
   * Reorder a previous order (requires authentication)
   * 
   * @param orderId - Order ID to reorder
   * @param token - Access token for authentication
   * @returns Promise with reorder response containing available and unavailable items
   */
  async reorderOrder(orderId: string, token: string): Promise<{
    availableItems: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    unavailableItems: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      reason: string;
    }>;
    storeId: string;
    storeName: string;
  }> {
    const authenticatedClient = createAuthenticatedClient(token);
    const response = await authenticatedClient.post<{
      availableItems: Array<{
        menuItemId: string;
        name: string;
        quantity: number;
        price: number;
      }>;
      unavailableItems: Array<{
        menuItemId: string;
        name: string;
        quantity: number;
        reason: string;
      }>;
      storeId: string;
      storeName: string;
    }>(`/api/orders/${orderId}/reorder`, {});
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
 * Authentication API services
 */
export const authService = {
  /**
   * User login
   * 
   * @param credentials - Login credentials (email/username and password)
   * @returns Promise with authentication response
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials);
    return response;
  },

  /**
   * User registration
   * 
   * @param userData - Registration data
   * @returns Promise with authentication response
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', userData);
    return response;
  },

  /**
   * User logout
   * 
   * @returns Promise with logout confirmation
   */
  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  /**
   * Get current user profile
   * 
   * @param token - Access token
   * @returns Promise with current user data
   */
  async getCurrentUser(token: string): Promise<CurrentUserResponse> {
    const authenticatedClient = createAuthenticatedClient(token);
    const response = await authenticatedClient.get<CurrentUserResponse>('/api/auth/me');
    return response;
  },

  /**
   * Refresh access token
   * 
   * @returns Promise with new access token
   */
  async refreshToken(): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await apiClient.post<{ accessToken: string; expiresIn: number }>('/api/auth/refresh');
    return response;
  },
} as const;

/**
 * Export all services for easy import
 */
export const apiServices = {
  stores: storeService,
  orders: orderService,
  auth: authService,
  health: healthService,
} as const;