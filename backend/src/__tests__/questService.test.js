const questService = require('../services/questService');
const fs = require('fs-extra');
const path = require('path');

// モック設定
jest.mock('fs-extra');
jest.mock('../utils/fileUtils', () => ({
  parseMarkdown: jest.fn(),
  saveMarkdown: jest.fn()
}));

const { parseMarkdown, saveMarkdown } = require('../utils/fileUtils');

describe('QuestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveQuests', () => {
    it('アクティブなクエストのみを返す', async () => {
      fs.ensureDir.mockResolvedValue();
      fs.readdir.mockResolvedValue(['quest1.md', 'quest2.md', 'quest3.md']);
      
      parseMarkdown
        .mockResolvedValueOnce({ id: '1', status: 'available', updated_at: '2024-01-01' })
        .mockResolvedValueOnce({ id: '2', status: 'completed', updated_at: '2024-01-02' })
        .mockResolvedValueOnce({ id: '3', status: 'in_progress', updated_at: '2024-01-03' });

      const result = await questService.getActiveQuests();

      expect(result.quests).toHaveLength(2);
      expect(result.quests[0].id).toBe('3'); // 最新のものが最初
      expect(result.quests[1].id).toBe('1');
      expect(result.pagination.total).toBe(2);
    });

    it('ページネーションが正しく動作する', async () => {
      fs.ensureDir.mockResolvedValue();
      fs.readdir.mockResolvedValue(Array(15).fill('quest.md'));
      
      parseMarkdown.mockResolvedValue({ 
        id: 'test', 
        status: 'available', 
        updated_at: '2024-01-01' 
      });

      const result = await questService.getActiveQuests(2, 5);

      expect(result.quests).toHaveLength(5);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('getQuestById', () => {
    it('指定されたIDのクエストを返す', async () => {
      fs.readdir.mockResolvedValue(['quest1.md', 'quest2.md']);
      
      parseMarkdown
        .mockResolvedValueOnce({ id: 'quest-1', title: 'Quest 1' })
        .mockResolvedValueOnce({ id: 'quest-2', title: 'Quest 2' });

      const result = await questService.getQuestById('quest-2');

      expect(result).toEqual({
        id: 'quest-2',
        title: 'Quest 2',
        mdFilePath: '/data/quests/quest2.md'
      });
    });

    it('クエストが見つからない場合はnullを返す', async () => {
      fs.readdir.mockResolvedValue(['quest1.md']);
      parseMarkdown.mockResolvedValue({ id: 'quest-1', title: 'Quest 1' });

      const result = await questService.getQuestById('quest-999');

      expect(result).toBeNull();
    });
  });

  describe('updateQuestStatus', () => {
    it('クエストのステータスを更新する', async () => {
      fs.readdir.mockResolvedValue(['quest1.md']);
      parseMarkdown.mockResolvedValue({ 
        id: 'quest-1', 
        status: 'available',
        updated_at: '2024-01-01'
      });
      saveMarkdown.mockResolvedValue();

      const result = await questService.updateQuestStatus('quest-1', 'in_progress', 'user-123');

      expect(saveMarkdown).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'in_progress',
          acceptedBy: 'user-123'
        })
      );
      expect(result.status).toBe('in_progress');
    });

    it('完了時にcompletedAtを設定する', async () => {
      fs.readdir.mockResolvedValue(['quest1.md']);
      parseMarkdown.mockResolvedValue({ 
        id: 'quest-1', 
        status: 'in_progress'
      });
      saveMarkdown.mockResolvedValue();

      const result = await questService.updateQuestStatus('quest-1', 'completed');

      expect(saveMarkdown).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(String)
        })
      );
    });
  });

  describe('createQuest', () => {
    it('新しいクエストを作成する', async () => {
      saveMarkdown.mockResolvedValue();

      const questData = {
        title: 'New Quest',
        description: 'Test description',
        reward: '100 gold',
        difficulty: 'easy',
        createdBy: 'admin-1'
      };

      const result = await questService.createQuest(questData);

      expect(result).toMatchObject({
        title: 'New Quest',
        status: 'available',
        reward: '100 gold',
        difficulty: 'easy',
        createdBy: 'admin-1'
      });
      expect(result.id).toMatch(/^quest-/);
      expect(saveMarkdown).toHaveBeenCalled();
    });
  });

  describe('getCompletedQuests', () => {
    it('完了したクエストのみを返す', async () => {
      fs.ensureDir.mockResolvedValue();
      fs.readdir.mockResolvedValue(['quest1.md', 'quest2.md', 'quest3.md']);
      
      parseMarkdown
        .mockResolvedValueOnce({ id: '1', status: 'completed', completedAt: '2024-01-01' })
        .mockResolvedValueOnce({ id: '2', status: 'available' })
        .mockResolvedValueOnce({ id: '3', status: 'completed', completedAt: '2024-01-03' });

      const result = await questService.getCompletedQuests();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3'); // 最新の完了クエストが最初
      expect(result[1].id).toBe('1');
    });

    it('ユーザーIDでフィルタリングする', async () => {
      fs.ensureDir.mockResolvedValue();
      fs.readdir.mockResolvedValue(['quest1.md', 'quest2.md']);
      
      parseMarkdown
        .mockResolvedValueOnce({ id: '1', status: 'completed', acceptedBy: 'user-1' })
        .mockResolvedValueOnce({ id: '2', status: 'completed', acceptedBy: 'user-2' });

      const result = await questService.getCompletedQuests('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].acceptedBy).toBe('user-1');
    });
  });
});