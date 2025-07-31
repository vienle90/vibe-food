import { ReactElement } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function StoreDetailsSkeleton(): ReactElement {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Skeleton */}
      <div className="relative">
        <Skeleton className="h-[200px] md:h-[300px] w-full" />
        
        {/* Store Info Skeleton */}
        <div className="container mx-auto px-4">
          <div className="relative -mt-16 bg-background rounded-lg shadow-lg p-6 md:p-8">
            <div className="space-y-4">
              {/* Name and Category */}
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
              
              {/* Description */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              
              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Skeleton className="h-4 w-4 mt-0.5" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Navigation Skeleton */}
      <div className="container mx-auto px-4 py-6">
        <div className="sticky top-0 z-10 bg-background border-b py-4">
          <div className="flex gap-2 overflow-x-auto">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 flex-shrink-0" />
            ))}
          </div>
        </div>
        
        {/* Search Bar Skeleton */}
        <div className="mt-6">
          <Skeleton className="h-10 w-full" />
        </div>
        
        {/* Menu Items Skeleton */}
        <div className="mt-8 space-y-8">
          {[...Array(3)].map((_, categoryIndex) => (
            <div key={categoryIndex}>
              <Skeleton className="h-7 w-32 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, itemIndex) => (
                  <div key={itemIndex} className="rounded-lg border p-4 space-y-3">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-9 w-full mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}