import { NextFunction, Request, Response } from 'express';
import { 
  GetMenuQuery, 
  CreateMenuItemRequest, 
  UpdateMenuItemRequest,
} from '@vibe/shared';
import { MenuItemService } from '../services/menu-item.service';

export class MenuController {
  private menuItemService: MenuItemService;

  constructor() {
    this.menuItemService = new MenuItemService();
  }

  /**
   * GET /api/stores/:storeId/menu
   * Get menu items for a specific store
   */
  getMenu = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query: GetMenuQuery = {
        storeId: req.params.storeId!,
        category: req.query.category as string,
        search: req.query.search as string,
        available: req.query.available ? req.query.available === 'true' : undefined,
      };

      const result = await this.menuItemService.getMenu(query);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/stores/:storeId/menu
   * Create a new menu item (store owners only)
   */
  createMenuItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreateMenuItemRequest = {
        ...req.body,
        storeId: req.params.storeId!,
      };

      const userId = req.user!.id; // Authenticated by middleware
      const result = await this.menuItemService.createMenuItem(data, userId);
      
      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/menu-items/:itemId
   * Update a menu item (store owners only)
   */
  updateMenuItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menuItemId = req.params.itemId!;
      const data: UpdateMenuItemRequest = req.body;
      const userId = req.user!.id; // Authenticated by middleware

      const result = await this.menuItemService.updateMenuItem(menuItemId, data, userId);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/menu-items/:itemId
   * Delete a menu item (store owners only)
   */
  deleteMenuItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menuItemId = req.params.itemId!;
      const userId = req.user!.id; // Authenticated by middleware

      const result = await this.menuItemService.deleteMenuItem(menuItemId, userId);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/menu-items/:itemId/image
   * Upload image for a menu item (store owners only)
   */
  uploadMenuItemImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menuItemId = req.params.itemId!;
      const userId = req.user!.id; // Authenticated by middleware

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided',
          timestamp: new Date().toISOString(),
        });
      }

      // Generate image URL (in production, this would be a CDN URL)
      const imageUrl = `/uploads/${req.file.filename}`;

      const result = await this.menuItemService.uploadMenuItemImage(
        menuItemId,
        imageUrl,
        userId
      );
      
      return res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  };
}