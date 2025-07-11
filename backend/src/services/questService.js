const fs = require('fs-extra');
const path = require('path');
const { parseMarkdown, saveMarkdown } = require('../utils/fileUtils');

const QUESTS_DIR = path.join(__dirname, '../../data/quests');

class QuestService {
  async getActiveQuests() {
    await fs.ensureDir(QUESTS_DIR);
    
    const files = await fs.readdir(QUESTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    const quests = [];
    
    for (const file of mdFiles) {
      const filePath = path.join(QUESTS_DIR, file);
      const quest = await parseMarkdown(filePath);
      
      if (quest && (quest.status === 'available' || quest.status === 'in_progress')) {
        quest.mdFilePath = `/data/quests/${file}`;
        quests.push(quest);
      }
    }
    
    return quests;
  }
  
  async getQuestById(id) {
    const files = await fs.readdir(QUESTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = path.join(QUESTS_DIR, file);
      const quest = await parseMarkdown(filePath);
      
      if (quest && quest.id === id) {
        quest.mdFilePath = `/data/quests/${file}`;
        return quest;
      }
    }
    
    return null;
  }
  
  async updateQuestStatus(id, newStatus) {
    const files = await fs.readdir(QUESTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = path.join(QUESTS_DIR, file);
      const quest = await parseMarkdown(filePath);
      
      if (quest && quest.id === id) {
        quest.status = newStatus;
        quest.updated_at = new Date().toISOString();
        
        await saveMarkdown(filePath, quest);
        quest.mdFilePath = `/data/quests/${file}`;
        
        return quest;
      }
    }
    
    return null;
  }
}

module.exports = new QuestService();