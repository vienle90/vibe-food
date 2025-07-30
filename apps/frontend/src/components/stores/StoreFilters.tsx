import { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, debounce } from '@/lib/utils';
import { STORE_CATEGORIES, SEARCH } from '@/lib/constants';

/**
 * Store filter values interface
 */
export interface StoreFilters {
  search?: string | undefined;
  category?: string | undefined;
}

/**
 * Props for the StoreFilters component
 */
export interface StoreFiltersProps {
  /** Current filter values */
  filters: StoreFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: StoreFilters) => void;
  /** Callback to reset all filters to defaults */
  onResetFilters?: () => void;
  /** Optional className for styling customization */
  className?: string;
  /** Show filter count badge */
  showCount?: boolean;
  /** Number of active filters for count display */
  activeFilterCount?: number;
}

/**
 * StoreFilters component provides search and category filtering functionality.
 * 
 * Features:
 * - Debounced search input (300ms) to prevent excessive API calls
 * - Category filter buttons with active visual states
 * - Clear all filters functionality
 * - Mobile-responsive horizontal scrolling for category buttons
 * - Proper accessibility with ARIA labels and keyboard navigation
 * - Visual feedback for active filters
 * 
 * @component
 * @example
 * ```tsx
 * <StoreFilters 
 *   filters={filters}
 *   onFiltersChange={handleFiltersChange}
 *   showCount={true}
 *   activeFilterCount={2}
 * />
 * ```
 */
export const StoreFilters = ({
  filters,
  onFiltersChange,
  onResetFilters,
  className,
  showCount = false,
  activeFilterCount = 0,
}: StoreFiltersProps): ReactElement => {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const prevFiltersSearchRef = useRef(filters.search);
  
  // Use refs to store latest values for the debounced function
  const filtersRef = useRef(filters);
  const onFiltersChangeRef = useRef(onFiltersChange);
  
  // Update refs when values change
  useEffect(() => {
    filtersRef.current = filters;
    onFiltersChangeRef.current = onFiltersChange;
  });
  
  // Create a stable debounced search function using refs
  const debouncedSearch = useMemo(() => {
    return debounce((value: string) => {
      const trimmedValue = value.trim();
      onFiltersChangeRef.current({
        ...filtersRef.current,
        search: trimmedValue || undefined,
      });
    }, SEARCH.DEBOUNCE_DELAY);
  }, []);
  
  // Handle search input changes
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    
    // Only search if meets minimum length or is empty (to clear)
    if (value.length === 0 || value.length >= SEARCH.MIN_SEARCH_LENGTH) {
      debouncedSearch(value);
    }
  };
  
  // Handle category selection
  const handleCategorySelect = (category: string) => {
    const newCategory: string | undefined = filters.category === category ? undefined : category;
    onFiltersChange({
      ...filters,
      category: newCategory,
    });
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchValue('');
    if (onResetFilters) {
      onResetFilters();
    } else {
      // Fallback to old behavior if onResetFilters not provided
      onFiltersChange({});
    }
  };
  
  // Clear search only
  const handleClearSearch = () => {
    setSearchValue('');
    onFiltersChange({
      ...filters,
      search: undefined as string | undefined,
    });
  };
  
  // Sync search value with external filter changes (only when filters.search changes externally)
  useEffect(() => {
    // Only sync if the external filter value actually changed (not from our own debounced update)
    if (prevFiltersSearchRef.current !== filters.search) {
      setSearchValue(filters.search || '');
      prevFiltersSearchRef.current = filters.search;
    }
  }, [filters.search]);
  
  // Check if any filters are active
  const hasActiveFilters = Boolean(filters.search || filters.category);
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Input Section */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search restaurants, cuisines..."
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-10 pr-10"
          aria-label="Search restaurants"
          maxLength={SEARCH.MAX_SEARCH_LENGTH}
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0 hover:bg-transparent"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Category Filters Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Categories
          </h3>
          
          {/* Clear Filters & Count Badge */}
          <div className="flex items-center gap-2">
            {showCount && activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </Badge>
            )}
            
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
        
        {/* Category Buttons - Horizontal Scrolling on Mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {STORE_CATEGORIES.map((category) => {
              const isActive = filters.category === category.value;
              
              return (
                <Button
                  key={category.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategorySelect(category.value)}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap transition-all',
                    'hover:scale-105 focus:scale-105',
                    isActive && 'shadow-sm'
                  )}
                  aria-pressed={isActive}
                  aria-label={`Filter by ${category.label} category`}
                >
                  <span className="text-base" role="img" aria-hidden="true">
                    {category.emoji}
                  </span>
                  <span className="text-sm font-medium">
                    {category.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Active Filters Summary (for screen readers) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {hasActiveFilters ? (
          <>
            Active filters: 
            {filters.search && ` Search: "${filters.search}"`}
            {filters.category && ` Category: ${STORE_CATEGORIES.find(c => c.value === filters.category)?.label}`}
          </>
        ) : (
          'No active filters'
        )}
      </div>
    </div>
  );
};