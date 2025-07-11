const express = require('express');
const router = express.Router();
const questService = require('../services/questService');
const userService = require('../services/userService');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const quests = await questService.getActiveQuests();
    res.json({ quests });
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
    res.json(updatedQuest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;