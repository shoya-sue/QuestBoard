const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const userService = require('../services/userService');
const { authenticate } = require('../middleware/auth');
const { DEV_MODE, devGoogleAuth } = require('../utils/devAuth');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Google認証情報が必要です' });
    }

    // 開発モードのチェック
    if (DEV_MODE && (credential === 'dev-token' || credential === 'admin-token')) {
      const { user, token } = await devGoogleAuth(credential);
      return res.json({ user, token });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    
    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const isAdmin = adminEmails.includes(email);
    
    // Find or create user
    let user = await userService.getUserByEmail(email);
    if (!user) {
      user = await userService.createGoogleUser(email, name, isAdmin ? 'admin' : 'user');
    }
    
    const token = userService.generateToken(user);
    res.json({ user, token });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google認証に失敗しました' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  const { password, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

router.post('/logout', authenticate, async (req, res) => {
  res.json({ message: 'ログアウトしました' });
});

module.exports = router;