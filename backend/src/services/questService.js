const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { parseMarkdown, saveMarkdown } = require('../utils/fileUtils');

const QUESTS_DIR = path.join(__dirname, '../../data/quests');

class QuestService {
  async getActiveQuests(page = 1, limit = 10) {
    await fs.ensureDir(QUESTS_DIR);
    
    const files = await fs.readdir(QUESTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    const allQuests = [];
    
    for (const file of mdFiles) {
      const filePath = path.join(QUESTS_DIR, file);
      const quest = await parseMarkdown(filePath);
      
      if (quest && (quest.status === 'available' || quest.status === 'in_progress')) {
        quest.mdFilePath = `/data/quests/${file}`;
        allQuests.push(quest);
      }
    }
    
    // Sort by updated_at descending
    allQuests.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const quests = allQuests.slice(startIndex, endIndex);
    
    return {
      quests,
      pagination: {
        total: allQuests.length,
        page,
        limit,
        totalPages: Math.ceil(allQuests.length / limit)
      }
    };
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
  
  async updateQuestStatus(id, newStatus, userId = null) {
    const files = await fs.readdir(QUESTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = path.join(QUESTS_DIR, file);
      const quest = await parseMarkdown(filePath);
      
      if (quest && quest.id === id) {
        quest.status = newStatus;
        quest.updated_at = new Date().toISOString();
        
        if (newStatus === 'in_progress' && userId) {
          quest.acceptedBy = userId;
        } else if (newStatus === 'completed') {
          quest.completedAt = new Date().toISOString();
        }
        
        await saveMarkdown(filePath, quest);
        quest.mdFilePath = `/data/quests/${file}`;
        
        return quest;
      }
    }
    
    return null;
  }
  
  async createQuest(questData) {
    const questId = `quest-${uuidv4()}`;
    const fileName = `${questId}.md`;
    const filePath = path.join(QUESTS_DIR, fileName);
    
    const now = new Date().toISOString();
    const quest = {
      id: questId,
      title: questData.title,
      status: 'available',
      reward: questData.reward,
      difficulty: questData.difficulty,
      created_at: now,
      updated_at: now,
      createdBy: questData.createdBy,
      content: `# ${questData.title}\n\n## 依頼内容\n${questData.description}\n\n## 報酬\n${questData.reward}\n\n## 注意事項\n- 危険度：${questData.difficulty}級`
    };
    
    await saveMarkdown(filePath, quest);
    quest.description = questData.description;
    quest.mdFilePath = `/data/quests/${fileName}`;
    
    return quest;
  }
  
  async updateQuest(id, updates) {
    const files = await fs.readdir(QUESTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = path.join(QUESTS_DIR, file);
      const quest = await parseMarkdown(filePath);
      
      if (quest && quest.id === id) {
        if (updates.title) {
          quest.title = updates.title;
          quest.content = quest.content.replace(/^# .+$/m, `# ${updates.title}`);
        }
        if (updates.description) {
          quest.content = quest.content.replace(/## 依頼内容\n.+?(?=\n##|$)/s, `## 依頼内容\n${updates.description}`);
        }
        if (updates.reward) {
          quest.reward = updates.reward;
        }
        if (updates.difficulty) {
          quest.difficulty = updates.difficulty;
        }
        
        quest.updated_at = new Date().toISOString();
        
        await saveMarkdown(filePath, quest);
        quest.mdFilePath = `/data/quests/${file}`;
        
        return quest;
      }
    }
    
    return null;
  }
  
  async deleteQuest(id) {
    const files = await fs.readdir(QUESTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = path.join(QUESTS_DIR, file);
      const quest = await parseMarkdown(filePath);
      
      if (quest && quest.id === id) {
        await fs.remove(filePath);
        return true;
      }
    }
    
    return false;
  }
  
  async getCompletedQuests(userId = null) {
    await fs.ensureDir(QUESTS_DIR);
    
    const files = await fs.readdir(QUESTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    const completedQuests = [];
    
    for (const file of mdFiles) {
      const filePath = path.join(QUESTS_DIR, file);
      const quest = await parseMarkdown(filePath);
      
      if (quest && quest.status === 'completed') {
        if (!userId || quest.acceptedBy === userId) {
          quest.mdFilePath = `/data/quests/${file}`;
          completedQuests.push(quest);
        }
      }
    }
    
    // Sort by completedAt descending
    completedQuests.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.updated_at).getTime();
      const dateB = new Date(b.completedAt || b.updated_at).getTime();
      return dateB - dateA;
    });
    
    return completedQuests;
  }
}

module.exports = new QuestService();