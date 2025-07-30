import { redisClient } from './redis.client';
import pino from 'pino';

const logger = pino({ name: 'cache-service' });

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

export class CacheService {
  private defaultTTL: number = 300; // 5 minutes default
  private keyPrefix: string = 'vibe:';

  constructor(options?: { defaultTTL?: number; keyPrefix?: string }) {
    if (options?.defaultTTL) {
      this.defaultTTL = options.defaultTTL;
    }
    if (options?.keyPrefix) {
      this.keyPrefix = options.keyPrefix;
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.keyPrefix;
    return `${keyPrefix}${key}`;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        logger.debug({ key: cacheKey }, 'Cache hit');
        return JSON.parse(cached) as T;
      }
      
      logger.debug({ key: cacheKey }, 'Cache miss');
      return null;
    } catch (error) {
      logger.error({ error, key }, 'Cache get operation failed');
      return null;
    }
  }

  async set<T>(key: string, data: T, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = JSON.stringify(data);
      
      const success = await redisClient.set(cacheKey, serialized, { ttl });
      
      if (success) {
        logger.debug({ key: cacheKey, ttl }, 'Cache set successful');
      }
      
      return success;
    } catch (error) {
      logger.error({ error, key }, 'Cache set operation failed');
      return false;
    }
  }

  async del(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const success = await redisClient.del(cacheKey);
      
      if (success) {
        logger.debug({ key: cacheKey }, 'Cache delete successful');
      }
      
      return success;
    } catch (error) {
      logger.error({ error, key }, 'Cache delete operation failed');
      return false;
    }
  }

  async delPattern(pattern: string, options?: CacheOptions): Promise<boolean> {
    try {
      const keyPrefix = options?.prefix || this.keyPrefix;
      const cachePattern = `${keyPrefix}${pattern}`;
      const success = await redisClient.delPattern(cachePattern);
      
      if (success) {
        logger.debug({ pattern: cachePattern }, 'Cache pattern delete successful');
      }
      
      return success;
    } catch (error) {
      logger.error({ error, pattern }, 'Cache pattern delete failed');
      return false;
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      return await redisClient.exists(cacheKey);
    } catch (error) {
      logger.error({ error, key }, 'Cache exists check failed');
      return false;
    }
  }

  /**
   * Get data from cache, or execute callback to fetch and cache the result
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Execute callback to get fresh data
    const data = await callback();
    
    // Cache the result (don't await to avoid blocking)
    this.set(key, data, options).catch((error) => {
      logger.error({ error, key }, 'Failed to cache data after fetch');
    });

    return data;
  }

  /**
   * Invalidate cache entries by store ID (for when store data changes)
   */
  async invalidateStore(storeId: string): Promise<void> {
    try {
      await Promise.all([
        this.delPattern(`store:${storeId}:*`),
        this.delPattern(`menu:${storeId}:*`),
      ]);
      
      logger.info({ storeId }, 'Store cache invalidated');
    } catch (error) {
      logger.error({ error, storeId }, 'Failed to invalidate store cache');
    }
  }

  /**
   * Invalidate cache entries by menu item ID (for when menu items change)
   */
  async invalidateMenuItem(storeId: string): Promise<void> {
    try {
      await this.delPattern(`menu:${storeId}:*`);
      logger.info({ storeId }, 'Menu cache invalidated');
    } catch (error) {
      logger.error({ error, storeId }, 'Failed to invalidate menu cache');
    }
  }

  async healthCheck(): Promise<boolean> {
    return redisClient.isHealthy() && await redisClient.ping();
  }
}

// Export singleton instance
export const cacheService = new CacheService();