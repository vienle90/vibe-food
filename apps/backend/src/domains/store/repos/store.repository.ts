
import { PrismaClient, Store } from '@prisma/client';
import { StoreFilters, StoreSortOptions } from '../types/store.types';

export class StoreRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findMany(
    filters: StoreFilters,
    sort: StoreSortOptions,
    page: number,
    limit: number,
  ): Promise<{ stores: Store[]; total: number }> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderByClause(sort);

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.store.count({ where }),
    ]);

    return { stores, total };
  }

  private buildWhereClause(filters: StoreFilters) {
    const where: any = {
      isActive: filters.isActive ?? true,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderByClause(sort: StoreSortOptions) {
    return { [sort.field]: sort.direction };
  }

  async findByIdWithDetails(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: {
        id: storeId,
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        menuItems: {
          where: {
            isAvailable: true,
          },
          select: {
            category: true,
          },
        },
        _count: {
          select: {
            orders: true,
            menuItems: true,
          },
        },
      },
    });

    if (!store) {
      return null;
    }

    // Extract unique menu categories
    const menuCategories = [...new Set(store.menuItems.map(item => item.category))];

    return {
      ...store,
      menuCategories,
      menuItems: undefined, // Remove the menu items array since we only needed categories
    };
  }

  async findById(storeId: string): Promise<Store | null> {
    return this.prisma.store.findUnique({
      where: {
        id: storeId,
        isActive: true,
      },
    });
  }

  async findByOwnerId(ownerId: string): Promise<any[]> {
    const stores = await this.prisma.store.findMany({
      where: {
        ownerId: ownerId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            orders: true,
            menuItems: true,
          },
        },
      },
    });

    return stores.map(store => ({
      ...store,
      totalOrders: store._count.orders,
    }));
  }
}
