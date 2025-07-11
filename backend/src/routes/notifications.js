const express = require('express');
const router = express.Router();
const notificationService = require('../services/notification');
const { authenticate } = require('../middleware/auth');

// ユーザーの通知を取得
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false, type } = req.query;
    
    const result = await notificationService.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      type
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: '通知の取得に失敗しました' });
  }
});

// 未読通知数を取得
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const { Notification } = require('../models');
    const count = await Notification.count({
      where: {
        userId: req.user.id,
        read: false
      }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: '未読数の取得に失敗しました' });
  }
});

// 通知を既読にする
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    if (error.message === 'Notification not found') {
      res.status(404).json({ error: '通知が見つかりません' });
    } else {
      res.status(500).json({ error: '通知の更新に失敗しました' });
    }
  }
});

// すべての通知を既読にする
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ message: 'すべての通知を既読にしました' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: '通知の更新に失敗しました' });
  }
});

// 通知設定を取得
router.get('/settings', authenticate, async (req, res) => {
  try {
    const { User } = require('../models');
    const user = await User.findByPk(req.user.id, {
      attributes: ['emailNotifications', 'notificationTypes', 'preferences']
    });
    
    res.json({
      emailNotifications: user.emailNotifications,
      notificationTypes: user.notificationTypes,
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: '設定の取得に失敗しました' });
  }
});

// 通知設定を更新
router.put('/settings', authenticate, async (req, res) => {
  try {
    const { emailNotifications, notificationTypes } = req.body;
    
    const user = await notificationService.updateNotificationSettings(req.user.id, {
      emailNotifications,
      notificationTypes
    });
    
    res.json({
      emailNotifications: user.emailNotifications,
      notificationTypes: user.notificationTypes
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: '設定の更新に失敗しました' });
  }
});

// テスト通知を送信（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  router.post('/test', authenticate, async (req, res) => {
    try {
      const { type = 'system' } = req.body;
      
      await notificationService.createNotification({
        userId: req.user.id,
        type,
        title: 'テスト通知',
        message: 'これはテスト通知です。正常に動作しています。',
        relatedType: 'system'
      });
      
      res.json({ message: 'テスト通知を送信しました' });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ error: 'テスト通知の送信に失敗しました' });
    }
  });
}

module.exports = router;