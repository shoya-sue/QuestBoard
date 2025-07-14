// パフォーマンス監視とレポーティングのユーティリティ

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface NavigationTiming {
  dns: number;
  tcp: number;
  request: number;
  response: number;
  processing: number;
  onLoad: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
    this.measureNavigationTiming();
    this.setupWebVitalsMonitoring();
  }

  // パフォーマンスオブザーバーの初期化
  private initializeObservers(): void {
    if ('PerformanceObserver' in window) {
      // Long Task監視
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) {
              this.addMetric('long-task', entry.duration, 'poor');
              console.warn(`Long task detected: ${entry.duration}ms`);
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        console.log('Long task monitoring not supported');
      }

      // Navigation timing監視
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.processNavigationEntry(entry as PerformanceNavigationTiming);
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (e) {
        console.log('Navigation timing monitoring not supported');
      }

      // Resource timing監視
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.processResourceEntry(entry as PerformanceResourceTiming);
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.log('Resource timing monitoring not supported');
      }
    }
  }

  // Web Vitals 監視の設定
  private setupWebVitalsMonitoring(): void {
    // 動的にweb-vitalsライブラリを読み込み
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS((metric) => {
        const rating = metric.value <= 0.1 ? 'good' : metric.value <= 0.25 ? 'needs-improvement' : 'poor';
        this.addMetric('CLS', metric.value, rating);
        this.reportWebVital(metric);
      });

      onFID((metric) => {
        const rating = metric.value <= 100 ? 'good' : metric.value <= 300 ? 'needs-improvement' : 'poor';
        this.addMetric('FID', metric.value, rating);
        this.reportWebVital(metric);
      });

      onFCP((metric) => {
        const rating = metric.value <= 1800 ? 'good' : metric.value <= 3000 ? 'needs-improvement' : 'poor';
        this.addMetric('FCP', metric.value, rating);
        this.reportWebVital(metric);
      });

      onLCP((metric) => {
        const rating = metric.value <= 2500 ? 'good' : metric.value <= 4000 ? 'needs-improvement' : 'poor';
        this.addMetric('LCP', metric.value, rating);
        this.reportWebVital(metric);
      });

      onTTFB((metric) => {
        const rating = metric.value <= 800 ? 'good' : metric.value <= 1800 ? 'needs-improvement' : 'poor';
        this.addMetric('TTFB', metric.value, rating);
        this.reportWebVital(metric);
      });
    }).catch(() => {
      console.log('Web vitals monitoring not available');
    });
  }

  // ナビゲーションタイミングの測定
  private measureNavigationTiming(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.processNavigationEntry(navigation);
        }
      }, 0);
    });
  }

  // ナビゲーションエントリの処理
  private processNavigationEntry(entry: PerformanceNavigationTiming): void {
    const timing: NavigationTiming = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      processing: entry.domContentLoadedEventStart - entry.responseEnd,
      onLoad: entry.loadEventEnd - entry.loadEventStart
    };

    // 各メトリクスを記録
    Object.entries(timing).forEach(([name, value]) => {
      if (value > 0) {
        const rating = this.getRatingForTiming(name, value);
        this.addMetric(name, value, rating);
      }
    });

    console.log('Navigation Timing:', timing);
  }

  // リソースエントリの処理
  private processResourceEntry(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime;
    
    // 大きなリソースの警告
    if (duration > 1000) {
      console.warn(`Slow resource load: ${entry.name} took ${duration}ms`);
      this.addMetric('slow-resource', duration, 'poor');
    }

    // 画像の最適化チェック
    if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
      if (duration > 500) {
        console.warn(`Slow image load: ${entry.name} took ${duration}ms`);
      }
    }

    // JavaScriptファイルの最適化チェック
    if (entry.name.match(/\.js$/i)) {
      if (duration > 800) {
        console.warn(`Slow script load: ${entry.name} took ${duration}ms`);
      }
    }
  }

  // タイミングメトリクスの評価
  private getRatingForTiming(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      dns: { good: 100, poor: 300 },
      tcp: { good: 100, poor: 300 },
      request: { good: 200, poor: 500 },
      response: { good: 200, poor: 500 },
      processing: { good: 500, poor: 1000 },
      onLoad: { good: 100, poor: 300 }
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  // メトリクスの追加
  private addMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      rating
    });

    // メトリクス数の制限
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50);
    }
  }

  // Web Vitalのレポート
  private reportWebVital(metric: any): void {
    if (process.env.NODE_ENV === 'production') {
      // 本番環境では分析サービスに送信
      console.log(`Web Vital - ${metric.name}:`, metric.value, `(${metric.rating})`);
      
      // Google Analytics や他の分析サービスに送信
      if (typeof gtag !== 'undefined') {
        gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          non_interaction: true,
        });
      }
    } else {
      console.log(`Web Vital - ${metric.name}:`, metric.value, `(${metric.rating})`);
    }
  }

  // パフォーマンスサマリーの取得
  public getPerformanceSummary(): {
    goodMetrics: number;
    needsImprovementMetrics: number;
    poorMetrics: number;
    recentMetrics: PerformanceMetric[];
  } {
    const recentMetrics = this.metrics.slice(-10);
    
    return {
      goodMetrics: this.metrics.filter(m => m.rating === 'good').length,
      needsImprovementMetrics: this.metrics.filter(m => m.rating === 'needs-improvement').length,
      poorMetrics: this.metrics.filter(m => m.rating === 'poor').length,
      recentMetrics
    };
  }

  // バンドルサイズの分析
  public analyzeBundleSize(): void {
    if (process.env.NODE_ENV === 'development') {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      
      console.group('Bundle Analysis');
      console.log(`Script files: ${scripts.length}`);
      console.log(`Stylesheet files: ${styles.length}`);
      
      scripts.forEach(script => {
        const src = (script as HTMLScriptElement).src;
        if (src.includes('static/js/')) {
          console.log(`Script: ${src.split('/').pop()}`);
        }
      });
      
      console.groupEnd();
    }
  }

  // クリーンアップ
  public cleanup(): void {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
    this.metrics = [];
  }

  // パフォーマンス問題の検出
  public detectPerformanceIssues(): string[] {
    const issues: string[] = [];
    const summary = this.getPerformanceSummary();
    
    if (summary.poorMetrics > summary.goodMetrics) {
      issues.push('Multiple performance metrics are in poor range');
    }
    
    const longTasks = this.metrics.filter(m => m.name === 'long-task');
    if (longTasks.length > 5) {
      issues.push('Frequent long tasks detected - consider code splitting');
    }
    
    const slowResources = this.metrics.filter(m => m.name === 'slow-resource');
    if (slowResources.length > 3) {
      issues.push('Multiple slow resource loads - consider optimization');
    }
    
    return issues;
  }
}

// シングルトンインスタンス
const performanceMonitor = new PerformanceMonitor();

// メモリリーク防止のためのクリーンアップ
window.addEventListener('beforeunload', () => {
  performanceMonitor.cleanup();
});

export default performanceMonitor;

// 開発環境でのパフォーマンス情報表示
if (process.env.NODE_ENV === 'development') {
  // 5秒後にパフォーマンスサマリーを表示
  setTimeout(() => {
    console.group('Performance Monitor Summary');
    console.log(performanceMonitor.getPerformanceSummary());
    
    const issues = performanceMonitor.detectPerformanceIssues();
    if (issues.length > 0) {
      console.warn('Performance Issues Detected:');
      issues.forEach(issue => console.warn(`- ${issue}`));
    }
    
    performanceMonitor.analyzeBundleSize();
    console.groupEnd();
  }, 5000);
}