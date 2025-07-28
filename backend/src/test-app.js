require('dotenv').config();
console.log('Starting test app...');

try {
  console.log('Loading dependencies...');
  const express = require('express');
  console.log('Express loaded');
  
  const app = express();
  const PORT = process.env.PORT || 3001;
  
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
} catch (error) {
  console.error('Error starting app:', error);
  process.exit(1);
}