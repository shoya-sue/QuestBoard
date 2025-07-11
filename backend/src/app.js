require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const questRoutes = require('./routes/quests');
const authRoutes = require('./routes/auth');
const searchRoutes = require('./routes/search');
const notificationRoutes = require('./routes/notifications');
const socketEvents = require('./utils/socketEvents');
const errorHandler = require('./middleware/errorHandler');
const { initSentry, Sentry } = require('./config/sentry');
const { initElasticsearch } = require('./config/elasticsearch');
const { initEmail, verifyConnection } = require('./config/email');
const { generalLimiter, authLimiter, helmetConfig, sessionConfig } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Sentry
initSentry(app);

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

// APIレート制限
app.use('/api/', generalLimiter);

// 認証エンドポイントには厳しいレート制限
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/data/quests', express.static(path.join(__dirname, '../data/quests')));

// 改善されたエラーハンドリングミドルウェア
app.use(errorHandler);

// Sentry error handler must be before any other error middleware and after all controllers
if (Sentry) {
  app.use(Sentry.Handlers.errorHandler());
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

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Initialize socket events
socketEvents.setIO(io);

// Export io for use in other modules
module.exports = { app, io };