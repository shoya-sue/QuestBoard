const { getEmailClient } = require('../config/email');
const { User, Quest, Notification } = require('../models');
const { captureError } = require('../config/sentry');

class NotificationService {
  constructor() {
    this.emailClient = getEmailClient();
  }

  // クエストが作成されたときの通知
  async notifyQuestCreated(quest) {
    try {
      // すべてのアクティブユーザーに通知（オプトイン設定を確認）
      const users = await User.findAll({
        where: {
          emailNotifications: true,
          status: 'active'
        }
      });

      const notifications = [];
      
      for (const user of users) {
        // データベースに通知を保存
        const notification = await this.createNotification({
          userId: user.id,
          type: 'quest_created',
          title: '新しいクエストが追加されました',
          message: `「${quest.title}」が追加されました`,
          relatedId: quest.id,
          relatedType: 'quest'
        });
        
        notifications.push(notification);

        // メール送信
        if (this.emailClient && user.email) {
          await this.sendEmail(user.email, 'quest-created', {
            user: user.toJSON(),
            quest: quest.toJSON(),
            locale: user.locale || 'ja'
          });
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error notifying quest created:', error);
      captureError(error);
    }
  }

  // クエストが受理されたときの通知
  async notifyQuestAccepted(quest, acceptedBy) {
    try {
      const acceptedUser = await User.findByPk(acceptedBy);
      const creator = await User.findByPk(quest.createdBy);

      if (creator && creator.emailNotifications) {
        // 作成者に通知
        await this.createNotification({
          userId: creator.id,
          type: 'quest_accepted',
          title: 'あなたのクエストが受理されました',
          message: `${acceptedUser.username}さんが「${quest.title}」を受理しました`,
          relatedId: quest.id,
          relatedType: 'quest'
        });

        // メール送信
        if (this.emailClient && creator.email) {
          await this.sendEmail(creator.email, 'quest-accepted', {
            user: creator.toJSON(),
            quest: quest.toJSON(),
            acceptedBy: acceptedUser.toJSON(),
            locale: creator.locale || 'ja'
          });
        }
      }
    } catch (error) {
      console.error('Error notifying quest accepted:', error);
      captureError(error);
    }
  }

  // クエストが完了したときの通知
  async notifyQuestCompleted(quest, completedBy) {
    try {
      const completedUser = await User.findByPk(completedBy);
      const creator = await User.findByPk(quest.createdBy);

      // 作成者に通知
      if (creator && creator.emailNotifications && creator.id !== completedBy) {
        await this.createNotification({
          userId: creator.id,
          type: 'quest_completed',
          title: 'クエストが完了しました',
          message: `${completedUser.username}さんが「${quest.title}」を完了しました`,
          relatedId: quest.id,
          relatedType: 'quest'
        });

        if (this.emailClient && creator.email) {
          await this.sendEmail(creator.email, 'quest-completed', {
            user: creator.toJSON(),
            quest: quest.toJSON(),
            completedBy: completedUser.toJSON(),
            locale: creator.locale || 'ja'
          });
        }
      }

      // 完了者に通知
      await this.createNotification({
        userId: completedBy,
        type: 'quest_completed_self',
        title: 'クエストを完了しました',
        message: `「${quest.title}」を完了しました。報酬: ${quest.reward}ポイント`,
        relatedId: quest.id,
        relatedType: 'quest'
      });

      if (this.emailClient && completedUser.email && completedUser.emailNotifications) {
        await this.sendEmail(completedUser.email, 'quest-completed-self', {
          user: completedUser.toJSON(),
          quest: quest.toJSON(),
          locale: completedUser.locale || 'ja'
        });
      }
    } catch (error) {
      console.error('Error notifying quest completed:', error);
      captureError(error);
    }
  }

  // レベルアップ通知
  async notifyLevelUp(user, newLevel, rewards) {
    try {
      await this.createNotification({
        userId: user.id,
        type: 'level_up',
        title: 'レベルアップしました！',
        message: `レベル${newLevel}に到達しました！${rewards ? ` 報酬: ${rewards}` : ''}`,
        relatedId: user.id,
        relatedType: 'user'
      });

      if (this.emailClient && user.email && user.emailNotifications) {
        await this.sendEmail(user.email, 'level-up', {
          user: user.toJSON(),
          newLevel,
          rewards,
          locale: user.locale || 'ja'
        });
      }
    } catch (error) {
      console.error('Error notifying level up:', error);
      captureError(error);
    }
  }

  // 実績達成通知
  async notifyAchievementUnlocked(user, achievement) {
    try {
      await this.createNotification({
        userId: user.id,
        type: 'achievement_unlocked',
        title: '実績を達成しました！',
        message: `「${achievement.name}」を達成しました！`,
        relatedId: achievement.id,
        relatedType: 'achievement'
      });

      if (this.emailClient && user.email && user.emailNotifications) {
        await this.sendEmail(user.email, 'achievement-unlocked', {
          user: user.toJSON(),
          achievement: achievement.toJSON(),
          locale: user.locale || 'ja'
        });
      }
    } catch (error) {
      console.error('Error notifying achievement unlocked:', error);
      captureError(error);
    }
  }

  // 定期的なダイジェスト通知
  async sendWeeklyDigest(user) {
    try {
      // 1週間の統計を取得
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const completedQuests = await Quest.count({
        where: {
          completedBy: user.id,
          completedAt: {
            [Op.gte]: weekAgo
          }
        }
      });

      const earnedPoints = await Quest.sum('reward', {
        where: {
          completedBy: user.id,
          completedAt: {
            [Op.gte]: weekAgo
          }
        }
      });

      const newQuests = await Quest.count({
        where: {
          createdAt: {
            [Op.gte]: weekAgo
          },
          status: 'open'
        }
      });

      if (this.emailClient && user.email && user.emailNotifications) {
        await this.sendEmail(user.email, 'weekly-digest', {
          user: user.toJSON(),
          stats: {
            completedQuests,
            earnedPoints: earnedPoints || 0,
            newQuests
          },
          locale: user.locale || 'ja'
        });
      }
    } catch (error) {
      console.error('Error sending weekly digest:', error);
      captureError(error);
    }
  }

  // 通知の作成
  async createNotification(data) {
    try {
      const notification = await Notification.create({
        ...data,
        read: false
      });

      // WebSocketで即座に通知
      const io = require('../app').io;
      if (io) {
        io.to(`user:${data.userId}`).emit('notification', notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      captureError(error);
    }
  }

  // メール送信
  async sendEmail(to, template, locals) {
    if (!this.emailClient) {
      console.log('Email client not initialized, skipping email send');
      return;
    }

    try {
      await this.emailClient.send({
        template,
        message: {
          to
        },
        locals
      });
      
      console.log(`Email sent to ${to} using template ${template}`);
    } catch (error) {
      console.error('Error sending email:', error);
      captureError(error, { to, template });
    }
  }

  // ユーザーの通知を取得
  async getUserNotifications(userId, options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      unreadOnly = false,
      type = null 
    } = options;

    const where = { userId };
    if (unreadOnly) where.read = false;
    if (type) where.type = type;

    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      notifications: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      unreadCount: unreadOnly ? count : await Notification.count({ where: { userId, read: false } })
    };
  }

  // 通知を既読にする
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    await notification.save();

    return notification;
  }

  // すべての通知を既読にする
  async markAllAsRead(userId) {
    await Notification.update(
      { read: true },
      { where: { userId, read: false } }
    );
  }

  // 通知設定を更新
  async updateNotificationSettings(userId, settings) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.emailNotifications = settings.emailNotifications;
    user.notificationTypes = settings.notificationTypes || [];
    await user.save();

    return user;
  }
}

// Sequelizeのオペレーターをインポート
const { Op } = require('sequelize');

module.exports = new NotificationService();