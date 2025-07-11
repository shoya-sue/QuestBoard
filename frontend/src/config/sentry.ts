import * as Sentry from '@sentry/react';

export const initSentry = () => {
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      beforeSend(event, hint) {
        // エラーのフィルタリング
        if (event.exception) {
          const error = hint.originalException;
          
          // ネットワークエラーは送信しない
          if (error instanceof Error && error.message && error.message.includes('Network Error')) {
            return null;
          }
          
          // キャンセルされたリクエストは送信しない
          if (error instanceof Error && error.message && error.message.includes('canceled')) {
            return null;
          }
        }
        
        // 個人情報のマスク
        if (event.request && event.request.url) {
          event.request.url = event.request.url.replace(
            /access_token=[^&]*/,
            'access_token=[REDACTED]'
          );
        }
        
        return event;
      },
      
      ignoreErrors: [
        // ブラウザ拡張機能のエラー
        'top.GLOBALS',
        // ランダムなプラグインやツール
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        // Facebook関連
        'fb_xd_fragment',
        // IE特有のエラー
        'WinRTError',
        // Chrome拡張機能
        'atomicFindClose',
        // 一般的な無視すべきエラー
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',
      ],
    });
  }
};

export const captureError = (error: Error, context?: Record<string, any>) => {
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error captured (Sentry disabled):', error, context);
  }
};

export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    console.log(`Message captured (Sentry disabled) [${level}]:`, message, context);
  }
};

export const setUser = (user: { id: string; email?: string; username?: string }) => {
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.setUser(user);
  }
};

export const clearUser = () => {
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.setUser(null);
  }
};