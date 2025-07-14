const promClient = require('prom-client');
const logger = require('./logger');

// Prometheusレジストリの作成
const register = new promClient.Registry();

// デフォルトメトリクスの収集
promClient.collectDefaultMetrics({ register });

// カスタムメトリクス定義

// HTTPリクエストカウンター
const httpRequestTotal = new promClient.Counter({
  name: 'http_request_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// HTTPリクエスト期間ヒストグラム
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

// アクティブユーザー数ゲージ
const activeUsers = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users',
  registers: [register]
});

// クエスト関連メトリクス
const questMetrics = {
  created: new promClient.Counter({
    name: 'quest_created_total',
    help: 'Total number of quests created',
    labelNames: ['difficulty'],
    registers: [register]
  }),
  completed: new promClient.Counter({
    name: 'quest_completed_total',
    help: 'Total number of quests completed',
    labelNames: ['difficulty'],
    registers: [register]
  }),
  active: new promClient.Gauge({
    name: 'quest_active_total',
    help: 'Total number of active quests',
    labelNames: ['difficulty'],
    registers: [register]
  })
};

// データベースクエリメトリクス
const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// Redisオペレーションメトリクス
const redisOperationDuration = new promClient.Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],
  registers: [register]
});

// WebSocket接続メトリクス
const websocketConnections = new promClient.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

// ログメッセージカウンター
const logMessages = new promClient.Counter({
  name: 'log_messages_total',
  help: 'Total number of log messages',
  labelNames: ['level', 'service'],
  registers: [register]
});

// HTTPミドルウェア
const httpMetricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : 'unknown';
    const method = req.method;
    const status = res.statusCode;
    
    httpRequestTotal.inc({ method, route, status });
    httpRequestDuration.observe({ method, route, status }, duration);
  });
  
  next();
};

// データベースクエリ計測
const measureDatabaseQuery = async (operation, table, queryFn) => {
  const end = databaseQueryDuration.startTimer({ operation, table });
  try {
    const result = await queryFn();
    return result;
  } finally {
    end();
  }
};

// Redis操作計測
const measureRedisOperation = async (operation, operationFn) => {
  const end = redisOperationDuration.startTimer({ operation });
  try {
    const result = await operationFn();
    return result;
  } finally {
    end();
  }
};

// ログメトリクス更新
const updateLogMetrics = (level, service = 'backend') => {
  logMessages.inc({ level, service });
};

// メトリクス初期化
const initializeMetrics = () => {
  // ログレベルごとのメトリクス収集
  ['error', 'warn', 'info', 'debug'].forEach(level => {
    const originalMethod = logger[level];
    if (originalMethod) {
      logger[level] = function(...args) {
        updateLogMetrics(level);
        return originalMethod.apply(logger, args);
      };
    }
  });
  
  logger.info('Metrics initialized');
};

// カスタムメトリクス更新関数
const updateQuestMetrics = async (db) => {
  try {
    // アクティブクエスト数を更新
    const activeQuestsByDifficulty = await db.Quest.findAll({
      where: { status: 'active' },
      attributes: ['difficulty', [db.sequelize.fn('COUNT', 'id'), 'count']],
      group: ['difficulty']
    });
    
    // 各難易度のアクティブクエスト数を設定
    ['easy', 'medium', 'hard'].forEach(difficulty => {
      const count = activeQuestsByDifficulty.find(q => q.difficulty === difficulty);
      questMetrics.active.set({ difficulty }, count ? count.get('count') : 0);
    });
    
    // アクティブユーザー数を更新（過去30分以内にアクティビティがあったユーザー）
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeUserCount = await db.User.count({
      where: {
        lastActive: { [db.Sequelize.Op.gte]: thirtyMinutesAgo }
      }
    });
    activeUsers.set(activeUserCount);
    
  } catch (error) {
    logger.error('Failed to update quest metrics:', error);
  }
};

// メトリクスエンドポイントハンドラ
const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end();
  }
};

module.exports = {
  register,
  httpRequestTotal,
  httpRequestDuration,
  activeUsers,
  questMetrics,
  databaseQueryDuration,
  redisOperationDuration,
  websocketConnections,
  logMessages,
  httpMetricsMiddleware,
  measureDatabaseQuery,
  measureRedisOperation,
  updateLogMetrics,
  initializeMetrics,
  updateQuestMetrics,
  metricsHandler
};