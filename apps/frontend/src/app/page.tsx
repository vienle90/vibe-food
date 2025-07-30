'use client';

import { ReactElement, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { StoreFilters, StoreGrid } from '@/components/stores';
import { useStores, useUrlState } from '@/hooks';
import { Separator } from '@/components/ui/separator';

// Stable default values to prevent infinite re-renders
const DEFAULT_FILTER_VALUES = {
  sort: 'rating' as const,
  limit: 12,
  page: 1,
};

/**
 * Homepage wrapper component that handles Suspense boundary
 */
function HomePageContent(): ReactElement {
  const router = useRouter();
  
  // URL state management for shareable filters
  const {
    filters: urlFilters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useUrlState({
    defaultValues: DEFAULT_FILTER_VALUES,
  });
  
  // Fetch stores with current filters
  const {
    stores,
    isLoading,
    isError,
    error,
    pagination,
    refetch,
  } = useStores(urlFilters);
  
  // Handle store selection - navigate to store details
  const handleStoreSelect = (store: any) => {
    router.push(`/stores/${store.id}`);
  };
  
  // Handle filter changes
  const handleFiltersChange = (newFilters: any) => {
    // Reset to page 1 when filters change (except page changes)
    const updates = { ...newFilters };
    if (!('page' in newFilters)) {
      updates.page = 1;
    }
    
    updateFilters(updates);
  };
  
  // Handle retry on error
  const handleRetry = () => {
    refetch();
  };
  
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header Section */}
        <header className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Discover Great Food
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find the best restaurants near you and get your favorite meals delivered fresh and fast.
            </p>
          </div>
          
          {/* Filters Section */}
          <div className="max-w-4xl mx-auto">
            <StoreFilters
              filters={{
                search: urlFilters.search,
                category: urlFilters.category,
              }}
              onFiltersChange={handleFiltersChange}
              onResetFilters={resetFilters}
              showCount={true}
              activeFilterCount={activeFilterCount}
            />
          </div>
        </header>
        
        <Separator className="mb-8" />
        
        {/* Results Section */}
        <section className="mb-8">
          {/* Results Header */}
          {!isLoading && !isError && (
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">
                  {pagination.total > 0 ? (
                    <>
                      {pagination.total} restaurant{pagination.total !== 1 ? 's' : ''} found
                    </>
                  ) : (
                    'No restaurants found'
                  )}
                </h2>
                
                {hasActiveFilters && (
                  <div className="text-sm text-muted-foreground">
                    {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              {/* Sorting could be added here in the future */}
            </div>
          )}
          
          {/* Store Grid */}
          <StoreGrid
            stores={stores}
            isLoading={isLoading}
            error={isError ? error : null}
            onStoreSelect={handleStoreSelect}
            onRetry={handleRetry}
            emptyMessage="No restaurants match your criteria"
            emptyDescription="Try adjusting your search terms or category filters to find more options."
            skeletonCount={12}
            variant="default"
          />
        </section>
        
        {/* Pagination Section */}
        {pagination.total > pagination.limit && !isLoading && !isError && (
          <section className="flex justify-center">
            <div className="flex items-center gap-2">
              {/* Simple pagination - can be enhanced later */}
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
              </div>
              
              {pagination.hasPreviousPage && (
                <button
                  onClick={() => handleFiltersChange({ page: pagination.page - 1 })}
                  className="px-3 py-1 text-sm border rounded hover:bg-muted"
                >
                  Previous
                </button>
              )}
              
              {pagination.hasNextPage && (
                <button
                  onClick={() => handleFiltersChange({ page: pagination.page + 1 })}
                  className="px-3 py-1 text-sm border rounded hover:bg-muted"
                >
                  Next
                </button>
              )}
            </div>
          </section>
        )}
        
        {/* Footer Section */}
        <footer className="mt-16 text-center">
          <div className="text-sm text-muted-foreground">
            <p>🚀 Powered by Vibe Food Ordering Platform</p>
            <p className="mt-1">Discover. Order. Enjoy.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

/**
 * Homepage component with Suspense boundary for useSearchParams.
 * 
 * Features:
 * - Full store discovery with filtering and search
 * - URL state management for shareable filters
 * - Responsive design for all devices
 * - Loading states and error handling
 * - Integrated pagination and navigation
 * 
 * This is the main entry point for users to discover restaurants
 * and browse available food options.
 */
export default function HomePage(): ReactElement {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading restaurants...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}