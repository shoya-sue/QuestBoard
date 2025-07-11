const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticate } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'ユーザー名とパスワードは必須です' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'パスワードは6文字以上必要です' });
    }

    const user = await userService.createUser(username, password);
    const token = userService.generateToken(user);
    
    res.status(201).json({ user, token });
  } catch (error) {
    if (error.message === 'ユーザー名は既に使用されています') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: '登録に失敗しました' });
    }
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'ユーザー名とパスワードは必須です' });
    }

    const user = await userService.validateUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }

    const token = userService.generateToken(user);
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'ログインに失敗しました' });
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