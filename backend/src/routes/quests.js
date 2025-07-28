const express = require('express');
const router = express.Router();
const questService = require('../services/questService');
const userService = require('../services/userService');
const SearchService = require('../services/search');
const searchService = new SearchService();
const notificationService = require('../services/notification');
const { authenticate, isAdmin } = require('../middleware/auth');
const { emitQuestCreated, emitQuestUpdated, emitQuestDeleted, emitQuestAccepted, emitQuestCompleted } = require('../utils/socketEvents');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await questService.getActiveQuests(page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/completed', async (req, res) => {
  try {
    const userId = req.query.userId;
    const quests = await questService.getCompletedQuests(userId);
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const quest = await questService.getQuestById(req.params.id);
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    res.json(quest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/accept', authenticate, async (req, res) => {
  try {
    const quest = await questService.updateQuestStatus(req.params.id, 'in_progress', req.user.id);
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    await userService.updateUserQuests(req.user.id, req.params.id, 'accept');
    
    // Send notification
    await notificationService.notifyQuestAccepted(quest, req.user.id);
    
    emitQuestAccepted(quest);
    res.json(quest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, reward, difficulty } = req.body;
    
    if (!title || !description || !reward || !difficulty) {
      return res.status(400).json({ error: '必須項目が不足しています' });
    }
    
    const quest = await questService.createQuest({
      title,
      description,
      reward,
      difficulty,
      createdBy: req.user.id
    });
    
    // Index quest in Elasticsearch
    await searchService.indexQuest(quest);
    
    // Send notification to all users
    await notificationService.notifyQuestCreated(quest);
    
    emitQuestCreated(quest);
    res.status(201).json(quest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, reward, difficulty } = req.body;
    const quest = await questService.updateQuest(req.params.id, {
      title,
      description,
      reward,
      difficulty
    });
    
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    
    // Update quest in Elasticsearch
    await searchService.updateQuestIndex(req.params.id);
    
    emitQuestUpdated(quest);
    res.json(quest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const success = await questService.deleteQuest(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    
    // Remove quest from Elasticsearch
    await searchService.deleteQuestFromIndex(req.params.id);
    
    emitQuestDeleted({ id: req.params.id });
    res.json({ message: 'クエストを削除しました' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const quest = await questService.getQuestById(req.params.id);
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    if (quest.acceptedBy !== req.user.id) {
      return res.status(403).json({ error: 'このクエストを完了する権限がありません' });
    }
    const updatedQuest = await questService.updateQuestStatus(req.params.id, 'completed');
    await userService.updateUserQuests(req.user.id, req.params.id, 'complete');
    
    // Update quest status in Elasticsearch
    await searchService.updateQuestIndex(req.params.id);
    
    // Send completion notifications
    await notificationService.notifyQuestCompleted(updatedQuest, req.user.id);
    
    emitQuestCompleted(updatedQuest);
    res.json(updatedQuest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// クエスト評価統計取得
router.get('/:id/ratings/stats', async (req, res) => {
  try {
    const questId = req.params.id;
    const userId = req.user?.id;
    
    // 評価の集計データを取得（仮実装）
    const ratings = await questService.getQuestRatings(questId);
    
    let totalRating = 0;
    let userRating = null;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    ratings.forEach(rating => {
      totalRating += rating.rating;
      distribution[rating.rating]++;
      if (userId && rating.userId === userId) {
        userRating = rating.rating;
      }
    });
    
    const averageRating = ratings.length > 0 ? totalRating / ratings.length : 0;
    
    res.json({
      averageRating,
      totalRatings: ratings.length,
      userRating,
      distribution
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// クエスト評価一覧取得
router.get('/:id/ratings', async (req, res) => {
  try {
    const questId = req.params.id;
    const ratings = await questService.getQuestRatings(questId);
    
    // ユーザー名を追加（仮実装）
    const ratingsWithUsernames = ratings.map(rating => ({
      ...rating,
      username: rating.username || '冒険者' + rating.userId.substring(0, 4)
    }));
    
    res.json({ ratings: ratingsWithUsernames });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// クエスト評価投稿
router.post('/:id/ratings', authenticate, async (req, res) => {
  try {
    const questId = req.params.id;
    const userId = req.user.id;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '評価は1から5の間で入力してください' });
    }
    
    // 既存の評価をチェック
    const existingRating = await questService.getUserQuestRating(questId, userId);
    if (existingRating) {
      return res.status(400).json({ error: 'すでにこのクエストを評価しています' });
    }
    
    // 評価を保存
    const newRating = await questService.createQuestRating({
      questId,
      userId,
      rating,
      comment: comment || null,
      createdAt: new Date().toISOString()
    });
    
    res.json({ 
      message: '評価を投稿しました',
      rating: newRating 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;