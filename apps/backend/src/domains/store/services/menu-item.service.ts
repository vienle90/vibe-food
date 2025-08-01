import { 
  GetMenuQuery, 
  GetMenuResponse, 
  CreateMenuItemRequest, 
  CreateMenuItemResponse,
  UpdateMenuItemRequest,
  UpdateMenuItemResponse,
  DeleteMenuItemResponse,
  NotFoundError,
  ForbiddenError,
} from '@vibe/shared';
import { MenuItemRepository } from '../repos/menu-item.repository';
import { StoreRepository } from '../repos/store.repository';

export class MenuItemService {
  private menuItemRepository: MenuItemRepository;
  private storeRepository: StoreRepository;

  constructor() {
    this.menuItemRepository = new MenuItemRepository();
    this.storeRepository = new StoreRepository();
  }

  async getMenu(query: GetMenuQuery): Promise<GetMenuResponse> {
    const { storeId, category, search, available } = query;

    // Verify store exists and is active
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundError('Store not found or unavailable');
    }

    // Get menu items with optional filters
    const filters: any = {};
    if (category) {filters.category = category;}
    if (search) {filters.search = search;}
    if (available !== undefined) {filters.isAvailable = available;}
    
    const menuItems = await this.menuItemRepository.findByStoreId(storeId, filters);

    // Get unique categories
    const categories = await this.menuItemRepository.getCategories(storeId);

    // Transform Prisma Decimal fields to numbers for JSON serialization
    const transformedMenuItems = menuItems.map(item => ({
      ...item,
      description: item.description || undefined,
      imageUrl: item.imageUrl || undefined,
      nutritionalInfo: item.nutritionalInfo ? item.nutritionalInfo as any : undefined,
      price: Number(item.price),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return {
      storeId,
      storeName: store.name,
      menuItems: transformedMenuItems,
      categories,
      total: menuItems.length,
    };
  }

  async createMenuItem(
    data: CreateMenuItemRequest, 
    userId: string
  ): Promise<CreateMenuItemResponse> {
    // Verify store ownership
    const store = await this.storeRepository.findById(data.storeId);
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    if (store.ownerId !== userId) {
      throw new ForbiddenError('You can only manage menu items for your own stores');
    }

    // Create menu item
    const menuItem = await this.menuItemRepository.create({
      ...data,
      storeId: data.storeId as any, // Type cast for branded type
      nutritionalInfo: data.nutritionalInfo || undefined,
    });

    return {
      id: menuItem.id,
      name: menuItem.name,
      price: Number(menuItem.price),
      category: menuItem.category,
      isAvailable: menuItem.isAvailable,
      createdAt: menuItem.createdAt.toISOString(),
    };
  }

  async updateMenuItem(
    menuItemId: string,
    data: UpdateMenuItemRequest,
    userId: string
  ): Promise<UpdateMenuItemResponse> {
    // Verify menu item exists and check ownership
    const menuItem = await this.menuItemRepository.findById(menuItemId);
    if (!menuItem) {
      throw new NotFoundError('Menu item not found');
    }

    // Check ownership through store relationship
    if ((menuItem as any).store?.ownerId !== userId) {
      throw new ForbiddenError('You can only manage menu items for your own stores');
    }

    // Update menu item
    const cleanData: any = {};
    Object.keys(data).forEach(key => {
      if (data[key as keyof typeof data] !== undefined) {
        cleanData[key] = data[key as keyof typeof data];
      }
    });
    
    const updatedMenuItem = await this.menuItemRepository.update(menuItemId, cleanData);

    return {
      id: updatedMenuItem.id,
      name: updatedMenuItem.name,
      price: Number(updatedMenuItem.price),
      category: updatedMenuItem.category,
      isAvailable: updatedMenuItem.isAvailable,
      updatedAt: updatedMenuItem.updatedAt.toISOString(),
    };
  }

  async deleteMenuItem(
    menuItemId: string, 
    userId: string
  ): Promise<DeleteMenuItemResponse> {
    // Verify menu item exists and check ownership
    const menuItem = await this.menuItemRepository.findById(menuItemId);
    if (!menuItem) {
      throw new NotFoundError('Menu item not found');
    }

    // Check ownership through store relationship
    if ((menuItem as any).store?.ownerId !== userId) {
      throw new ForbiddenError('You can only manage menu items for your own stores');
    }

    // Delete menu item (handles soft delete automatically if has order references)
    await this.menuItemRepository.delete(menuItemId);

    return {
      success: true,
      message: 'Menu item deleted successfully',
    };
  }

  async uploadMenuItemImage(
    menuItemId: string,
    imageUrl: string,
    userId: string
  ): Promise<{ imageUrl: string; message: string }> {
    // Verify menu item exists and check ownership
    const menuItem = await this.menuItemRepository.findById(menuItemId);
    if (!menuItem) {
      throw new NotFoundError('Menu item not found');
    }

    // Check ownership through store relationship
    if ((menuItem as any).store?.ownerId !== userId) {
      throw new ForbiddenError('You can only manage menu items for your own stores');
    }

    // Update menu item with new image URL
    await this.menuItemRepository.updateImage(menuItemId, imageUrl);

    return {
      imageUrl,
      message: 'Image uploaded successfully',
    };
  }

  async checkStoreOwnership(storeId: string, userId: string): Promise<boolean> {
    const store = await this.storeRepository.findById(storeId);
    return store?.ownerId === userId;
  }
}