const { Sequelize } = require('sequelize');
const UserService = require('../services/userService');
const { User, QuestHistory } = require('../models');

// テスト用SQLiteデータベース設定
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// モデルの設定
const userModel = require('../models/User')(sequelize, Sequelize.DataTypes);
const questHistoryModel = require('../models/QuestHistory')(sequelize, Sequelize.DataTypes);

userModel.associate({ QuestHistory: questHistoryModel });
questHistoryModel.associate({ User: userModel });

describe('UserService', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await userModel.destroy({ where: {}, truncate: true });
    await questHistoryModel.destroy({ where: {}, truncate: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('createUser', () => {
    test('新規ユーザーを正常に作成できる', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      const user = await UserService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('user');
      expect(user.passwordHash).toBeUndefined(); // パスワードハッシュは返されない
      expect(user.profile.level).toBe(1);
      expect(user.profile.experience).toBe(0);
    });

    test('重複したユーザー名でエラーが発生する', async () => {
      const userData1 = {
        username: 'duplicate',
        email: 'test1@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'duplicate',
        email: 'test2@example.com',
        password: 'password123'
      };

      await UserService.createUser(userData1);

      await expect(UserService.createUser(userData2))
        .rejects.toThrow('ユーザー名は既に使用されています');
    });

    test('重複したメールアドレスでエラーが発生する', async () => {
      const userData1 = {
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'user2',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      await UserService.createUser(userData1);

      await expect(UserService.createUser(userData2))
        .rejects.toThrow('メールアドレスは既に使用されています');
    });
  });

  describe('validateUser', () => {
    test('正しい認証情報でユーザーを検証できる', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await UserService.createUser(userData);
      
      const user = await UserService.validateUser('testuser', 'password123');

      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBeUndefined();
    });

    test('間違ったパスワードで認証に失敗する', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await UserService.createUser(userData);
      
      const user = await UserService.validateUser('testuser', 'wrongpassword');

      expect(user).toBeNull();
    });

    test('存在しないユーザーで認証に失敗する', async () => {
      const user = await UserService.validateUser('nonexistent', 'password123');
      expect(user).toBeNull();
    });
  });

  describe('createGoogleUser', () => {
    test('Googleプロフィールから新規ユーザーを作成できる', async () => {
      const profile = {
        email: 'google@example.com',
        name: 'Google User',
        picture: 'https://example.com/avatar.jpg',
        sub: 'google123'
      };

      const user = await UserService.createGoogleUser(profile);

      expect(user).toBeDefined();
      expect(user.email).toBe('google@example.com');
      expect(user.username).toBe('Google User');
      expect(user.authProvider).toBe('google');
      expect(user.emailVerified).toBe(true);
      expect(user.profilePicture).toBe('https://example.com/avatar.jpg');
    });

    test('既存のGoogleユーザーのログイン時間を更新する', async () => {
      const profile = {
        email: 'google@example.com',
        name: 'Google User',
        picture: 'https://example.com/avatar.jpg',
        sub: 'google123'
      };

      // 最初のユーザー作成
      const user1 = await UserService.createGoogleUser(profile);
      const firstLoginTime = user1.lastLoginAt;

      // 少し待ってから再度ログイン
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const user2 = await UserService.createGoogleUser(profile);
      
      expect(user2.id).toBe(user1.id);
      expect(new Date(user2.lastLoginAt).getTime())
        .toBeGreaterThan(new Date(firstLoginTime).getTime());
    });
  });

  describe('getUserById', () => {
    test('IDでユーザーを取得できる', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const createdUser = await UserService.createUser(userData);
      const foundUser = await UserService.getUserById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.username).toBe('testuser');
      expect(foundUser.passwordHash).toBeUndefined();
    });

    test('存在しないIDで null が返される', async () => {
      const user = await UserService.getUserById('nonexistent-id');
      expect(user).toBeNull();
    });
  });

  describe('generateToken', () => {
    test('有効なJWTトークンを生成する', () => {
      const user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      };

      const token = UserService.generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWTは3つの部分から構成される
    });
  });

  describe('verifyToken', () => {
    test('有効なトークンを検証できる', () => {
      const user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      };

      const token = UserService.generateToken(user);
      const decoded = UserService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe('user123');
      expect(decoded.username).toBe('testuser');
      expect(decoded.role).toBe('user');
    });

    test('無効なトークンで null が返される', () => {
      const decoded = UserService.verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('calculateRank', () => {
    test('ランクを正しく計算する', () => {
      expect(UserService.calculateRank(1, 0)).toBe('novice');
      expect(UserService.calculateRank(5, 100)).toBe('apprentice');
      expect(UserService.calculateRank(10, 500)).toBe('veteran');
      expect(UserService.calculateRank(20, 2000)).toBe('expert');
      expect(UserService.calculateRank(30, 5000)).toBe('master');
      expect(UserService.calculateRank(50, 10000)).toBe('legend');
    });
  });
});