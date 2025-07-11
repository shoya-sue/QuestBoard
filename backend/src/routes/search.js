const express = require('express');
const router = express.Router();
const searchService = require('../services/search');
const { auth } = require('../middleware/auth');

// クエスト検索
router.get('/quests', async (req, res) => {
  try {
    const {
      q: query,
      page = 1,
      limit = 20,
      category,
      difficulty,
      status,
      sortBy = 'relevance'
    } = req.query;

    const results = await searchService.searchQuests(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      difficulty,
      status,
      sortBy
    });

    res.json(results);
  } catch (error) {
    console.error('Quest search error:', error);
    res.status(500).json({ error: '検索中にエラーが発生しました' });
  }
});

// ユーザー検索（認証必要）
router.get('/users', auth, async (req, res) => {
  try {
    const {
      q: query,
      page = 1,
      limit = 20
    } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: '検索クエリは2文字以上必要です' });
    }

    const results = await searchService.searchUsers(query, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(results);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: '検索中にエラーが発生しました' });
  }
});

// オートコンプリート用サジェスト
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query, type = 'quest' } = req.query;

    if (!query || query.length < 1) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await searchService.getSuggestions(query, type);
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestion error:', error);
    res.json({ suggestions: [] });
  }
});

// 検索統計（管理者のみ）
router.get('/stats', auth, async (req, res) => {
  try {
    // 管理者チェック
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'アクセス権限がありません' });
    }

    // TODO: 検索統計の実装
    res.json({
      message: '検索統計機能は今後実装予定です'
    });
  } catch (error) {
    console.error('Search stats error:', error);
    res.status(500).json({ error: 'エラーが発生しました' });
  }
});

module.exports = router;