import { env } from './env';
import { ApiError, NetworkError } from './errors';
import { API_CONFIG } from './constants';

/**
 * API client configuration and utilities
 * Following CLAUDE.md API integration patterns
 */

export interface RequestConfig extends RequestInit {
  timeout?: number;
}

/**
 * Custom fetch wrapper with error handling and timeout
 * 
 * @param url - Request URL
 * @param config - Request configuration
 * @returns Promise with response
 */
async function fetchWithTimeout(
  url: string, 
  config: RequestConfig = {}
): Promise<Response> {
  const { timeout = API_CONFIG.TIMEOUT, ...restConfig } = config;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...restConfig,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('Request timed out');
    }
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new NetworkError('Network error. Please check your connection.');
    }
    
    throw error;
  }
}

/**
 * Main API client class
 */
class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = env.NEXT_PUBLIC_API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  /**
   * GET request
   * 
   * @param endpoint - API endpoint
   * @param params - Query parameters
   * @param config - Request configuration
   * @returns Promise with typed response
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...config?.headers,
      },
      ...config,
    });
    
    return this.handleResponse<T>(response);
  }
  
  /**
   * POST request
   * 
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param config - Request configuration
   * @returns Promise with typed response
   */
  async post<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const response = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config?.headers,
      },
      body: data ? JSON.stringify(data) : null,
      ...config,
    });
    
    return this.handleResponse<T>(response);
  }
  
  /**
   * PUT request
   * 
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param config - Request configuration
   * @returns Promise with typed response
   */
  async put<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const response = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config?.headers,
      },
      body: data ? JSON.stringify(data) : null,
      ...config,
    });
    
    return this.handleResponse<T>(response);
  }
  
  /**
   * DELETE request
   * 
   * @param endpoint - API endpoint
   * @param config - Request configuration
   * @returns Promise with typed response
   */
  async delete<T>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<T> {
    const response = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        ...config?.headers,
      },
      ...config,
    });
    
    return this.handleResponse<T>(response);
  }
  
  /**
   * Handle API response and error cases
   * 
   * @param response - Fetch response
   * @returns Parsed response data
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    let data: any;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error) {
      throw new ApiError(
        response.status,
        'Failed to parse response',
        'PARSE_ERROR'
      );
    }
    
    if (!response.ok) {
      const message = isJson && data?.message 
        ? data.message 
        : `HTTP ${response.status}: ${response.statusText}`;
      
      const code = isJson && data?.code ? data.code : `HTTP_${response.status}`;
      
      throw new ApiError(response.status, message, code);
    }
    
    // Extract data from wrapper if it exists (for API responses with success/data structure)
    if (isJson && data && typeof data === 'object' && 'success' in data && 'data' in data) {
      return data.data;
    }
    
    return data;
  }
}

/**
 * Singleton API client instance
 */
export const apiClient = new ApiClient();

/**
 * Create API client with authentication
 * 
 * @param token - Authentication token
 * @returns API client with auth headers
 */
export function createAuthenticatedClient(token: string) {
  return {
    get: <T>(endpoint: string, params?: Record<string, any>, config?: RequestConfig) =>
      apiClient.get<T>(endpoint, params, {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: `Bearer ${token}`,
        },
      }),
      
    post: <T>(endpoint: string, data?: any, config?: RequestConfig) =>
      apiClient.post<T>(endpoint, data, {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: `Bearer ${token}`,
        },
      }),
      
    put: <T>(endpoint: string, data?: any, config?: RequestConfig) =>
      apiClient.put<T>(endpoint, data, {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: `Bearer ${token}`,
        },
      }),
      
    delete: <T>(endpoint: string, config?: RequestConfig) =>
      apiClient.delete<T>(endpoint, {
        ...config,
        headers: {
          ...config?.headers,
          Authorization: `Bearer ${token}`,
        },
      }),
  };
}