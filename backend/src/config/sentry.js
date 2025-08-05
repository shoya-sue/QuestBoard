const Sentry = require('@sentry/node');

const initSentry = (app) => {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        Sentry.integrations.captureConsole({
          levels: ['error', 'warn'],
        }),
      ],
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: 0.1,
      beforeSend(event, hint) {
        // フィルタリング: 特定のエラーを除外
        if (event.exception && event.exception.values[0]) {
          const error = event.exception.values[0];
          
          // 404エラーは送信しない
          if (error.value && error.value.includes('Not Found')) {
            return null;
          }
          
          // 開発環境のエラーは送信しない
          if (process.env.NODE_ENV === 'development') {
            console.error('Sentry would send:', error);
            return null;
          }
        }
        
        // 個人情報をマスク
        if (event.request) {
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          if (event.request.data) {
            if (event.request.data.password) {
              event.request.data.password = '[REDACTED]';
            }
            if (event.request.data.email) {
              event.request.data.email = event.request.data.email.replace(
                /^(.{2}).*@/,
                '$1***@'
              );
            }
          }
        }
        
        return event;
      },
    });

    // Expressエラーハンドラー
    // Note: These handlers are added in app.js after middleware setup

    return Sentry;
  }
  
  console.log('Sentry DSN not configured, skipping initialization');
  return null;
};

const captureError = (error, context = {}) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error captured (Sentry disabled):', error, context);
  }
};

const captureMessage = (message, level = 'info', context = {}) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level, {
      extra: context,
    });
  } else {
    console.log(`Message captured (Sentry disabled) [${level}]:`, message, context);
  }
};

module.exports = {
  initSentry,
  captureError,
  captureMessage,
  Sentry,
};