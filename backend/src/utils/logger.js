const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// ログディレクトリの設定
const LOG_DIR = path.join(__dirname, '../../logs');

// カスタムログレベル定義
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  security: 5,
  performance: 6
};

// ログレベルの色設定
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  security: 'red bold',
  performance: 'cyan'
};

winston.addColors(colors);

// カスタムフォーマット関数
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // メタデータがある場合は追加
    if (Object.keys(metadata).length > 0) {
      log += ` | ${JSON.stringify(metadata)}`;
    }
    
    // エラースタックがある場合は追加
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// 本番環境用フォーマット（JSON）
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.json()
);

// ログレベルの設定
const getLogLevel = () => {
  if (process.env.NODE_ENV === 'production') return 'info';
  if (process.env.NODE_ENV === 'test') return 'error';
  return 'debug';
};

// エラーログローテーション設定
const errorLogTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '10m',
  maxFiles: '14d',
  format: process.env.NODE_ENV === 'production' ? productionFormat : customFormat
});

// 全ログローテーション設定
const combinedLogTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: process.env.NODE_ENV === 'production' ? productionFormat : customFormat
});

// アクセスログ用トランスポート
const accessLogTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '30d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

// メインロガーの作成
const Logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  defaultMeta: { 
    service: 'quest-board',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    errorLogTransport,
    combinedLogTransport
  ],
  // 例外とリジェクションのハンドリング
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d'
    })
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d'
    })
  ]
});

// 開発環境ではコンソール出力を追加
if (process.env.NODE_ENV !== 'production') {
  Logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, metadata = {} }) => {
        const metaStr = Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    )
  }));
}

// アクセスログ専用ロガー
const accessLogger = winston.createLogger({
  transports: [accessLogTransport],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

// セキュリティログ専用ロガー
const securityLogger = winston.createLogger({
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '90d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// パフォーマンスログ専用ロガー
const performanceLogger = winston.createLogger({
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// HTTPリクエストログ用ミドルウェア（強化版）
Logger.httpLogMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      statusCode: res.statusCode,
      responseTime: `${duration}ms`,
      userId: req.user?.id || null,
      sessionId: req.sessionID || null,
      referrer: req.get('Referrer') || null
    };

    // レスポンス時間によってログレベルを調整
    if (duration > 5000) {
      Logger.warn('Slow HTTP Request', logData);
    } else if (res.statusCode >= 400) {
      Logger.warn('HTTP Error', logData);
    } else {
      Logger.http('HTTP Request', logData);
    }

    // アクセスログにも記録
    accessLogger.info('HTTP Request', logData);
  });
  
  next();
};

// ヘルパー関数
const logWithContext = (level, message, context = {}) => {
  Logger[level](message, context);
};

const logError = (error, context = {}) => {
  Logger.error(error.message || error, {
    ...context,
    stack: error.stack,
    name: error.name,
    code: error.code
  });
};

const logSecurity = (event, details = {}) => {
  const logData = {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    severity: 'high'
  };
  
  securityLogger.warn(event, logData);
  Logger.warn(`SECURITY: ${event}`, logData);
};

const logPerformance = (operation, duration, details = {}) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    ...details,
    timestamp: new Date().toISOString()
  };
  
  performanceLogger.info('Performance Metric', logData);
  
  // 閾値を超えた場合は警告ログも出力
  if (duration > 1000) {
    Logger.warn(`Slow Operation: ${operation}`, logData);
  }
};

// データベースクエリログ関数
const logDatabaseQuery = (query, duration, error = null, rowCount = 0) => {
  const logData = {
    query: query.replace(/\s+/g, ' ').trim(),
    duration: `${duration}ms`,
    rowCount,
    error: error ? error.message : null
  };

  if (error) {
    Logger.error('Database Query Failed', logData);
  } else if (duration > 1000) {
    Logger.warn('Slow Database Query', logData);
  } else {
    Logger.debug('Database Query', logData);
  }
};

// API使用統計ログ
const logApiUsage = (endpoint, method, userId, responseTime, statusCode) => {
  const logData = {
    endpoint,
    method,
    userId,
    responseTime: `${responseTime}ms`,
    statusCode,
    timestamp: new Date().toISOString()
  };
  
  performanceLogger.info('API Usage', logData);
};

// 認証関連ログ
const logAuth = (event, userId, details = {}) => {
  const logData = {
    event,
    userId,
    ...details,
    timestamp: new Date().toISOString()
  };
  
  if (event.includes('failed') || event.includes('denied')) {
    securityLogger.warn(`Auth: ${event}`, logData);
    Logger.warn(`AUTH: ${event}`, logData);
  } else {
    Logger.info(`AUTH: ${event}`, logData);
  }
};

module.exports = {
  Logger,
  accessLogger,
  securityLogger,
  performanceLogger,
  logWithContext,
  logError,
  logSecurity,
  logPerformance,
  logDatabaseQuery,
  logApiUsage,
  logAuth
};