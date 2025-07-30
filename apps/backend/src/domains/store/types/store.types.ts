import { StoreCategory } from '@vibe/shared';

export interface StoreFilters {
  category?: StoreCategory | undefined;
  search?: string | undefined;
  isActive?: boolean | undefined;
}

export interface StoreSortOptions {
  field: 'name' | 'rating' | 'createdAt' | 'totalOrders';
  direction: 'asc' | 'desc';
}
