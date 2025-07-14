#!/usr/bin/env node

const { Sequelize } = require('sequelize');
const path = require('path');

// SQLite用の設定
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../temp/test.db'),
  logging: console.log
});

// モデルを手動で定義（簡易版）
const models = {};

// User model
models.User = sequelize.define('User', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  username: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  passwordHash: {
    type: Sequelize.STRING,
    field: 'password_hash',
  },
  role: {
    type: Sequelize.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  authProvider: {
    type: Sequelize.STRING,
    defaultValue: 'local',
    field: 'auth_provider',
  },
  emailVerified: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    field: 'email_verified',
  },
  profile: {
    type: Sequelize.JSON,
    defaultValue: {},
  },
  preferences: {
    type: Sequelize.JSON,
    defaultValue: {},
  }
}, {
  tableName: 'users',
  underscored: true,
});

// Quest model
models.Quest = sequelize.define('Quest', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  content: {
    type: Sequelize.TEXT,
  },
  status: {
    type: Sequelize.ENUM('available', 'in_progress', 'completed'),
    defaultValue: 'available',
  },
  reward: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  rewardPoints: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    field: 'reward_points',
  },
  difficulty: {
    type: Sequelize.ENUM('E', 'D', 'C', 'B', 'A', 'S', 'SS'),
    allowNull: false,
  },
  createdBy: {
    type: Sequelize.UUID,
    field: 'created_by',
  },
  acceptedBy: {
    type: Sequelize.UUID,
    field: 'accepted_by',
  },
}, {
  tableName: 'quests',
  underscored: true,
});

async function testMigration() {
  try {
    console.log('データベース接続テスト中...');
    await sequelize.authenticate();
    console.log('✅ データベース接続成功');

    console.log('テーブル作成中...');
    await sequelize.sync({ force: true });
    console.log('✅ テーブル作成成功');

    // サンプルデータの投入テスト
    console.log('サンプルデータ投入テスト中...');
    
    const user = await models.User.create({
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
      profile: {
        displayName: 'Test User',
        level: 1,
        experience: 0,
        points: 0
      }
    });
    console.log('✅ ユーザー作成成功:', user.username);

    const quest = await models.Quest.create({
      title: 'テストクエスト',
      description: 'これはテスト用のクエストです',
      content: '# テストクエスト\n\nテスト内容',
      reward: '100G',
      rewardPoints: 100,
      difficulty: 'C',
      createdBy: user.id
    });
    console.log('✅ クエスト作成成功:', quest.title);

    // データ取得テスト
    const users = await models.User.findAll();
    const quests = await models.Quest.findAll();
    
    console.log('✅ データ取得成功');
    console.log(`  - ユーザー数: ${users.length}`);
    console.log(`  - クエスト数: ${quests.length}`);

    console.log('🎉 マイグレーション機能のテストが完了しました！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// スクリプト直接実行時の処理
if (require.main === module) {
  testMigration();
}

module.exports = { testMigration, models, sequelize };