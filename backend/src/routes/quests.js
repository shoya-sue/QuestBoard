const express = require('express');
const router = express.Router();
const questService = require('../services/questService');

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

router.post('/:id/accept', async (req, res) => {
  try {
    const quest = await questService.updateQuestStatus(req.params.id, 'in_progress');
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    res.json(quest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const quest = await questService.updateQuestStatus(req.params.id, 'completed');
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    res.json(quest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;