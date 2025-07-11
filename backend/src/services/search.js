const { getClient } = require('../config/elasticsearch');
const { Quest, User } = require('../models');

class SearchService {
  constructor() {
    this.client = getClient();
  }

  // クエストをElasticsearchにインデックス
  async indexQuest(quest) {
    if (!this.client) return;

    try {
      await this.client.index({
        index: 'quests',
        id: quest.id,
        body: {
          id: quest.id,
          title: quest.title,
          description: quest.description,
          category: quest.category,
          difficulty: quest.difficulty,
          status: quest.status,
          reward: quest.reward,
          tags: quest.tags || [],
          createdAt: quest.createdAt,
          updatedAt: quest.updatedAt,
          createdBy: quest.createdBy,
          completedBy: quest.completedBy,
          completedAt: quest.completedAt
        }
      });
    } catch (error) {
      console.error('Error indexing quest:', error);
    }
  }

  // ユーザーをElasticsearchにインデックス
  async indexUser(user) {
    if (!this.client) return;

    try {
      await this.client.index({
        index: 'users',
        id: user.id,
        body: {
          id: user.id,
          email: user.email,
          username: user.username,
          level: user.level || 1,
          experience: user.experience || 0,
          points: user.points || 0,
          completedQuests: user.completedQuests || 0,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Error indexing user:', error);
    }
  }

  // クエストの検索
  async searchQuests(query, options = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      status,
      sortBy = 'relevance'
    } = options;

    // Elasticsearchが利用できない場合はデータベースから検索
    if (!this.client) {
      return this.searchQuestsFromDB(query, options);
    }

    try {
      const from = (page - 1) * limit;
      
      // 検索クエリの構築
      const must = [];
      const filter = [];

      if (query) {
        must.push({
          multi_match: {
            query: query,
            fields: ['title^2', 'description', 'tags'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      if (category) {
        filter.push({ term: { category } });
      }

      if (difficulty) {
        filter.push({ term: { difficulty } });
      }

      if (status) {
        filter.push({ term: { status } });
      }

      // ソート設定
      let sort = [];
      switch (sortBy) {
        case 'newest':
          sort = [{ createdAt: { order: 'desc' } }];
          break;
        case 'reward':
          sort = [{ reward: { order: 'desc' } }];
          break;
        case 'difficulty':
          sort = [{ difficulty: { order: 'asc' } }];
          break;
        default:
          sort = ['_score'];
      }

      const searchBody = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        sort,
        from,
        size: limit,
        highlight: {
          fields: {
            title: {},
            description: {}
          }
        }
      };

      const result = await this.client.search({
        index: 'quests',
        body: searchBody
      });

      const hits = result.hits.hits;
      const total = result.hits.total.value;

      return {
        quests: hits.map(hit => ({
          ...hit._source,
          _score: hit._score,
          highlight: hit.highlight
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      // フォールバック: データベースから検索
      return this.searchQuestsFromDB(query, options);
    }
  }

  // データベースからの検索（フォールバック）
  async searchQuestsFromDB(query, options = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      status
    } = options;

    const where = {};
    
    if (query) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } }
      ];
    }

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { count, rows } = await Quest.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'email']
      }]
    });

    return {
      quests: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  // ユーザーの検索
  async searchUsers(query, options = {}) {
    const { page = 1, limit = 20 } = options;

    if (!this.client) {
      return this.searchUsersFromDB(query, options);
    }

    try {
      const from = (page - 1) * limit;

      const searchBody = {
        query: {
          multi_match: {
            query: query,
            fields: ['username^2', 'email'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        },
        from,
        size: limit,
        sort: [
          { level: { order: 'desc' } },
          { points: { order: 'desc' } }
        ]
      };

      const result = await this.client.search({
        index: 'users',
        body: searchBody
      });

      const hits = result.hits.hits;
      const total = result.hits.total.value;

      return {
        users: hits.map(hit => hit._source),
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Elasticsearch user search error:', error);
      return this.searchUsersFromDB(query, options);
    }
  }

  // データベースからのユーザー検索（フォールバック）
  async searchUsersFromDB(query, options = {}) {
    const { page = 1, limit = 20 } = options;

    const where = {
      [Op.or]: [
        { username: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } }
      ]
    };

    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [
        ['level', 'DESC'],
        ['points', 'DESC']
      ],
      attributes: { exclude: ['password'] }
    });

    return {
      users: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  // サジェスト機能
  async getSuggestions(query, type = 'quest') {
    if (!this.client) return [];

    try {
      const index = type === 'quest' ? 'quests' : 'users';
      const field = type === 'quest' ? 'title' : 'username';

      const result = await this.client.search({
        index,
        body: {
          suggest: {
            suggestion: {
              prefix: query,
              completion: {
                field: `${field}.keyword`,
                size: 10
              }
            }
          }
        }
      });

      return result.suggest.suggestion[0].options.map(option => option.text);
    } catch (error) {
      console.error('Suggestion error:', error);
      return [];
    }
  }

  // インデックスの更新
  async updateQuestIndex(questId) {
    const quest = await Quest.findByPk(questId);
    if (quest) {
      await this.indexQuest(quest);
    }
  }

  async updateUserIndex(userId) {
    const user = await User.findByPk(userId);
    if (user) {
      await this.indexUser(user);
    }
  }

  // インデックスの削除
  async deleteQuestFromIndex(questId) {
    if (!this.client) return;

    try {
      await this.client.delete({
        index: 'quests',
        id: questId
      });
    } catch (error) {
      console.error('Error deleting quest from index:', error);
    }
  }

  async deleteUserFromIndex(userId) {
    if (!this.client) return;

    try {
      await this.client.delete({
        index: 'users',
        id: userId
      });
    } catch (error) {
      console.error('Error deleting user from index:', error);
    }
  }

  // 全データの再インデックス
  async reindexAll() {
    if (!this.client) {
      console.log('Elasticsearch not available, skipping reindex');
      return;
    }

    console.log('Starting reindex of all data...');

    // クエストの再インデックス
    const quests = await Quest.findAll();
    for (const quest of quests) {
      await this.indexQuest(quest);
    }
    console.log(`Reindexed ${quests.length} quests`);

    // ユーザーの再インデックス
    const users = await User.findAll();
    for (const user of users) {
      await this.indexUser(user);
    }
    console.log(`Reindexed ${users.length} users`);

    console.log('Reindex completed');
  }
}

// Sequelizeの必要なオペレーターをインポート
const { Op } = require('sequelize');

module.exports = new SearchService();