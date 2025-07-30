'use client';

import { ReactElement, ReactNode, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from './query-client';
import { isDevelopment } from './env';

/**
 * Props for the QueryProvider component
 */
interface QueryProviderProps {
  children: ReactNode;
}

/**
 * TanStack Query provider component
 * Creates a new QueryClient instance for each component tree
 * 
 * @param props - Component props
 * @returns Provider component
 */
export function QueryProvider({ children }: QueryProviderProps): ReactElement {
  // Create a stable QueryClient instance
  const [queryClient] = useState(() => createQueryClient());
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isDevelopment && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  );
}

/**
 * Props for the RootProviders component
 */
interface RootProvidersProps {
  children: ReactNode;
}

/**
 * Root providers component that combines all providers
 * Add new providers here as needed
 * 
 * @param props - Component props
 * @returns Combined providers
 */
export function RootProviders({ children }: RootProvidersProps): ReactElement {
  return (
    <QueryProvider>
      {children}
    </QueryProvider>
  );
}