const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticate, isAdmin } = require('../middleware/auth');

// ユーザー一覧取得（管理者のみ）
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    // 各ユーザーの統計情報を追加
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const userData = user.toJSON();
      
      // 完了したクエスト数を取得
      if (user.questHistory) {
        userData.completedQuests = user.questHistory.filter(q => q.status === 'completed').length;
      } else {
        userData.completedQuests = 0;
      }

      return userData;
    }));

    res.json({ users: usersWithStats });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
  }
});

// ユーザーの権限更新（管理者のみ）
router.put('/:id/role', authenticate, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: '無効な権限です' });
    }

    // 自分自身の権限は変更できない
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: '自分自身の権限は変更できません' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    user.role = role;
    await user.save();

    res.json({ 
      message: '権限を更新しました',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: '権限の更新に失敗しました' });
  }
});

// ユーザープロフィール取得
router.get('/profile/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          association: 'questHistory',
          limit: 10,
          order: [['completedAt', 'DESC']]
        },
        {
          association: 'achievements'
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'プロフィールの取得に失敗しました' });
  }
});

// ユーザープロフィール更新
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username, bio, profilePicture } = req.body;
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    res.json({ 
      message: 'プロフィールを更新しました',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        bio: user.bio,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'プロフィールの更新に失敗しました' });
  }
});

// ユーザー削除（管理者のみ）
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    // 自分自身は削除できない
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: '自分自身は削除できません' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    await user.destroy();

    res.json({ message: 'ユーザーを削除しました' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'ユーザーの削除に失敗しました' });
  }
});

module.exports = router;