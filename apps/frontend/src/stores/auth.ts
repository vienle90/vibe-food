import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser } from '@vibe/shared';

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: AuthUser, token: string) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user, token) => set({ 
        user, 
        accessToken: token, 
        isAuthenticated: true,
        error: null 
      }),

      clearUser: () => set({ 
        user: null, 
        accessToken: null, 
        isAuthenticated: false,
        error: null 
      }),

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error })
    }),
    {
      name: 'vibe-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
);

// Individual selector hooks (prevents re-render loops)
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAccessToken = () => useAuthStore((state) => state.accessToken);

// Action hooks
export const useSetUser = () => useAuthStore((state) => state.setUser);
export const useClearUser = () => useAuthStore((state) => state.clearUser);
export const useSetAuthLoading = () => useAuthStore((state) => state.setLoading);
export const useSetAuthError = () => useAuthStore((state) => state.setError);