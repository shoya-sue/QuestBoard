const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, QuestHistory } = require('../models');
const { Op } = require('sequelize');

class UserService {
  async getAllUsers(options = {}) {
    const { page = 1, limit = 10, status = 'active', role } = options;
    const offset = (page - 1) * limit;

    const where = { status };
    if (role) {
      where.role = role;
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['passwordHash'] }
    });

    return {
      users,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async getUserByUsername(username) {
    return await User.findOne({
      where: { username },
      include: [
        {
          model: QuestHistory,
          as: 'questHistory',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });
  }

  async getUserByEmail(email) {
    return await User.findOne({
      where: { email },
      include: [
        {
          model: QuestHistory,
          as: 'questHistory',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });
  }

  async getUserById(id) {
    return await User.findByPk(id, {
      include: [
        {
          model: QuestHistory,
          as: 'questHistory',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ],
      attributes: { exclude: ['passwordHash'] }
    });
  }

  async createUser(userData) {
    const { username, password, email, role = 'user' } = userData;

    // 既存ユーザーチェック
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error('ユーザー名は既に使用されています');
      }
      if (existingUser.email === email) {
        throw new Error('メールアドレスは既に使用されています');
      }
    }

    // パスワードハッシュ化
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    const newUser = await User.create({
      username,
      email,
      passwordHash,
      role,
      authProvider: 'local',
      emailVerified: false,
      profile: {
        displayName: userData.displayName || username,
        avatar: userData.avatar || null,
        bio: userData.bio || null,
        level: 1,
        experience: 0,
        points: 0,
        rank: 'novice'
      },
      preferences: {
        theme: 'light',
        language: 'ja',
        notifications: {
          email: true,
          push: true,
          questUpdates: true,
          achievements: true
        }
      }
    });

    // パスワードハッシュを除外して返す
    const { passwordHash: _, ...userWithoutPassword } = newUser.toJSON();
    return userWithoutPassword;
  }

  async createGoogleUser(profile) {
    const { email, name, picture, sub: googleId } = profile;

    // 既存ユーザーチェック
    let user = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { googleId }
        ]
      }
    });

    if (user) {
      // Google IDが未設定の場合は更新
      if (!user.googleId && user.email === email) {
        user.googleId = googleId;
        user.authProvider = 'google';
        user.emailVerified = true;
        user.lastLoginAt = new Date();
        if (picture && !user.profilePicture) {
          user.profilePicture = picture;
        }
        await user.save();
      } else {
        // 最後のログイン時間を更新
        user.lastLoginAt = new Date();
        await user.save();
      }
      return user;
    }

    // 新規ユーザー作成
    const newUser = await User.create({
      email,
      username: name,
      googleId,
      role: 'user',
      authProvider: 'google',
      emailVerified: true,
      profilePicture: picture,
      profile: {
        displayName: name,
        avatar: picture,
        level: 1,
        experience: 0,
        points: 0,
        rank: 'novice'
      },
      preferences: {
        theme: 'light',
        language: 'ja',
        notifications: {
          email: true,
          push: true,
          questUpdates: true,
          achievements: true
        }
      },
      lastLoginAt: new Date()
    });

    return newUser;
  }

  async validateUser(username, password) {
    const user = await User.findOne({
      where: { username },
      attributes: ['id', 'username', 'email', 'passwordHash', 'role', 'status']
    });

    if (!user || !user.passwordHash) {
      return null;
    }

    if (user.status !== 'active') {
      throw new Error('アカウントが無効です');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    // 最後のログイン時間を更新
    user.lastLoginAt = new Date();
    await user.save();

    const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  async updateUser(userId, updates) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // 更新可能なフィールドのみを処理
    const allowedUpdates = [
      'username', 'email', 'bio', 'profilePicture', 'preferences',
      'emailNotifications', 'notificationTypes', 'locale'
    ];

    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // パスワード更新の場合
    if (updates.password) {
      filteredUpdates.passwordHash = await bcrypt.hash(updates.password, 12);
    }

    await user.update(filteredUpdates);
    
    // パスワードハッシュを除外して返す
    const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  async updateUserRole(userId, newRole) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    await user.update({ role: newRole });
    
    const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  async deleteUser(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // ソフトデリート（ステータスを変更）
    await user.update({ status: 'inactive' });
    return true;
  }

  async updateUserStats(userId, stats) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    const updates = {};
    if (stats.experience !== undefined) {
      updates.experience = Math.max(0, user.experience + stats.experience);
      
      // レベル計算
      const newLevel = Math.floor(Math.sqrt(updates.experience / 100)) + 1;
      if (newLevel > user.level) {
        updates.level = newLevel;
      }
    }

    if (stats.points !== undefined) {
      updates.points = Math.max(0, user.points + stats.points);
    }

    await user.update(updates);
    return user;
  }

  async getUserStats(userId) {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: QuestHistory,
          as: 'questHistory'
        }
      ]
    });

    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    const stats = {
      level: user.level,
      experience: user.experience,
      points: user.points,
      totalQuests: user.questHistory.length,
      completedQuests: user.questHistory.filter(h => h.action === 'completed').length,
      rank: this.calculateRank(user.level, user.points)
    };

    return stats;
  }

  calculateRank(level, points) {
    if (level >= 50 && points >= 10000) return 'legend';
    if (level >= 30 && points >= 5000) return 'master';
    if (level >= 20 && points >= 2000) return 'expert';
    if (level >= 10 && points >= 500) return 'veteran';
    if (level >= 5 && points >= 100) return 'apprentice';
    return 'novice';
  }

  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  async searchUsers(query, options = {}) {
    const { page = 1, limit = 10, role } = options;
    const offset = (page - 1) * limit;

    const where = {
      status: 'active',
      [Op.or]: [
        { username: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (role) {
      where.role = role;
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['username', 'ASC']],
      attributes: { exclude: ['passwordHash'] }
    });

    return {
      users,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }
}

module.exports = new UserService();