
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
}
