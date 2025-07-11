require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const questRoutes = require('./routes/quests');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/quests', questRoutes);

app.use('/data/quests', express.static(path.join(__dirname, '../data/quests')));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Quest Board backend server running on port ${PORT}`);
});