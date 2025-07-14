const { Quest, User, QuestHistory } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('./notification');

class QuestService {
  async getActiveQuests(options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      difficulty, 
      status = ['available', 'in_progress'],
      search,
      userId 
    } = options;
    
    const offset = (page - 1) * limit;
    const where = { status: { [Op.in]: Array.isArray(status) ? status : [status] } };

    // 難易度フィルター
    if (difficulty) {
      where.difficulty = Array.isArray(difficulty) ? { [Op.in]: difficulty } : difficulty;
    }

    // 検索フィルター
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows: quests, count } = await Quest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'acceptor',
          attributes: ['id', 'username', 'profilePicture']
        }
      ],
      limit,
      offset,
      order: [['updatedAt', 'DESC']]
    });

    return {
      quests,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async getQuestById(id) {
    const quest = await Quest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture', 'level']
        },
        {
          model: User,
          as: 'acceptor',
          attributes: ['id', 'username', 'profilePicture', 'level']
        },
        {
          model: QuestHistory,
          as: 'history',
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'profilePicture']
            }
          ],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!quest) {
      throw new Error('クエストが見つかりません');
    }

    return quest;
  }

  async createQuest(questData, creatorId) {
    const quest = await Quest.create({
      ...questData,
      createdBy: creatorId,
      status: 'available',
      rewardPoints: this.calculateRewardPoints(questData.difficulty)
    });

    // 作成履歴を記録
    await QuestHistory.create({
      questId: quest.id,
      userId: creatorId,
      action: 'created',
      details: { title: quest.title }
    });

    // 通知を送信
    await notificationService.sendQuestCreatedNotification(quest);

    return await this.getQuestById(quest.id);
  }

  async updateQuest(id, updates, userId) {
    const quest = await Quest.findByPk(id);
    if (!quest) {
      throw new Error('クエストが見つかりません');
    }

    // 権限チェック（作成者または管理者のみ）
    const user = await User.findByPk(userId);
    if (quest.createdBy !== userId && user.role !== 'admin') {
      throw new Error('クエストを更新する権限がありません');
    }

    const oldValues = {
      title: quest.title,
      description: quest.description,
      difficulty: quest.difficulty
    };

    await quest.update(updates);

    // 更新履歴を記録
    await QuestHistory.create({
      questId: quest.id,
      userId,
      action: 'updated',
      details: { 
        oldValues,
        newValues: updates
      }
    });

    return await this.getQuestById(quest.id);
  }

  async deleteQuest(id, userId) {
    const quest = await Quest.findByPk(id);
    if (!quest) {
      throw new Error('クエストが見つかりません');
    }

    // 権限チェック
    const user = await User.findByPk(userId);
    if (quest.createdBy !== userId && user.role !== 'admin') {
      throw new Error('クエストを削除する権限がありません');
    }

    // 進行中の場合は削除不可
    if (quest.status === 'in_progress') {
      throw new Error('進行中のクエストは削除できません');
    }

    // 削除履歴を記録
    await QuestHistory.create({
      questId: quest.id,
      userId,
      action: 'deleted',
      details: { title: quest.title }
    });

    await quest.destroy();
    return true;
  }

  async acceptQuest(questId, userId) {
    const quest = await Quest.findByPk(questId);
    if (!quest) {
      throw new Error('クエストが見つかりません');
    }

    if (quest.status !== 'available') {
      throw new Error('このクエストは受注できません');
    }

    if (quest.currentParticipants >= quest.maxParticipants) {
      throw new Error('参加者が上限に達しています');
    }

    await quest.update({
      status: 'in_progress',
      acceptedBy: userId,
      acceptedAt: new Date(),
      currentParticipants: quest.currentParticipants + 1
    });

    // 受注履歴を記録
    await QuestHistory.create({
      questId: quest.id,
      userId,
      action: 'accepted',
      details: { title: quest.title }
    });

    // 通知を送信
    await notificationService.sendQuestAcceptedNotification(quest, userId);

    return await this.getQuestById(quest.id);
  }

  async completeQuest(questId, userId) {
    const quest = await Quest.findByPk(questId);
    if (!quest) {
      throw new Error('クエストが見つかりません');
    }

    if (quest.status !== 'in_progress') {
      throw new Error('このクエストは完了できません');
    }

    if (quest.acceptedBy !== userId) {
      throw new Error('このクエストを完了する権限がありません');
    }

    await quest.update({
      status: 'completed',
      completedAt: new Date()
    });

    // 完了履歴を記録
    await QuestHistory.create({
      questId: quest.id,
      userId,
      action: 'completed',
      details: { 
        title: quest.title,
        rewardPoints: quest.rewardPoints
      }
    });

    // ユーザー統計を更新
    const userService = require('./userService.v2');
    await userService.updateUserStats(userId, {
      experience: quest.rewardPoints,
      points: quest.rewardPoints
    });

    // 通知を送信
    await notificationService.sendQuestCompletedNotification(quest, userId);

    return await this.getQuestById(quest.id);
  }

  async getCompletedQuests(userId = null, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const where = { status: 'completed' };
    if (userId) {
      where.acceptedBy = userId;
    }

    const { rows: quests, count } = await Quest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'acceptor',
          attributes: ['id', 'username', 'profilePicture']
        }
      ],
      limit,
      offset,
      order: [['completedAt', 'DESC']]
    });

    return {
      quests,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async getUserQuestHistory(userId, options = {}) {
    const { page = 1, limit = 10, action } = options;
    const offset = (page - 1) * limit;

    const where = { userId };
    if (action) {
      where.action = action;
    }

    const { rows: history, count } = await QuestHistory.findAndCountAll({
      where,
      include: [
        {
          model: Quest,
          attributes: ['id', 'title', 'difficulty', 'rewardPoints']
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      history,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async getQuestStats() {
    const stats = await Quest.findAll({
      attributes: [
        [Quest.sequelize.fn('COUNT', Quest.sequelize.col('id')), 'total'],
        [Quest.sequelize.fn('COUNT', Quest.sequelize.literal("CASE WHEN status = 'available' THEN 1 END")), 'available'],
        [Quest.sequelize.fn('COUNT', Quest.sequelize.literal("CASE WHEN status = 'in_progress' THEN 1 END")), 'inProgress'],
        [Quest.sequelize.fn('COUNT', Quest.sequelize.literal("CASE WHEN status = 'completed' THEN 1 END")), 'completed']
      ],
      raw: true
    });

    return stats[0];
  }

  async searchQuests(query, options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      difficulty, 
      status = ['available', 'in_progress'],
      userId 
    } = options;
    
    const offset = (page - 1) * limit;
    
    const where = {
      status: { [Op.in]: Array.isArray(status) ? status : [status] },
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
        { category: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (difficulty) {
      where.difficulty = Array.isArray(difficulty) ? { [Op.in]: difficulty } : difficulty;
    }

    const { rows: quests, count } = await Quest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'acceptor',
          attributes: ['id', 'username', 'profilePicture']
        }
      ],
      limit,
      offset,
      order: [['relevance', 'DESC'], ['updatedAt', 'DESC']]
    });

    return {
      quests,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  calculateRewardPoints(difficulty) {
    const pointsMap = {
      'E': 10,
      'D': 25,
      'C': 50,
      'B': 100,
      'A': 200,
      'S': 500,
      'SS': 1000
    };
    
    return pointsMap[difficulty] || 10;
  }

  // 評価関連のメソッド（データベースベース）
  async createQuestRating(questId, userId, rating, comment = '') {
    const quest = await Quest.findByPk(questId);
    if (!quest) {
      throw new Error('クエストが見つかりません');
    }

    // ユーザーがこのクエストを完了しているかチェック
    const history = await QuestHistory.findOne({
      where: {
        questId,
        userId,
        action: 'completed'
      }
    });

    if (!history) {
      throw new Error('完了していないクエストは評価できません');
    }

    // 既存の評価をチェック
    let existingRating = quest.ratings?.find(r => r.userId === userId);
    
    if (existingRating) {
      // 既存の評価を更新
      existingRating.rating = rating;
      existingRating.comment = comment;
      existingRating.updatedAt = new Date();
    } else {
      // 新しい評価を追加
      if (!quest.ratings) {
        quest.ratings = [];
      }
      quest.ratings.push({
        id: Date.now().toString(),
        userId,
        rating,
        comment,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 平均評価を再計算
    const totalRating = quest.ratings.reduce((sum, r) => sum + r.rating, 0);
    quest.averageRating = totalRating / quest.ratings.length;

    await quest.save();

    return await this.getQuestById(questId);
  }

  async getQuestRatings(questId) {
    const quest = await Quest.findByPk(questId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    if (!quest) {
      throw new Error('クエストが見つかりません');
    }

    return quest.ratings || [];
  }

  async getUserQuestRating(questId, userId) {
    const quest = await Quest.findByPk(questId);
    if (!quest) {
      throw new Error('クエストが見つかりません');
    }

    return quest.ratings?.find(r => r.userId === userId) || null;
  }
}

module.exports = new QuestService();