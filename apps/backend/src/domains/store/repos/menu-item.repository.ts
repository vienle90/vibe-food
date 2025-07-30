import { PrismaClient, MenuItem } from '@prisma/client';
import { CreateMenuItemData, UpdateMenuItemData, MenuItemFilters } from '@vibe/shared';

export class MenuItemRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findByStoreId(storeId: string, filters?: MenuItemFilters): Promise<MenuItem[]> {
    const where: any = {
      storeId,
      ...(filters?.isAvailable !== undefined && { isAvailable: filters.isAvailable }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters?.minPrice && { price: { gte: filters.minPrice } }),
      ...(filters?.maxPrice && { price: { lte: filters.maxPrice } }),
    };

    return this.prisma.menuItem.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findById(id: string): Promise<MenuItem | null> {
    return this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });
  }

  async create(data: CreateMenuItemData): Promise<MenuItem> {
    const createData: any = {
      ...data,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
    };
    
    if (data.nutritionalInfo) {
      createData.nutritionalInfo = data.nutritionalInfo;
    }
    
    return this.prisma.menuItem.create({
      data: createData,
    });
  }

  async update(id: string, data: UpdateMenuItemData): Promise<MenuItem> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
    if (data.preparationTime !== undefined) updateData.preparationTime = data.preparationTime;
    if (data.allergens !== undefined) updateData.allergens = data.allergens;
    if (data.nutritionalInfo !== undefined) {
      if (data.nutritionalInfo) {
        updateData.nutritionalInfo = data.nutritionalInfo;
      } else {
        updateData.nutritionalInfo = null;
      }
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<void> {
    // Check if the menu item has any order references
    const orderItemCount = await this.prisma.orderItem.count({
      where: { menuItemId: id },
    });

    if (orderItemCount > 0) {
      // Soft delete: mark as unavailable if referenced by orders
      await this.prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
      });
    } else {
      // Hard delete if no order references
      await this.prisma.menuItem.delete({
        where: { id },
      });
    }
  }

  async getCategories(storeId: string): Promise<string[]> {
    const categories = await this.prisma.menuItem.findMany({
      where: {
        storeId,
        isAvailable: true,
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    return categories.map(item => item.category);
  }

  async checkOwnership(menuItemId: string, userId: string): Promise<boolean> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        store: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    return menuItem?.store.ownerId === userId;
  }

  async updateImage(id: string, imageUrl: string): Promise<MenuItem> {
    return this.prisma.menuItem.update({
      where: { id },
      data: { imageUrl },
    });
  }
}