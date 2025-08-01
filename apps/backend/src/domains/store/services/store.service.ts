
import { GetStoresQuery, GetStoresResponse, GetStoreDetailsResponse, NotFoundError } from '@vibe/shared';
import { StoreRepository } from '../repos/store.repository';
import { StoreSortOptions } from '../types/store.types';

export class StoreService {
  private storeRepository: StoreRepository;

  constructor() {
    this.storeRepository = new StoreRepository();
  }

  async getStores(query: GetStoresQuery): Promise<GetStoresResponse> {
    const { page = 1, limit = 10, sort = 'rating', ...filters } = query;

    const sortOptions = this.buildSortOptions(sort);

    const { stores, total } = await this.storeRepository.findMany(
      filters,
      sortOptions,
      page,
      limit,
    );

    // Transform Prisma Decimal fields to numbers for JSON serialization
    const transformedStores = stores.map(store => ({
      ...store,
      rating: store.rating ? Number(store.rating) : null,
      deliveryFee: Number(store.deliveryFee),
      minimumOrder: Number(store.minimumOrder),
      operatingHours: (store.operatingHours as Record<string, any>) || {},
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    }));

    return { 
      stores: transformedStores,
      total, 
      page, 
      limit 
    };
  }

  async getStoreDetails(storeId: string): Promise<GetStoreDetailsResponse> {
    const store = await this.storeRepository.findByIdWithDetails(storeId);
    
    if (!store) {
      throw new NotFoundError('Store not found or unavailable');
    }

    // Transform Prisma Decimal fields to numbers for JSON serialization
    return {
      ...store,
      rating: store.rating ? Number(store.rating) : undefined,
      totalOrders: store.totalOrders,
      deliveryFee: Number(store.deliveryFee),
      minimumOrder: Number(store.minimumOrder),
      operatingHours: (store.operatingHours as Record<string, any>) || {},
      email: store.email || undefined,
      phone: store.phone || undefined,
      description: store.description || undefined,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  async getStoresByOwner(ownerId: string): Promise<{ stores: GetStoreDetailsResponse[] }> {
    const stores = await this.storeRepository.findByOwnerId(ownerId);
    
    // Transform Prisma Decimal fields to numbers for JSON serialization
    const transformedStores = stores.map(store => ({
      ...store,
      rating: store.rating ? Number(store.rating) : undefined,
      totalOrders: store.totalOrders || 0,
      deliveryFee: Number(store.deliveryFee),
      minimumOrder: Number(store.minimumOrder),
      operatingHours: (store.operatingHours as Record<string, any>) || {},
      email: store.email || undefined,
      phone: store.phone || undefined,
      description: store.description || undefined,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    }));
    
    return { stores: transformedStores };
  }

  private buildSortOptions(sort: string): StoreSortOptions {
    switch (sort) {
      case 'name':
        return { field: 'name', direction: 'asc' };
      case 'createdAt':
        return { field: 'createdAt', direction: 'desc' };
      case 'relevance':
        // For simplicity, we'll sort by rating for relevance for now.
        // A more complex implementation could use full-text search ranking.
        return { field: 'rating', direction: 'desc' };
      case 'rating':
      default:
        return { field: 'rating', direction: 'desc' };
    }
  }
}
