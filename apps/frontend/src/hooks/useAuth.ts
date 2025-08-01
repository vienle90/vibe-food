import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { LoginRequest, RegisterRequest } from '@vibe/shared';
import { authService } from '@/lib/api-services';
import { 
  useAuthStore,
  useSetUser, 
  useClearUser, 
  useSetAuthLoading, 
  useSetAuthError,
  useAccessToken,
  useAuthUser,
  useIsAuthenticated
} from '@/stores/auth';
import { ApiError, NetworkError } from '@/lib/errors';

export function useAuth() {
  const router = useRouter();
  const setUser = useSetUser();
  const clearUser = useClearUser();
  const setLoading = useSetAuthLoading();
  const setError = useSetAuthError();
  const accessToken = useAccessToken();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  // Initialize user from token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (accessToken && !user) {
        try {
          setLoading(true);
          const response = await authService.getCurrentUser(accessToken);
          setUser(response.user, accessToken);
        } catch (error) {
          // console.warn('Failed to initialize user from token:', error);
          clearUser();
        } finally {
          setLoading(false);
        }
      }
    };

    initializeAuth();
  }, [accessToken, user, setUser, clearUser, setLoading]);

  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(credentials);
      setUser(response.user, response.accessToken);
      
      toast.success(`Welcome back, ${response.user.firstName}!`);
      return response;
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (error instanceof ApiError) {
        if (error.status === 401) {
          errorMessage = 'Invalid email/username or password.';
        } else if (error.status === 429) {
          errorMessage = 'Too many login attempts. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof NetworkError) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setError]);

  const register = useCallback(async (userData: RegisterRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.register(userData);
      setUser(response.user, response.accessToken);
      
      toast.success(`Welcome to Vibe, ${response.user.firstName}!`);
      return response;
    } catch (error) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error instanceof ApiError) {
        if (error.status === 409) {
          errorMessage = 'This email or username is already registered.';
        } else if (error.status === 400) {
          errorMessage = 'Please check your information and try again.';
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof NetworkError) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setError]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Call logout endpoint if user is authenticated
      if (isAuthenticated) {
        await authService.logout();
      }
      
      clearUser();
      toast.success('Logged out successfully');
      
      // Redirect to home page
      router.push('/');
    } catch (error) {
      // Even if logout API fails, clear local state
      clearUser();
      // console.warn('Logout API failed, but cleared local state:', error);
      toast.success('Logged out successfully');
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [clearUser, setLoading, isAuthenticated, router]);

  const refreshToken = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      
      // Update token in store
      if (user) {
        setUser(user, response.accessToken);
      }
      
      return response.accessToken;
    } catch (error) {
      // console.warn('Token refresh failed:', error);
      clearUser();
      throw error;
    }
  }, [user, setUser, clearUser]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading: useAuthStore((state) => state.isLoading),
    error: useAuthStore((state) => state.error),
    
    // Actions
    login,
    register,
    logout,
    refreshToken,
    
    // Utilities
    clearError: () => setError(null),
  };
}