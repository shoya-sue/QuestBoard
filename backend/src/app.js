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

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Sentry
initSentry(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
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
    origin: '*',
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