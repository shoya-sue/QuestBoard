const Redis = require('ioredis');
const Logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      Logger.info('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      Logger.error('Redis connection error:', err);
    });

    this.defaultTTL = 3600; // 1 hour
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      Logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
      return true;
    } catch (error) {
      Logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      Logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      Logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  async flush() {
    try {
      await this.client.flushall();
      return true;
    } catch (error) {
      Logger.error('Cache flush error:', error);
      return false;
    }
  }

  // Quest-specific cache methods
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
    await this.invalidateQuests(); // Also invalidate list cache
  }

  // User-specific cache methods
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

  // Session management
  async getSession(token) {
    const key = `session:${token}`;
    return this.get(key);
  }

  async setSession(token, data, ttl = 86400) { // 24 hours
    const key = `session:${token}`;
    return this.set(key, data, ttl);
  }

  async invalidateSession(token) {
    const key = `session:${token}`;
    return this.del(key);
  }

  // Rate limiting
  async checkRateLimit(identifier, limit = 100, window = 3600) {
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
  }
}

module.exports = new CacheService();