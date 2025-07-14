/**
 * キャッシュ管理ユーティリティ
 */

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.cacheConfig = {
      // デフォルトのキャッシュ設定
      default: { ttl: 5 * 60 * 1000 }, // 5分
      // API別のキャッシュ設定
      api: {
        users: { ttl: 10 * 60 * 1000 }, // 10分
        quests: { ttl: 5 * 60 * 1000 }, // 5分
        leaderboard: { ttl: 2 * 60 * 1000 }, // 2分
        profile: { ttl: 15 * 60 * 1000 }, // 15分
        notifications: { ttl: 1 * 60 * 1000 }, // 1分
      }
    };
  }

  /**
   * キャッシュキーの生成
   */
  generateKey(namespace, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return paramString ? `${namespace}:${paramString}` : namespace;
  }

  /**
   * メモリキャッシュに保存
   */
  setMemory(key, data, ttl = null) {
    const config = this.getCacheConfig(key);
    const expiry = Date.now() + (ttl || config.ttl);
    
    this.memoryCache.set(key, {
      data,
      expiry,
      timestamp: Date.now()
    });
  }

  /**
   * メモリキャッシュから取得
   */
  getMemory(key) {
    const cached = this.memoryCache.get(key);
    
    if (!cached) {
      return null;
    }
    
    if (Date.now() > cached.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * ブラウザキャッシュ（sessionStorage）に保存
   */
  setSession(key, data, ttl = null) {
    try {
      const config = this.getCacheConfig(key);
      const expiry = Date.now() + (ttl || config.ttl);
      
      const cacheData = {
        data,
        expiry,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(`cache:${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('SessionStorage cache failed:', error);
    }
  }

  /**
   * ブラウザキャッシュから取得
   */
  getSession(key) {
    try {
      const cached = sessionStorage.getItem(`cache:${key}`);
      
      if (!cached) {
        return null;
      }
      
      const parsedData = JSON.parse(cached);
      
      if (Date.now() > parsedData.expiry) {
        sessionStorage.removeItem(`cache:${key}`);
        return null;
      }
      
      return parsedData.data;
    } catch (error) {
      console.warn('SessionStorage cache retrieval failed:', error);
      return null;
    }
  }

  /**
   * 永続キャッシュ（localStorage）に保存
   */
  setPersistent(key, data, ttl = null) {
    try {
      const config = this.getCacheConfig(key);
      const expiry = Date.now() + (ttl || config.ttl || 24 * 60 * 60 * 1000); // デフォルト24時間
      
      const cacheData = {
        data,
        expiry,
        timestamp: Date.now()
      };
      
      localStorage.setItem(`cache:${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('LocalStorage cache failed:', error);
    }
  }

  /**
   * 永続キャッシュから取得
   */
  getPersistent(key) {
    try {
      const cached = localStorage.getItem(`cache:${key}`);
      
      if (!cached) {
        return null;
      }
      
      const parsedData = JSON.parse(cached);
      
      if (Date.now() > parsedData.expiry) {
        localStorage.removeItem(`cache:${key}`);
        return null;
      }
      
      return parsedData.data;
    } catch (error) {
      console.warn('LocalStorage cache retrieval failed:', error);
      return null;
    }
  }

  /**
   * 統合キャッシュ取得（メモリ → セッション → 永続の順）
   */
  get(key) {
    return this.getMemory(key) || 
           this.getSession(key) || 
           this.getPersistent(key);
  }

  /**
   * 統合キャッシュ保存（すべてのレイヤーに保存）
   */
  set(key, data, options = {}) {
    const { ttl, persistent = false, session = true, memory = true } = options;
    
    if (memory) {
      this.setMemory(key, data, ttl);
    }
    
    if (session) {
      this.setSession(key, data, ttl);
    }
    
    if (persistent) {
      this.setPersistent(key, data, ttl);
    }
  }

  /**
   * キャッシュ削除
   */
  delete(key) {
    this.memoryCache.delete(key);
    
    try {
      sessionStorage.removeItem(`cache:${key}`);
      localStorage.removeItem(`cache:${key}`);
    } catch (error) {
      console.warn('Cache deletion failed:', error);
    }
  }

  /**
   * パターンマッチによるキャッシュ削除
   */
  deletePattern(pattern) {
    // メモリキャッシュから削除
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // ブラウザキャッシュから削除
    try {
      const deleteFromStorage = (storage) => {
        const keysToDelete = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith('cache:') && key.includes(pattern)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => storage.removeItem(key));
      };
      
      deleteFromStorage(sessionStorage);
      deleteFromStorage(localStorage);
    } catch (error) {
      console.warn('Pattern cache deletion failed:', error);
    }
  }

  /**
   * 全キャッシュクリア
   */
  clear() {
    this.memoryCache.clear();
    
    try {
      const clearStorage = (storage) => {
        const keysToDelete = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith('cache:')) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => storage.removeItem(key));
      };
      
      clearStorage(sessionStorage);
      clearStorage(localStorage);
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }

  /**
   * キャッシュ統計情報の取得
   */
  getStats() {
    const stats = {
      memory: {
        size: this.memoryCache.size,
        entries: []
      },
      session: {
        size: 0,
        entries: []
      },
      persistent: {
        size: 0,
        entries: []
      }
    };
    
    // メモリキャッシュの統計
    for (const [key, value] of this.memoryCache.entries()) {
      stats.memory.entries.push({
        key,
        size: JSON.stringify(value.data).length,
        expiry: new Date(value.expiry),
        age: Date.now() - value.timestamp
      });
    }
    
    // ブラウザキャッシュの統計
    try {
      const getStorageStats = (storage, storageStats) => {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith('cache:')) {
            const value = storage.getItem(key);
            const parsedValue = JSON.parse(value);
            storageStats.size++;
            storageStats.entries.push({
              key: key.replace('cache:', ''),
              size: value.length,
              expiry: new Date(parsedValue.expiry),
              age: Date.now() - parsedValue.timestamp
            });
          }
        }
      };
      
      getStorageStats(sessionStorage, stats.session);
      getStorageStats(localStorage, stats.persistent);
    } catch (error) {
      console.warn('Cache stats failed:', error);
    }
    
    return stats;
  }

  /**
   * キャッシュ設定の取得
   */
  getCacheConfig(key) {
    // API別の設定をチェック
    for (const [apiKey, config] of Object.entries(this.cacheConfig.api)) {
      if (key.includes(apiKey)) {
        return config;
      }
    }
    
    return this.cacheConfig.default;
  }

  /**
   * 期限切れキャッシュの自動削除
   */
  cleanup() {
    // メモリキャッシュのクリーンアップ
    for (const [key, value] of this.memoryCache.entries()) {
      if (Date.now() > value.expiry) {
        this.memoryCache.delete(key);
      }
    }
    
    // ブラウザキャッシュのクリーンアップ
    try {
      const cleanStorage = (storage) => {
        const keysToDelete = [];
        for (let i = 0; i < storage.length; i++) {
          const storageKey = storage.key(i);
          if (storageKey && storageKey.startsWith('cache:')) {
            try {
              const data = JSON.parse(storage.getItem(storageKey));
              if (Date.now() > data.expiry) {
                keysToDelete.push(storageKey);
              }
            } catch (error) {
              // 破損したデータは削除
              keysToDelete.push(storageKey);
            }
          }
        }
        keysToDelete.forEach(key => storage.removeItem(key));
      };
      
      cleanStorage(sessionStorage);
      cleanStorage(localStorage);
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }
}

// シングルトンインスタンス
const cacheManager = new CacheManager();

// 定期的なクリーンアップ（5分間隔）
setInterval(() => {
  cacheManager.cleanup();
}, 5 * 60 * 1000);

export default cacheManager;