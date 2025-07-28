require('dotenv').config();
console.log('Starting Quest Board backend server...');

try {
const express = require('express');
const cors = require('cors');
const path = require('path');
const questRoutes = require('./routes/quests');
const authRoutes = require('./routes/auth');
const searchRoutes = require('./routes/search');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const docsRoutes = require('./routes/docs');
const socketEvents = require('./utils/socketEvents');
const errorHandler = require('./middleware/errorHandler');
const { initSentry, Sentry } = require('./config/sentry');
const { initElasticsearch } = require('./config/elasticsearch');
const { initEmail, verifyConnection } = require('./config/email');
const { generalLimiter, authLimiter, helmetConfig, sessionConfig } = require('./middleware/security');
const { httpMetricsMiddleware, metricsHandler, initializeMetrics } = require('./utils/metrics');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize metrics
initializeMetrics();

// Initialize Sentry
const sentryInstance = initSentry(app);

// Sentry request handler (must be before other middleware)
if (sentryInstance) {
  app.use(sentryInstance.Handlers.requestHandler());
  app.use(sentryInstance.Handlers.tracingHandler());
}

// セキュリティミドルウェア
app.use(helmetConfig);
app.use(sessionConfig);

// CORS設定
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // 開発環境では origin が undefined の場合もあるため許可
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// HTTPメトリクス収集
app.use(httpMetricsMiddleware);

// APIレート制限
app.use('/api/', generalLimiter);

// 認証エンドポイントには厳しいレート制限
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/2fa', require('./routes/twoFA'));
app.use('/api/docs', docsRoutes);
// app.use('/api/admin', require('./routes/admin')); // Temporarily disabled - missing AWS SDK

app.use('/data/quests', express.static(path.join(__dirname, '../data/quests')));

// API仕様書へのリダイレクト
app.get('/docs', (req, res) => {
  res.redirect('/api/docs');
});

// メトリクスエンドポイント
app.get('/metrics', metricsHandler);

// ルートパスでのAPI情報表示
app.get('/', (req, res) => {
  res.json({
    name: 'Quest Board API',
    version: '1.0.0',
    description: 'RPG風クエスト管理システムのAPI',
    documentation: {
      swagger: '/api/docs',
      redoc: '/api/docs/redoc',
      json: '/api/docs/json',
      yaml: '/api/docs/yaml'
    },
    endpoints: {
      authentication: '/api/auth',
      quests: '/api/quests',
      users: '/api/users',
      search: '/api/search',
      notifications: '/api/notifications',
      twoFA: '/api/2fa',
      health: '/api/docs/health',
      metrics: '/metrics'
    }
  });
});

// 改善されたエラーハンドリングミドルウェア
app.use(errorHandler);

// Sentry error handler must be before any other error middleware and after all controllers
if (sentryInstance) {
  app.use(sentryInstance.Handlers.errorHandler());
}

const server = app.listen(PORT, async () => {
  console.log(`Quest Board backend server running on port ${PORT}`);
  
  // Initialize Elasticsearch
  await initElasticsearch();
  
  // Initialize Email service
  if (initEmail()) {
    await verifyConnection();
  }
});

// WebSocket setup
const io = require('socket.io')(server, {
  cors: {
    origin: corsOptions.origin,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// WebSocket接続メトリクス
const { websocketConnections } = require('./utils/metrics');

io.on('connection', (socket) => {
  console.log('New client connected');
  websocketConnections.inc();
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    websocketConnections.dec();
  });
});

// Initialize socket events
socketEvents.setIO(io);

// Export io for use in other modules
module.exports = { app, io };

} catch (error) {
  console.error('Failed to start server:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}