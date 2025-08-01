import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../infrastructure/cache/cache.service';
import pino from 'pino';

const logger = pino({ name: 'cache-middleware' });

export interface CacheMiddlewareOptions {
  ttl?: number; // Cache TTL in seconds
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipCache?: (req: Request) => boolean; // Skip caching condition
}

/**
 * Generic cache middleware that caches API responses
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if condition is met
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(req)
        : generateDefaultKey(req);

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug({ key: cacheKey }, 'Serving from cache');
        
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${options.ttl || 300}`,
        });
        
        return res.json(cached);
      }

      // Cache miss - intercept response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache the response data
        if (res.statusCode === 200 && data.success !== false) {
          const cacheOptions = options.ttl ? { ttl: options.ttl } : undefined;
          cacheService.set(cacheKey, data, cacheOptions).catch((error) => {
            logger.error({ error, key: cacheKey }, 'Failed to cache response');
          });
        }

        // Add cache headers
        res.set({
          'X-Cache': 'MISS',
          'Cache-Control': `public, max-age=${options.ttl || 300}`,
        });

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error({ error }, 'Cache middleware error');
      next(); // Continue without caching
    }
  };
}

/**
 * Store details cache middleware
 */
export const cacheStoreDetails = cacheMiddleware({
  ttl: 600, // 10 minutes
  keyGenerator: (req) => `store:${req.params.id}:details`,
  skipCache: (req) => {
    // Skip cache if user is authenticated (might need owner-specific data)
    return !!req.user;
  },
});

/**
 * Menu cache middleware
 */
export const cacheMenu = cacheMiddleware({
  ttl: 300, // 5 minutes
  keyGenerator: (req) => {
    const storeId = req.params.storeId;
    const queryParams = new URLSearchParams();
    
    // Include relevant query parameters in cache key
    if (req.query.category) {queryParams.set('category', req.query.category as string);}
    if (req.query.available) {queryParams.set('available', req.query.available as string);}
    if (req.query.search) {queryParams.set('search', req.query.search as string);}
    
    const queryString = queryParams.toString();
    return `menu:${storeId}:${queryString || 'all'}`;
  },
});

/**
 * Store listing cache middleware
 */
export const cacheStoreList = cacheMiddleware({
  ttl: 180, // 3 minutes (shorter for listing as it changes more frequently)
  keyGenerator: (req) => {
    const queryParams = new URLSearchParams();
    
    // Include search/filter parameters in cache key
    if (req.query.category) {queryParams.set('category', req.query.category as string);}
    if (req.query.search) {queryParams.set('search', req.query.search as string);}
    if (req.query.page) {queryParams.set('page', req.query.page as string);}
    if (req.query.limit) {queryParams.set('limit', req.query.limit as string);}
    
    const queryString = queryParams.toString();
    return `stores:list:${queryString || 'all'}`;
  },
});

/**
 * Generate default cache key from request
 */
function generateDefaultKey(req: Request): string {
  const path = req.path.replace(/\//g, ':');
  const queryString = new URLSearchParams(req.query as any).toString();
  return `${path}:${queryString || 'default'}`;
}

/**
 * Cache invalidation middleware for store operations
 */
export function invalidateStoreCache(req: Request, res: Response, next: NextFunction) {
  // Store original methods
  const originalJson = res.json;
  const originalStatus = res.status;
  let statusCode = res.statusCode;

  // Override status to capture status codes
  res.status = function(code: number) {
    statusCode = code;
    return originalStatus.call(this, code);
  };

  // Override json to invalidate cache after successful operations
  res.json = function(data: any) {
    // Invalidate cache on successful operations
    if (statusCode >= 200 && statusCode < 300 && data.success !== false) {
      const storeId = req.params.storeId || req.params.id;
      if (storeId) {
        cacheService.invalidateStore(storeId).catch((error) => {
          logger.error({ error, storeId }, 'Failed to invalidate store cache');
        });
      }
      
      // Also invalidate store listing cache
      cacheService.delPattern('stores:list:*').catch((error) => {
        logger.error({ error }, 'Failed to invalidate store list cache');
      });
    }

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Cache invalidation middleware for menu operations
 */
export function invalidateMenuCache(req: Request, res: Response, next: NextFunction) {
  // Store original methods
  const originalJson = res.json;
  const originalStatus = res.status;
  let statusCode = res.statusCode;

  // Override status to capture status codes
  res.status = function(code: number) {
    statusCode = code;
    return originalStatus.call(this, code);
  };

  // Override json to invalidate cache after successful operations
  res.json = function(data: any) {
    // Invalidate cache on successful operations
    if (statusCode >= 200 && statusCode < 300 && data.success !== false) {
      const storeId = req.params.storeId || req.store?.id;
      if (storeId) {
        cacheService.invalidateMenuItem(storeId).catch((error) => {
          logger.error({ error, storeId }, 'Failed to invalidate menu cache');
        });
      }
    }

    return originalJson.call(this, data);
  };

  next();
}