const { getClient } = require('../config/elasticsearch');
const { Quest, User } = require('../models');

class SearchService {
  constructor() {
    this.client = null;
  }

  getSearchClient() {
    if (!this.client) {
      this.client = getClient();
    }
    return this.client;
  }

  // クエストをElasticsearchにインデックス
  async indexQuest(quest) {
    const client = this.getSearchClient();
    if (!client) return;

    try {
      await client.index({
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

  // クエスト検索
  async searchQuests(query, options = {}) {
    const client = this.getSearchClient();
    if (!client) {
      // Elasticsearchが利用できない場合は、データベースから検索
      return this.searchQuestsFromDB(query, options);
    }

    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      status = 'available',
      sortBy = 'relevance'
    } = options;

    try {
      const must = [];
      const filter = [];

      // クエリ文字列での検索
      if (query) {
        must.push({
          multi_match: {
            query,
            fields: ['title^2', 'description', 'tags'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // フィルター条件
      if (category) filter.push({ term: { category } });
      if (difficulty) filter.push({ term: { difficulty } });
      if (status) filter.push({ term: { status } });

      const response = await client.search({
        index: 'quests',
        body: {
          query: {
            bool: {
              must,
              filter
            }
          },
          from: (page - 1) * limit,
          size: limit,
          sort: this.getSortOption(sortBy),
          highlight: {
            fields: {
              title: {},
              description: {}
            }
          }
        }
      });

      return {
        results: response.hits.hits.map(hit => ({
          ...hit._source,
          _score: hit._score,
          highlight: hit.highlight
        })),
        total: response.hits.total.value,
        page,
        totalPages: Math.ceil(response.hits.total.value / limit)
      };
    } catch (error) {
      console.error('Elasticsearch error:', error);
      return this.searchQuestsFromDB(query, options);
    }
  }

  // データベースからクエストを検索（フォールバック）
  async searchQuestsFromDB(query, options = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      status = 'available'
    } = options;

    const where = { status };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;

    if (query) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } }
      ];
    }

    const { count, rows } = await Quest.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    return {
      results: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  // ユーザー検索
  async searchUsers(query, options = {}) {
    const client = this.getSearchClient();
    if (!client) {
      return this.searchUsersFromDB(query, options);
    }

    const { page = 1, limit = 20 } = options;

    try {
      const response = await client.search({
        index: 'users',
        body: {
          query: {
            multi_match: {
              query,
              fields: ['username^2', 'email'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          },
          from: (page - 1) * limit,
          size: limit
        }
      });

      return {
        users: response.hits.hits.map(hit => hit._source),
        total: response.hits.total.value,
        page,
        totalPages: Math.ceil(response.hits.total.value / limit)
      };
    } catch (error) {
      console.error('Elasticsearch error:', error);
      return this.searchUsersFromDB(query, options);
    }
  }

  // データベースからユーザーを検索（フォールバック）
  async searchUsersFromDB(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const { Op } = require('sequelize');

    const { count, rows } = await User.findAndCountAll({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } }
        ]
      },
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']],
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
    const client = this.getSearchClient();
    if (!client) return [];

    try {
      const index = type === 'quest' ? 'quests' : 'users';
      const field = type === 'quest' ? 'title' : 'username';

      const response = await client.search({
        index,
        body: {
          suggest: {
            suggestions: {
              prefix: query,
              completion: {
                field: `${field}.suggest`,
                size: 10
              }
            }
          }
        }
      });

      return response.suggest.suggestions[0].options.map(option => option.text);
    } catch (error) {
      console.error('Suggestion error:', error);
      return [];
    }
  }

  // クエストをインデックスから削除
  async deleteQuestFromIndex(questId) {
    const client = this.getSearchClient();
    if (!client) return;

    try {
      await client.delete({
        index: 'quests',
        id: questId
      });
    } catch (error) {
      console.error('Error deleting quest from index:', error);
    }
  }

  // ユーザーをインデックスに追加
  async indexUser(user) {
    const client = this.getSearchClient();
    if (!client) return;

    try {
      await client.index({
        index: 'users',
        id: user.id,
        body: {
          id: user.id,
          email: user.email,
          username: user.username,
          level: user.level,
          experience: user.experience,
          points: user.points,
          completedQuests: user.completedQuests || 0,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Error indexing user:', error);
    }
  }

  // ソートオプションの取得
  getSortOption(sortBy) {
    switch (sortBy) {
      case 'newest':
        return [{ createdAt: { order: 'desc' } }];
      case 'oldest':
        return [{ createdAt: { order: 'asc' } }];
      case 'reward':
        return [{ reward: { order: 'desc' } }];
      case 'difficulty':
        return [{ difficulty: { order: 'asc' } }];
      default:
        return ['_score'];
    }
  }

  // インデックスの再構築
  async reindexAll() {
    const client = this.getSearchClient();
    if (!client) {
      console.log('Elasticsearch not available for reindexing');
      return;
    }

    console.log('Starting reindex...');

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

module.exports = SearchService;