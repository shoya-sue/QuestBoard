/**
 * オプショナルなキャッシュサービス
 * Redisが利用不可の場合はメモリキャッシュにフォールバック
 */

const Logger = require('../utils/logger');

class OptionalCacheService {
  constructor() {
    this.useRedis = process.env.REDIS_HOST && process.env.REDIS_HOST !== '';
    this.memoryCache = new Map();
    this.cacheExpiry = new Map();
    
    if (this.useRedis) {
      try {
        const Redis = require('ioredis');
        this.client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          retryStrategy: (times) => {
            if (times > 3) {
              Logger.warn('Redis connection failed, falling back to memory cache');
              this.useRedis = false;
              return null;
            }
            return Math.min(times * 50, 2000);
          },
        });

        this.client.on('connect', () => {
          Logger.info('Redis connected successfully');
        });

        this.client.on('error', (err) => {
          Logger.warn('Redis error, using memory cache:', err.message);
          this.useRedis = false;
        });
      } catch (error) {
        Logger.warn('Redis not available, using memory cache');
        this.useRedis = false;
      }
    } else {
      Logger.info('Redis not configured, using memory cache');
    }

    this.defaultTTL = 3600; // 1 hour
  }

  async get(key) {
    try {
      if (this.useRedis && this.client) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // メモリキャッシュから取得
        const expiry = this.cacheExpiry.get(key);
        if (expiry && expiry < Date.now()) {
          this.memoryCache.delete(key);
          this.cacheExpiry.delete(key);
          return null;
        }
        return this.memoryCache.get(key) || null;
      }
    } catch (error) {
      Logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (this.useRedis && this.client) {
        await this.client.set(key, JSON.stringify(value), 'EX', ttl);
      } else {
        // メモリキャッシュに保存
        this.memoryCache.set(key, value);
        this.cacheExpiry.set(key, Date.now() + (ttl * 1000));
        
        // メモリリーク防止のため、古いエントリを削除
        if (this.memoryCache.size > 1000) {
          const oldestKey = this.memoryCache.keys().next().value;
          this.memoryCache.delete(oldestKey);
          this.cacheExpiry.delete(oldestKey);
        }
      }
      return true;
    } catch (error) {
      Logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      if (this.useRedis && this.client) {
        await this.client.del(key);
      } else {
        this.memoryCache.delete(key);
        this.cacheExpiry.delete(key);
      }
      return true;
    } catch (error) {
      Logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      if (this.useRedis && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } else {
        // メモリキャッシュでのパターン削除
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            this.cacheExpiry.delete(key);
          }
        }
      }
      return true;
    } catch (error) {
      Logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  async flush() {
    try {
      if (this.useRedis && this.client) {
        await this.client.flushall();
      } else {
        this.memoryCache.clear();
        this.cacheExpiry.clear();
      }
      return true;
    } catch (error) {
      Logger.error('Cache flush error:', error);
      return false;
    }
  }

  // 既存のメソッドをそのまま継承...
  async getQuests(page, limit) {
    const key = `quests:page:${page}:limit:${limit}`;
    return this.get(key);
  }

  async setQuests(page, limit, data) {
    const key = `quests:page:${page}:limit:${limit}`;
    return this.set(key, data, 300); // 5 minutes
  }

  async invalidateQuests() {
    return this.delPattern('quests:*');
  }

  async getQuest(id) {
    const key = `quest:${id}`;
    return this.get(key);
  }

  async setQuest(id, data) {
    const key = `quest:${id}`;
    return this.set(key, data);
  }

  async invalidateQuest(id) {
    await this.del(`quest:${id}`);
    await this.invalidateQuests();
  }

  async getUser(id) {
    const key = `user:${id}`;
    return this.get(key);
  }

  async setUser(id, data) {
    const key = `user:${id}`;
    return this.set(key, data);
  }

  async invalidateUser(id) {
    return this.del(`user:${id}`);
  }

  async getSession(token) {
    const key = `session:${token}`;
    return this.get(key);
  }

  async setSession(token, data, ttl = 86400) {
    const key = `session:${token}`;
    return this.set(key, data, ttl);
  }

  async invalidateSession(token) {
    const key = `session:${token}`;
    return this.del(key);
  }

  async checkRateLimit(identifier, limit = 100, window = 3600) {
    if (this.useRedis && this.client) {
      const key = `rate:${identifier}`;
      const current = await this.client.incr(key);
      
      if (current === 1) {
        await this.client.expire(key, window);
      }
      
      return {
        allowed: current <= limit,
        current,
        limit,
        remaining: Math.max(0, limit - current),
      };
    } else {
      // メモリベースのレート制限
      const key = `rate:${identifier}`;
      const now = Date.now();
      const windowStart = now - (window * 1000);
      
      // 既存のカウントを取得またはリセット
      let rateData = this.memoryCache.get(key) || { count: 0, resetAt: now + (window * 1000) };
      
      if (rateData.resetAt < now) {
        rateData = { count: 0, resetAt: now + (window * 1000) };
      }
      
      rateData.count++;
      this.memoryCache.set(key, rateData);
      
      return {
        allowed: rateData.count <= limit,
        current: rateData.count,
        limit,
        remaining: Math.max(0, limit - rateData.count),
      };
    }
  }
}

module.exports = new OptionalCacheService();