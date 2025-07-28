require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Mock data
const mockQuests = [
  {
    id: 1,
    title: 'ゴブリン退治',
    description: '近くの洞窟に住み着いたゴブリンを退治してください。',
    reward: 1000,
    difficulty: 'easy',
    status: 'open',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 2,
    title: '薬草採取',
    description: '森で薬草を10個採取してきてください。',
    reward: 500,
    difficulty: 'easy',
    status: 'open',
    created_at: new Date(),
    updated_at: new Date()
  }
];

const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
  created_at: new Date()
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Mock auth endpoint
app.post('/api/auth/google', (req, res) => {
  res.json({
    message: 'Login successful',
    user: mockUser,
    token: 'mock-jwt-token'
  });
});

// Mock user endpoint
app.get('/api/auth/profile', (req, res) => {
  res.json({ user: mockUser });
});

// Mock quests endpoints
app.get('/api/quests', (req, res) => {
  res.json({
    quests: mockQuests,
    total: mockQuests.length,
    page: 1,
    limit: 20
  });
});

app.get('/api/quests/:id', (req, res) => {
  const quest = mockQuests.find(q => q.id === parseInt(req.params.id));
  if (quest) {
    res.json(quest);
  } else {
    res.status(404).json({ error: 'Quest not found' });
  }
});

app.post('/api/quests', (req, res) => {
  const newQuest = {
    id: mockQuests.length + 1,
    ...req.body,
    status: 'open',
    created_at: new Date(),
    updated_at: new Date()
  };
  mockQuests.push(newQuest);
  res.status(201).json(newQuest);
});

// Mock search endpoint
app.get('/api/search/quests', (req, res) => {
  const { q } = req.query;
  const results = mockQuests.filter(quest => 
    quest.title.toLowerCase().includes(q.toLowerCase()) ||
    quest.description.toLowerCase().includes(q.toLowerCase())
  );
  res.json({
    results,
    total: results.length
  });
});

// Mock notifications endpoint
app.get('/api/notifications', (req, res) => {
  res.json({
    notifications: [],
    unreadCount: 0
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock backend server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /api/auth/google');
  console.log('- GET /api/auth/profile');
  console.log('- GET /api/quests');
  console.log('- GET /api/quests/:id');
  console.log('- POST /api/quests');
  console.log('- GET /api/search/quests?q=query');
  console.log('- GET /api/notifications');
  console.log('- GET /health');
});