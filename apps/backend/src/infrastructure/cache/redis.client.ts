import { createClient, RedisClientType } from 'redis';
import { env } from '@vibe/shared';
import pino from 'pino';

const logger = pino({
  name: 'redis-client',
  level: env.LOG_LEVEL,
});

export class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
      },
      // In development, use a separate database to avoid conflicts
      database: env.NODE_ENV === 'development' ? 1 : 0,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('error', (error) => {
      logger.error({ error }, 'Redis client error');
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Redis');
      // Don't throw error - app should work without Redis
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
      }
    } catch (error) {
      logger.error({ error }, 'Error disconnecting Redis client');
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error({ error, key }, 'Redis GET operation failed');
      return null;
    }
  }

  async set(
    key: string, 
    value: string, 
    options?: { ttl?: number }
  ): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      if (options?.ttl) {
        await this.client.setEx(key, options.ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Redis SET operation failed');
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Redis DEL operation failed');
      return false;
    }
  }

  async delPattern(pattern: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error({ error, pattern }, 'Redis pattern delete failed');
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Redis EXISTS operation failed');
      return false;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error({ error }, 'Redis PING failed');
      return false;
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const redisClient = new RedisClient();