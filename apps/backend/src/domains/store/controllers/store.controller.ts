
import { NextFunction, Request, Response } from 'express';
import { StoreService } from '../services/store.service';
import { GetStoresQuery } from '@vibe/shared';

export class StoreController {
  private storeService: StoreService;

  constructor() {
    this.storeService = new StoreService();
  }

  getStores = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as GetStoresQuery;
      const result = await this.storeService.getStores(query);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  getStoreById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.storeService.getStoreDetails(id!);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
