const fs = require('fs-extra');
const path = require('path');
const { parseMarkdown } = require('../utils/fileUtils');
const { User, Quest } = require('../models');

async function up() {
  console.log('データ移行を開始します...');

  try {
    // 1. ユーザーデータの移行
    console.log('ユーザーデータを移行中...');
    await migrateUsers();

    // 2. クエストデータの移行
    console.log('クエストデータを移行中...');
    await migrateQuests();

    console.log('データ移行が完了しました！');
  } catch (error) {
    console.error('データ移行中にエラーが発生しました:', error);
    throw error;
  }
}

async function migrateUsers() {
  const USERS_FILE = path.join(__dirname, '../../data/users/users.json');
  
  if (!await fs.pathExists(USERS_FILE)) {
    console.log('users.jsonが見つかりません。スキップします。');
    return;
  }

  const data = await fs.readJson(USERS_FILE);
  const users = data.users || [];

  let migratedCount = 0;
  
  for (const user of users) {
    try {
      // 既存ユーザーのチェック
      const existingUser = await User.findByPk(user.id);
      if (existingUser) {
        console.log(`ユーザー ${user.username} は既に存在します。スキップします。`);
        continue;
      }

      // ユーザーデータの正規化
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email || null,
        passwordHash: user.password || null,
        role: user.role || 'user',
        authProvider: user.authProvider || 'local',
        emailVerified: user.emailVerified || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        twoFactorSecret: user.twoFactorSecret || null,
        backupCodes: user.backupCodes || [],
        profile: {
          displayName: user.displayName || user.username,
          avatar: user.avatar || null,
          bio: user.bio || null,
          level: user.level || 1,
          experience: user.experience || 0,
          points: user.points || 0,
          rank: user.rank || 'novice'
        },
        preferences: {
          theme: user.preferences?.theme || 'light',
          language: user.preferences?.language || 'ja',
          notifications: {
            email: user.preferences?.notifications?.email || true,
            push: user.preferences?.notifications?.push || true,
            questUpdates: user.preferences?.notifications?.questUpdates || true,
            achievements: user.preferences?.notifications?.achievements || true
          }
        },
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: new Date()
      };

      await User.create(userData);
      migratedCount++;
      console.log(`ユーザー ${user.username} を移行しました`);
    } catch (error) {
      console.error(`ユーザー ${user.username} の移行中にエラー:`, error.message);
    }
  }

  console.log(`${migratedCount} 人のユーザーを移行しました`);
}

async function migrateQuests() {
  const QUESTS_DIR = path.join(__dirname, '../../data/quests');
  
  if (!await fs.pathExists(QUESTS_DIR)) {
    console.log('questsディレクトリが見つかりません。スキップします。');
    return;
  }

  const files = await fs.readdir(QUESTS_DIR);
  const mdFiles = files.filter(file => file.endsWith('.md'));

  let migratedCount = 0;

  for (const file of mdFiles) {
    try {
      const filePath = path.join(QUESTS_DIR, file);
      const questData = await parseMarkdown(filePath);

      if (!questData || !questData.id) {
        console.log(`無効なクエストファイル: ${file}`);
        continue;
      }

      // 既存クエストのチェック
      const existingQuest = await Quest.findByPk(questData.id);
      if (existingQuest) {
        console.log(`クエスト ${questData.title} は既に存在します。スキップします。`);
        continue;
      }

      // MarkdownコンテンツからDescriptionを抽出
      const description = extractDescription(questData.content);

      // クエストデータの正規化
      const dbQuestData = {
        id: questData.id,
        title: questData.title,
        description: description,
        content: questData.content,
        status: questData.status || 'available',
        reward: questData.reward,
        rewardPoints: calculateRewardPoints(questData.difficulty),
        difficulty: questData.difficulty,
        category: questData.category || null,
        tags: questData.tags || [],
        maxParticipants: questData.maxParticipants || 1,
        currentParticipants: questData.status === 'in_progress' ? 1 : 0,
        deadline: questData.deadline ? new Date(questData.deadline) : null,
        requirements: questData.requirements || {},
        imageUrl: questData.imageUrl || null,
        createdBy: questData.createdBy || null,
        acceptedBy: questData.acceptedBy || null,
        acceptedAt: questData.acceptedAt ? new Date(questData.acceptedAt) : null,
        completedAt: questData.completedAt ? new Date(questData.completedAt) : null,
        createdAt: questData.created_at ? new Date(questData.created_at) : new Date(),
        updatedAt: questData.updated_at ? new Date(questData.updated_at) : new Date()
      };

      await Quest.create(dbQuestData);
      migratedCount++;
      console.log(`クエスト ${questData.title} を移行しました`);
    } catch (error) {
      console.error(`クエストファイル ${file} の移行中にエラー:`, error.message);
    }
  }

  console.log(`${migratedCount} 件のクエストを移行しました`);
}

function extractDescription(content) {
  if (!content) return '';
  
  // ## 依頼内容 セクションから説明文を抽出
  const match = content.match(/## 依頼内容\s*\n(.*?)(?=\n##|$)/s);
  if (match) {
    return match[1].trim();
  }
  
  // フォールバック: 最初の段落を使用
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed;
    }
  }
  
  return '';
}

function calculateRewardPoints(difficulty) {
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

async function down() {
  console.log('データ移行のロールバックを開始します...');
  
  try {
    // 移行したデータを削除（注意: 本番環境では使用しないでください）
    await Quest.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
    
    console.log('データ移行のロールバックが完了しました');
  } catch (error) {
    console.error('ロールバック中にエラーが発生しました:', error);
    throw error;
  }
}

module.exports = { up, down };