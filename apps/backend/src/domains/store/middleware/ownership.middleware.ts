import { Request, Response, NextFunction } from 'express';
import { StoreRepository } from '../repos/store.repository';
import { MenuItemRepository } from '../repos/menu-item.repository';
import { ForbiddenError, NotFoundError } from '@vibe/shared';

export class OwnershipMiddleware {
  private storeRepository: StoreRepository;
  private menuItemRepository: MenuItemRepository;

  constructor() {
    this.storeRepository = new StoreRepository();
    this.menuItemRepository = new MenuItemRepository();
  }

  /**
   * Middleware to verify store ownership
   * Expects storeId in route parameters and userId in req.user
   */
  verifyStoreOwnership = async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const storeId = req.params.storeId || req.body.storeId;
      const userId = req.user?.id;

      if (!storeId) {
        throw new NotFoundError('Store ID is required');
      }

      if (!userId) {
        throw new ForbiddenError('Authentication required');
      }

      const store = await this.storeRepository.findById(storeId);
      if (!store) {
        throw new NotFoundError('Store not found');
      }

      if (store.ownerId !== userId) {
        throw new ForbiddenError('You can only manage your own stores');
      }

      // Attach store to request for downstream use
      req.store = store;
      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Middleware to verify menu item ownership through store relationship
   * Expects menuItemId in route parameters and userId in req.user
   */
  verifyMenuItemOwnership = async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const menuItemId = req.params.menuItemId || req.params.itemId;
      const userId = req.user?.id;

      if (!menuItemId) {
        throw new NotFoundError('Menu item ID is required');
      }

      if (!userId) {
        throw new ForbiddenError('Authentication required');
      }

      const menuItem = await this.menuItemRepository.findById(menuItemId);
      if (!menuItem) {
        throw new NotFoundError('Menu item not found');
      }

      // Check ownership through store relationship
      if ((menuItem as any).store?.ownerId !== userId) {
        throw new ForbiddenError('You can only manage menu items for your own stores');
      }

      // Attach menu item to request for downstream use
      req.menuItem = menuItem;
      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Middleware to verify store owner role
   * Ensures user has STORE_OWNER or ADMIN role
   */
  verifyStoreOwnerRole = async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;

      if (!userRole) {
        throw new ForbiddenError('Authentication required');
      }

      if (userRole !== 'STORE_OWNER' && userRole !== 'ADMIN') {
        throw new ForbiddenError('Store owner or admin role required');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Create singleton instance for reuse
const ownershipMiddleware = new OwnershipMiddleware();

// Export individual middleware functions
export const verifyStoreOwnership = ownershipMiddleware.verifyStoreOwnership;
export const verifyMenuItemOwnership = ownershipMiddleware.verifyMenuItemOwnership;
export const verifyStoreOwnerRole = ownershipMiddleware.verifyStoreOwnerRole;