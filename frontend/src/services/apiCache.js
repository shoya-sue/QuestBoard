import cacheManager from '../utils/cache';
import { useCacheInvalidation } from '../hooks/useCache';

/**
 * API キャッシュ管理サービス
 */
class ApiCacheService {
  constructor() {
    this.requestInterceptors = new Map();
    this.responseInterceptors = new Map();
  }

  /**
   * APIリクエストのキャッシュキー生成
   */
  generateApiKey(method, url, params = {}, headers = {}) {
    const baseKey = `api:${method}:${url}`;
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    // 認証情報をキーに含める（ユーザー固有のキャッシュ）
    const authKey = headers.Authorization ? 
      headers.Authorization.split(' ')[1]?.substring(0, 8) : 'anonymous';
    
    return paramString ? 
      `${baseKey}:${authKey}:${paramString}` : 
      `${baseKey}:${authKey}`;
  }

  /**
   * キャッシュ可能なリクエストかどうかの判定
   */
  isCacheable(method, url, headers = {}) {
    // GETリクエストのみキャッシュ
    if (method.toLowerCase() !== 'get') {
      return false;
    }

    // キャッシュ無効ヘッダーがある場合
    if (headers['Cache-Control'] === 'no-cache' || 
        headers['Pragma'] === 'no-cache') {
      return false;
    }

    // リアルタイム性が重要なエンドポイントは除外
    const nonCacheableEndpoints = [
      '/api/notifications/realtime',
      '/api/websocket',
      '/api/auth/token/refresh'
    ];

    return !nonCacheableEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * レスポンスのキャッシュ設定を取得
   */
  getCacheConfig(url) {
    const configs = {
      '/api/users/profile': { ttl: 15 * 60 * 1000, persistent: true },
      '/api/users/leaderboard': { ttl: 2 * 60 * 1000 },
      '/api/quests': { ttl: 5 * 60 * 1000 },
      '/api/quests/categories': { ttl: 30 * 60 * 1000, persistent: true },
      '/api/users': { ttl: 10 * 60 * 1000 },
      '/api/notifications': { ttl: 1 * 60 * 1000 },
      '/api/stats': { ttl: 5 * 60 * 1000 }
    };

    // URLにマッチする設定を検索
    for (const [pattern, config] of Object.entries(configs)) {
      if (url.includes(pattern)) {
        return config;
      }
    }

    // デフォルト設定
    return { ttl: 5 * 60 * 1000 };
  }

  /**
   * キャッシュされたレスポンスの取得
   */
  getCachedResponse(method, url, params, headers) {
    if (!this.isCacheable(method, url, headers)) {
      return null;
    }

    const key = this.generateApiKey(method, url, params, headers);
    return cacheManager.get(key);
  }

  /**
   * レスポンスのキャッシュ保存
   */
  setCachedResponse(method, url, params, headers, data) {
    if (!this.isCacheable(method, url, headers)) {
      return;
    }

    const key = this.generateApiKey(method, url, params, headers);
    const config = this.getCacheConfig(url);
    
    cacheManager.set(key, data, {
      ...config,
      memory: true,
      session: true
    });
  }

  /**
   * 関連キャッシュの無効化
   */
  invalidateRelatedCache(method, url, data) {
    const invalidationRules = {
      // ユーザー関連の更新
      'POST:/api/users': ['api:get:/api/users', 'api:get:/api/users/leaderboard'],
      'PUT:/api/users/profile': ['api:get:/api/users/profile', 'api:get:/api/users'],
      'DELETE:/api/users': ['api:get:/api/users'],
      
      // クエスト関連の更新
      'POST:/api/quests': ['api:get:/api/quests', 'api:get:/api/stats'],
      'PUT:/api/quests': ['api:get:/api/quests'],
      'DELETE:/api/quests': ['api:get:/api/quests', 'api:get:/api/stats'],
      'POST:/api/quests/complete': ['api:get:/api/quests', 'api:get:/api/users/leaderboard', 'api:get:/api/stats'],
      
      // 通知関連の更新
      'POST:/api/notifications': ['api:get:/api/notifications'],
      'PUT:/api/notifications/read': ['api:get:/api/notifications']
    };

    const ruleKey = `${method}:${url}`;
    const patterns = invalidationRules[ruleKey];

    if (patterns) {
      patterns.forEach(pattern => {
        cacheManager.deletePattern(pattern);
      });
    }
  }

  /**
   * ETags を使用したキャッシュ検証
   */
  generateETag(data) {
    // 簡単なハッシュ関数でETagを生成
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return `W/"${Math.abs(hash).toString(16)}"`;
  }

  /**
   * 条件付きリクエストの処理
   */
  handleConditionalRequest(method, url, params, headers) {
    const cachedData = this.getCachedResponse(method, url, params, headers);
    
    if (!cachedData) {
      return null;
    }

    const cachedETag = this.generateETag(cachedData);
    const clientETag = headers['If-None-Match'];

    // ETags が一致する場合は304 Not Modified
    if (clientETag && clientETag === cachedETag) {
      return {
        status: 304,
        statusText: 'Not Modified',
        headers: {
          'ETag': cachedETag,
          'Cache-Control': 'max-age=300'
        }
      };
    }

    // Last-Modified の確認
    const lastModified = headers['If-Modified-Since'];
    if (lastModified && cachedData.timestamp) {
      const clientTime = new Date(lastModified);
      const cachedTime = new Date(cachedData.timestamp);
      
      if (cachedTime <= clientTime) {
        return {
          status: 304,
          statusText: 'Not Modified',
          headers: {
            'Last-Modified': cachedTime.toUTCString(),
            'Cache-Control': 'max-age=300'
          }
        };
      }
    }

    return null;
  }

  /**
   * キャッシュ統計の取得
   */
  getCacheStatistics() {
    const stats = cacheManager.getStats();
    
    // API キャッシュのみをフィルタリング
    const apiStats = {
      memory: {
        entries: stats.memory.entries.filter(entry => entry.key.startsWith('api:')),
        totalSize: 0
      },
      session: {
        entries: stats.session.entries.filter(entry => entry.key.startsWith('api:')),
        totalSize: 0
      },
      persistent: {
        entries: stats.persistent.entries.filter(entry => entry.key.startsWith('api:')),
        totalSize: 0
      }
    };

    // サイズの合計を計算
    Object.keys(apiStats).forEach(storageType => {
      apiStats[storageType].totalSize = apiStats[storageType].entries
        .reduce((total, entry) => total + entry.size, 0);
    });

    return apiStats;
  }

  /**
   * キャッシュの最適化
   */
  optimizeCache() {
    const stats = this.getCacheStatistics();
    const maxMemorySize = 10 * 1024 * 1024; // 10MB
    const maxSessionSize = 5 * 1024 * 1024;  // 5MB

    // メモリキャッシュの最適化
    if (stats.memory.totalSize > maxMemorySize) {
      // 古いエントリから削除
      const sortedEntries = stats.memory.entries
        .sort((a, b) => a.age - b.age);
      
      let deletedSize = 0;
      for (const entry of sortedEntries) {
        if (stats.memory.totalSize - deletedSize <= maxMemorySize * 0.8) {
          break;
        }
        cacheManager.delete(entry.key);
        deletedSize += entry.size;
      }
    }

    // セッションキャッシュの最適化
    if (stats.session.totalSize > maxSessionSize) {
      const sortedEntries = stats.session.entries
        .sort((a, b) => a.age - b.age);
      
      let deletedSize = 0;
      for (const entry of sortedEntries) {
        if (stats.session.totalSize - deletedSize <= maxSessionSize * 0.8) {
          break;
        }
        cacheManager.delete(entry.key);
        deletedSize += entry.size;
      }
    }
  }

  /**
   * プリフェッチ機能
   */
  async prefetchData(requests) {
    const prefetchPromises = requests.map(async ({ method, url, params, headers, fetcher }) => {
      const key = this.generateApiKey(method, url, params, headers);
      
      // 既にキャッシュされている場合はスキップ
      if (cacheManager.get(key)) {
        return;
      }

      try {
        const data = await fetcher();
        this.setCachedResponse(method, url, params, headers, data);
      } catch (error) {
        console.warn('Prefetch failed:', error);
      }
    });

    await Promise.allSettled(prefetchPromises);
  }
}

// シングルトンインスタンス
const apiCacheService = new ApiCacheService();

// 定期的なキャッシュ最適化（5分間隔）
setInterval(() => {
  apiCacheService.optimizeCache();
}, 5 * 60 * 1000);

export default apiCacheService;