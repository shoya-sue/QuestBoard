const { Sequelize } = require('sequelize');
const path = require('path');

// テスト用データベース設定
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../temp/integration-test.db'),
  logging: false
});

// モデルのインポート
const userModel = require('../../models/User')(sequelize, Sequelize.DataTypes);
const questModel = require('../../models/Quest')(sequelize, Sequelize.DataTypes);
const questHistoryModel = require('../../models/QuestHistory')(sequelize, Sequelize.DataTypes);
const achievementModel = require('../../models/Achievement')(sequelize, Sequelize.DataTypes);
const userAchievementModel = require('../../models/UserAchievement')(sequelize, Sequelize.DataTypes);
const notificationModel = require('../../models/Notification')(sequelize, Sequelize.DataTypes);

// アソシエーションの設定
const models = {
  User: userModel,
  Quest: questModel,
  QuestHistory: questHistoryModel,
  Achievement: achievementModel,
  UserAchievement: userAchievementModel,
  Notification: notificationModel
};

// アソシエーションを設定
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // テーブルの初期化
    await Promise.all([
      models.UserAchievement.destroy({ where: {}, truncate: true }),
      models.Notification.destroy({ where: {}, truncate: true }),
      models.QuestHistory.destroy({ where: {}, truncate: true }),
      models.Quest.destroy({ where: {}, truncate: true }),
      models.User.destroy({ where: {}, truncate: true }),
      models.Achievement.destroy({ where: {}, truncate: true })
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('User Model', () => {
    test('ユーザーを作成し、関連データを含めて取得できる', async () => {
      const user = await models.User.create({
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        level: 1,
        experience: 0,
        points: 0
      });

      const foundUser = await models.User.findByPk(user.id, {
        include: [
          { model: models.QuestHistory, as: 'questHistory' },
          { model: models.UserAchievement, as: 'achievements' }
        ]
      });

      expect(foundUser).toBeDefined();
      expect(foundUser.username).toBe('testuser');
      expect(foundUser.questHistory).toEqual([]);
      expect(foundUser.achievements).toEqual([]);
    });

    test('ユーザーの一意制約が機能する', async () => {
      await models.User.create({
        username: 'unique',
        email: 'unique@example.com',
        role: 'user'
      });

      // 同じメールアドレスでの作成を試行
      await expect(models.User.create({
        username: 'different',
        email: 'unique@example.com',
        role: 'user'
      })).rejects.toThrow();
    });
  });

  describe('Quest Model', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await models.User.create({
        username: 'questcreator',
        email: 'creator@example.com',
        role: 'admin'
      });
    });

    test('クエストを作成し、作成者と関連付けられる', async () => {
      const quest = await models.Quest.create({
        title: 'テストクエスト',
        description: 'テスト用のクエスト',
        reward: '100G',
        difficulty: 'C',
        createdBy: testUser.id,
        rewardPoints: 50
      });

      const foundQuest = await models.Quest.findByPk(quest.id, {
        include: [
          { model: models.User, as: 'creator' },
          { model: models.QuestHistory, as: 'history' }
        ]
      });

      expect(foundQuest).toBeDefined();
      expect(foundQuest.title).toBe('テストクエスト');
      expect(foundQuest.creator.username).toBe('questcreator');
      expect(foundQuest.history).toEqual([]);
    });

    test('クエストの難易度列挙値が正しく機能する', async () => {
      const validDifficulties = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];

      for (const difficulty of validDifficulties) {
        const quest = await models.Quest.create({
          title: `${difficulty}級クエスト`,
          description: 'テスト',
          reward: '100G',
          difficulty,
          createdBy: testUser.id,
          rewardPoints: 50
        });

        expect(quest.difficulty).toBe(difficulty);
      }

      // 無効な難易度での作成を試行
      await expect(models.Quest.create({
        title: '無効なクエスト',
        description: 'テスト',
        reward: '100G',
        difficulty: 'X', // 無効な難易度
        createdBy: testUser.id,
        rewardPoints: 50
      })).rejects.toThrow();
    });
  });

  describe('QuestHistory Model', () => {
    let testUser, testQuest;

    beforeEach(async () => {
      testUser = await models.User.create({
        username: 'adventurer',
        email: 'adventurer@example.com',
        role: 'user'
      });

      testQuest = await models.Quest.create({
        title: 'テストクエスト',
        description: 'テスト用のクエスト',
        reward: '100G',
        difficulty: 'C',
        createdBy: testUser.id,
        rewardPoints: 50
      });
    });

    test('クエスト履歴を作成し、ユーザーとクエストに関連付けられる', async () => {
      const history = await models.QuestHistory.create({
        userId: testUser.id,
        questId: testQuest.id,
        action: 'accepted',
        details: { message: 'クエストを受注しました' }
      });

      const foundHistory = await models.QuestHistory.findByPk(history.id, {
        include: [
          { model: models.User },
          { model: models.Quest }
        ]
      });

      expect(foundHistory).toBeDefined();
      expect(foundHistory.action).toBe('accepted');
      expect(foundHistory.User.username).toBe('adventurer');
      expect(foundHistory.Quest.title).toBe('テストクエスト');
      expect(foundHistory.details.message).toBe('クエストを受注しました');
    });

    test('複数のアクションを記録できる', async () => {
      const actions = ['created', 'accepted', 'completed'];

      for (const action of actions) {
        await models.QuestHistory.create({
          userId: testUser.id,
          questId: testQuest.id,
          action,
          details: { action }
        });
      }

      const histories = await models.QuestHistory.findAll({
        where: { questId: testQuest.id },
        order: [['createdAt', 'ASC']]
      });

      expect(histories).toHaveLength(3);
      expect(histories.map(h => h.action)).toEqual(actions);
    });
  });

  describe('Achievement System', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await models.User.create({
        username: 'achiever',
        email: 'achiever@example.com',
        role: 'user'
      });

      // 基本的な実績を作成
      await models.Achievement.create({
        id: 'first_quest',
        name: '初回クエスト',
        description: '最初のクエストを完了',
        icon: '🎯',
        category: 'quest',
        requirements: { questsCompleted: 1 }
      });
    });

    test('ユーザーが実績を獲得できる', async () => {
      const achievement = await models.Achievement.findByPk('first_quest');
      
      await models.UserAchievement.create({
        userId: testUser.id,
        achievementId: achievement.id,
        unlockedAt: new Date()
      });

      const userWithAchievements = await models.User.findByPk(testUser.id, {
        include: [{
          model: models.UserAchievement,
          as: 'achievements',
          include: [{ model: models.Achievement }]
        }]
      });

      expect(userWithAchievements.achievements).toHaveLength(1);
      expect(userWithAchievements.achievements[0].Achievement.name).toBe('初回クエスト');
    });

    test('同じ実績を重複して獲得できない', async () => {
      const achievement = await models.Achievement.findByPk('first_quest');
      
      await models.UserAchievement.create({
        userId: testUser.id,
        achievementId: achievement.id,
        unlockedAt: new Date()
      });

      // 同じ実績の重複獲得を試行
      await expect(models.UserAchievement.create({
        userId: testUser.id,
        achievementId: achievement.id,
        unlockedAt: new Date()
      })).rejects.toThrow();
    });
  });

  describe('Notification System', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await models.User.create({
        username: 'notified',
        email: 'notified@example.com',
        role: 'user'
      });
    });

    test('通知を作成し、ユーザーに関連付けられる', async () => {
      const notification = await models.Notification.create({
        userId: testUser.id,
        type: 'quest_completed',
        title: 'クエスト完了',
        message: 'クエストを完了しました！',
        data: { questId: 'quest-123' },
        read: false
      });

      const foundNotification = await models.Notification.findByPk(notification.id, {
        include: [{ model: models.User }]
      });

      expect(foundNotification).toBeDefined();
      expect(foundNotification.type).toBe('quest_completed');
      expect(foundNotification.User.username).toBe('notified');
      expect(foundNotification.data.questId).toBe('quest-123');
      expect(foundNotification.read).toBe(false);
    });

    test('通知を既読にマークできる', async () => {
      const notification = await models.Notification.create({
        userId: testUser.id,
        type: 'info',
        title: 'お知らせ',
        message: 'システムメンテナンスのお知らせ',
        read: false
      });

      await notification.update({ read: true });

      const updatedNotification = await models.Notification.findByPk(notification.id);
      expect(updatedNotification.read).toBe(true);
    });
  });

  describe('Complex Queries', () => {
    let users, quests;

    beforeEach(async () => {
      // テストデータの準備
      users = await Promise.all([
        models.User.create({ username: 'user1', email: 'user1@example.com', role: 'user' }),
        models.User.create({ username: 'user2', email: 'user2@example.com', role: 'user' }),
        models.User.create({ username: 'admin', email: 'admin@example.com', role: 'admin' })
      ]);

      quests = await Promise.all([
        models.Quest.create({
          title: 'クエスト1',
          description: 'テスト1',
          reward: '100G',
          difficulty: 'C',
          status: 'available',
          createdBy: users[2].id,
          rewardPoints: 50
        }),
        models.Quest.create({
          title: 'クエスト2',
          description: 'テスト2',
          reward: '200G',
          difficulty: 'B',
          status: 'completed',
          createdBy: users[2].id,
          acceptedBy: users[0].id,
          rewardPoints: 100
        })
      ]);
    });

    test('難易度別のクエスト数を集計できる', async () => {
      const stats = await models.Quest.findAll({
        attributes: [
          'difficulty',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['difficulty'],
        raw: true
      });

      expect(stats).toHaveLength(2);
      expect(stats.find(s => s.difficulty === 'C').count).toBe('1');
      expect(stats.find(s => s.difficulty === 'B').count).toBe('1');
    });

    test('ユーザーの完了クエスト数を取得できる', async () => {
      // クエスト履歴を追加
      await models.QuestHistory.create({
        userId: users[0].id,
        questId: quests[1].id,
        action: 'completed',
        details: {}
      });

      const userStats = await models.User.findAll({
        attributes: [
          'id',
          'username',
          [
            sequelize.fn('COUNT', sequelize.col('questHistory.id')),
            'completedQuests'
          ]
        ],
        include: [{
          model: models.QuestHistory,
          as: 'questHistory',
          attributes: [],
          where: { action: 'completed' },
          required: false
        }],
        group: ['User.id'],
        raw: true
      });

      const user1Stats = userStats.find(s => s.username === 'user1');
      expect(user1Stats.completedQuests).toBe('1');
    });
  });
});