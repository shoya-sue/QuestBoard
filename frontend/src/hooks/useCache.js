import { useState, useEffect, useCallback, useRef } from 'react';
import cacheManager from '../utils/cache';

/**
 * キャッシュ機能付きのカスタムフック
 */
export const useCache = (key, fetcher, options = {}) => {
  const {
    ttl,
    persistent = false,
    session = true,
    memory = true,
    refreshInterval,
    retryOnError = true,
    maxRetries = 3,
    staleWhileRevalidate = false
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef(null);

  // キャッシュされたデータの取得
  const getCachedData = useCallback(() => {
    return cacheManager.get(key);
  }, [key]);

  // データの取得
  const fetchData = useCallback(async (useCache = true) => {
    // 既存のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);
      
      // キャッシュチェック
      if (useCache) {
        const cachedData = getCachedData();
        if (cachedData) {
          setData(cachedData);
          
          if (!staleWhileRevalidate) {
            setLoading(false);
            return cachedData;
          }
        }
      }
      
      // データ取得
      const result = await fetcher(abortControllerRef.current.signal);
      
      // キャッシュに保存
      cacheManager.set(key, result, {
        ttl,
        persistent,
        session,
        memory
      });
      
      setData(result);
      setLastFetch(Date.now());
      retryCountRef.current = 0; // リトライカウントリセット
      
      return result;
      
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // リクエストがキャンセルされた場合は何もしない
      }
      
      console.error('Fetch error:', err);
      
      // リトライ処理
      if (retryOnError && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`Retrying... (${retryCountRef.current}/${maxRetries})`);
        
        // 指数バックオフでリトライ
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        setTimeout(() => fetchData(false), delay);
        return;
      }
      
      setError(err);
      
      // エラー時にキャッシュされたデータがあれば使用
      const cachedData = getCachedData();
      if (cachedData && !data) {
        setData(cachedData);
      }
      
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, persistent, session, memory, staleWhileRevalidate, retryOnError, maxRetries, getCachedData, data]);

  // 手動リフレッシュ
  const refresh = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  // キャッシュクリア
  const clearCache = useCallback(() => {
    cacheManager.delete(key);
    setData(null);
    setError(null);
    setLastFetch(null);
  }, [key]);

  // 初期データロード
  useEffect(() => {
    fetchData();
    
    // クリーンアップ
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key]); // keyが変更された時のみ実行

  // 自動リフレッシュ
  useEffect(() => {
    if (!refreshInterval) return;
    
    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  // ページの可視性変更時の処理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastFetch) {
        const timeSinceLastFetch = Date.now() - lastFetch;
        const shouldRefresh = timeSinceLastFetch > (ttl || 5 * 60 * 1000); // デフォルト5分
        
        if (shouldRefresh) {
          fetchData();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastFetch, ttl, fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    clearCache,
    lastFetch: lastFetch ? new Date(lastFetch) : null,
    retryCount: retryCountRef.current
  };
};

/**
 * 複数のキャッシュキーを管理するフック
 */
export const useMultiCache = (configs) => {
  const [results, setResults] = useState({});
  
  useEffect(() => {
    const newResults = {};
    
    configs.forEach(({ key, fetcher, options }) => {
      const result = useCache(key, fetcher, options);
      newResults[key] = result;
    });
    
    setResults(newResults);
  }, [configs]);
  
  return results;
};

/**
 * キャッシュ無効化フック
 */
export const useCacheInvalidation = () => {
  const invalidateCache = useCallback((patterns) => {
    if (Array.isArray(patterns)) {
      patterns.forEach(pattern => cacheManager.deletePattern(pattern));
    } else {
      cacheManager.deletePattern(patterns);
    }
  }, []);
  
  const invalidateAll = useCallback(() => {
    cacheManager.clear();
  }, []);
  
  return {
    invalidateCache,
    invalidateAll
  };
};

/**
 * キャッシュ統計フック
 */
export const useCacheStats = () => {
  const [stats, setStats] = useState(null);
  
  const updateStats = useCallback(() => {
    setStats(cacheManager.getStats());
  }, []);
  
  useEffect(() => {
    updateStats();
    
    // 定期的に統計を更新
    const interval = setInterval(updateStats, 10000); // 10秒間隔
    
    return () => clearInterval(interval);
  }, [updateStats]);
  
  return {
    stats,
    updateStats
  };
};