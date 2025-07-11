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