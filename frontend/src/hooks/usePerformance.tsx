import React, { useEffect, useRef, useCallback, useState } from 'react';

// パフォーマンス測定用カスタムフック
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;

    // 開発環境でのパフォーマンス監視
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} - Render #${renderCount.current} took ${renderTime}ms`);
      
      // 遅いレンダリングの警告
      if (renderTime > 16) { // 60fps を下回る場合
        console.warn(`[Performance Warning] ${componentName} rendered slowly: ${renderTime}ms`);
      }
    }

    startTime.current = Date.now();
  });

  return {
    renderCount: renderCount.current,
    markStart: useCallback(() => {
      startTime.current = Date.now();
    }, []),
    
    markEnd: useCallback((operation: string) => {
      const endTime = Date.now();
      const duration = endTime - startTime.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName} - ${operation} took ${duration}ms`);
      }
      
      return duration;
    }, [componentName])
  };
};

// デバウンス用カスタムフック
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// スロットル用カスタムフック
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback(...args);
      }, delay - (now - lastCall.current));
    }
  }, [callback, delay]) as T;
};

// ビューポート内表示判定用フック
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => {
      if (targetRef.current) {
        observer.unobserve(targetRef.current);
      }
    };
  }, [options]);

  return [targetRef, isIntersecting] as const;
};

// メモリ使用量監視用フック（開発環境のみ）
export const useMemoryMonitor = (componentName: string) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      intervalRef.current = setInterval(() => {
        const memInfo = (performance as any).memory;
        const usedMB = Math.round(memInfo.usedJSHeapSize / 1048576);
        const totalMB = Math.round(memInfo.totalJSHeapSize / 1048576);
        const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1048576);

        console.log(`[Memory] ${componentName} - Used: ${usedMB}MB, Total: ${totalMB}MB, Limit: ${limitMB}MB`);
        
        // メモリ使用量が多い場合の警告
        if (usedMB > limitMB * 0.9) {
          console.warn(`[Memory Warning] ${componentName} - High memory usage: ${usedMB}MB`);
        }
      }, 10000); // 10秒間隔
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [componentName]);
};

// Web Vitals 測定用フック
export const useWebVitals = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Web Vitals の測定
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getLCP((metric) => {
          console.log('LCP (Largest Contentful Paint):', metric);
          // 本番環境では分析サービスに送信
        });
        
        getFID((metric) => {
          console.log('FID (First Input Delay):', metric);
        });
        
        getCLS((metric) => {
          console.log('CLS (Cumulative Layout Shift):', metric);
        });
        
        getFCP((metric) => {
          console.log('FCP (First Contentful Paint):', metric);
        });
        
        getTTFB((metric) => {
          console.log('TTFB (Time to First Byte):', metric);
        });
      });
    }
  }, []);
};

// バンドルサイズ分析用ユーティリティ
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    // webpack-bundle-analyzer は開発環境でのみ使用
    console.log('Bundle analysis available. Run npm run analyze to view bundle size.');
  }
};

export default {
  usePerformanceMonitor,
  useDebounce,
  useThrottle,
  useIntersectionObserver,
  useMemoryMonitor,
  useWebVitals,
  analyzeBundleSize
};