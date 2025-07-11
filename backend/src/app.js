require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const questRoutes = require('./routes/quests');
const authRoutes = require('./routes/auth');
const socketEvents = require('./utils/socketEvents');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/quests', questRoutes);

app.use('/data/quests', express.static(path.join(__dirname, '../data/quests')));

// 改善されたエラーハンドリングミドルウェア
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Quest Board backend server running on port ${PORT}`);
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