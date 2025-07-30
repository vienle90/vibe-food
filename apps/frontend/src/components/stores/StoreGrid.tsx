import { ReactElement } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { StoreCard } from './StoreCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Store data interface (matching API response)
 */
interface Store {
  id: string;
  name: string;
  description: string | null;
  category: string;
  rating: number | null;
  deliveryFee: number;
  estimatedDeliveryTime: number;
  minimumOrder: number;
  address: string;
  isActive: boolean;
}

/**
 * Props for the StoreGrid component
 */
export interface StoreGridProps {
  /** Array of stores to display */
  stores?: Store[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Callback when store is selected */
  onStoreSelect?: (store: Store) => void;
  /** Callback to retry on error */
  onRetry?: () => void;
  /** Optional className for styling customization */
  className?: string;
  /** Number of skeleton cards to show while loading */
  skeletonCount?: number;
  /** Grid layout variant */
  variant?: 'default' | 'compact';
}

/**
 * StoreGrid component displays a responsive grid of store cards with loading and error states.
 * 
 * Features:
 * - Responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 * - Loading states with skeleton cards
 * - Empty state with helpful messaging
 * - Error state with retry functionality
 * - Proper accessibility and keyboard navigation
 * - Different layout variants for different use cases
 * 
 * @component
 * @example
 * ```tsx
 * <StoreGrid 
 *   stores={stores}
 *   isLoading={isLoading}
 *   error={error}
 *   onStoreSelect={handleStoreSelect}
 *   onRetry={handleRetry}
 * />
 * ```
 */
export const StoreGrid = ({
  stores = [],
  isLoading = false,
  error = null,
  emptyMessage = "No stores found",
  emptyDescription = "Try adjusting your filters or search terms",
  onStoreSelect,
  onRetry,
  className,
  skeletonCount = 12,
  variant = 'default',
}: StoreGridProps): ReactElement => {
  // Grid classes based on variant
  const gridClasses = cn(
    'grid gap-4 w-full',
    {
      // Default: responsive grid with proper spacing
      'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6': variant === 'default',
      // Compact: tighter spacing, more columns on larger screens
      'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4': variant === 'compact',
    }
  );

  // Handle loading state
  if (isLoading) {
    return (
      <div className={cn(gridClasses, className)} role="status" aria-label="Loading stores">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <StoreCardSkeleton key={index} variant={variant} />
        ))}
        <span className="sr-only">Loading stores...</span>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load stores</AlertTitle>
          <AlertDescription className="mb-4">
            {error.message || 'An error occurred while loading stores. Please try again.'}
          </AlertDescription>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
              Try again
            </Button>
          )}
        </Alert>
      </div>
    );
  }

  // Handle empty state
  if (stores.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {emptyMessage}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
          {emptyDescription}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Refresh stores
          </Button>
        )}
      </div>
    );
  }

  // Render stores grid
  return (
    <div className={cn(gridClasses, className)}>
      {stores.map((store, index) => {
        const cardProps: Parameters<typeof StoreCard>[0] = {
          store,
          priority: index < 6, // Prioritize loading for first 6 images
        };
        
        // Only add onSelect if it's defined
        if (onStoreSelect) {
          cardProps.onSelect = onStoreSelect;
        }
        
        return <StoreCard key={store.id} {...cardProps} />;
      })}
    </div>
  );
};

/**
 * Skeleton card component for loading states
 */
interface StoreCardSkeletonProps {
  variant?: 'default' | 'compact';
}

const StoreCardSkeleton = ({ variant = 'default' }: StoreCardSkeletonProps): ReactElement => {
  const imageHeight = variant === 'compact' ? 'h-32' : 'h-40';
  
  return (
    <div className="rounded-lg border bg-card overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <Skeleton className={cn('w-full', imageHeight)} />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title and description */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-4 rounded-sm" />
            ))}
          </div>
          <Skeleton className="h-4 w-8" />
        </div>
        
        {/* Delivery info */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Minimum order */}
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
};