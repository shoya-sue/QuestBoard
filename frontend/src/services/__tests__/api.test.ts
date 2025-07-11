import { getQuests, getQuestById, acceptQuest, completeQuest } from '../api';
import axios from 'axios';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    }
  }))
}));

const mockAxios = axios.create() as any;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuests', () => {
    it('クエスト一覧を正しく取得する', async () => {
      const mockResponse = {
        data: {
          quests: [
            { id: '1', title: 'Quest 1', status: 'available' },
            { id: '2', title: 'Quest 2', status: 'in_progress' }
          ],
          pagination: {
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        }
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await getQuests(1, 10);

      expect(mockAxios.get).toHaveBeenCalledWith('/quests', {
        params: { page: 1, limit: 10 }
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('デフォルトパラメータで動作する', async () => {
      const mockResponse = {
        data: {
          quests: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0
          }
        }
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      await getQuests();

      expect(mockAxios.get).toHaveBeenCalledWith('/quests', {
        params: { page: 1, limit: 10 }
      });
    });
  });

  describe('getQuestById', () => {
    it('特定のクエストを正しく取得する', async () => {
      const mockQuest = {
        id: 'quest-1',
        title: 'Test Quest',
        description: 'Test description',
        status: 'available'
      };

      mockAxios.get.mockResolvedValue({ data: mockQuest });

      const result = await getQuestById('quest-1');

      expect(mockAxios.get).toHaveBeenCalledWith('/quests/quest-1');
      expect(result).toEqual(mockQuest);
    });
  });

  describe('acceptQuest', () => {
    it('クエストを正しく受注する', async () => {
      const mockQuest = {
        id: 'quest-1',
        title: 'Test Quest',
        status: 'in_progress'
      };

      mockAxios.post.mockResolvedValue({ data: mockQuest });

      const result = await acceptQuest('quest-1');

      expect(mockAxios.post).toHaveBeenCalledWith('/quests/quest-1/accept');
      expect(result).toEqual(mockQuest);
    });
  });

  describe('completeQuest', () => {
    it('クエストを正しく完了する', async () => {
      const mockQuest = {
        id: 'quest-1',
        title: 'Test Quest',
        status: 'completed'
      };

      mockAxios.post.mockResolvedValue({ data: mockQuest });

      const result = await completeQuest('quest-1');

      expect(mockAxios.post).toHaveBeenCalledWith('/quests/quest-1/complete');
      expect(result).toEqual(mockQuest);
    });
  });

  describe('Error Handling', () => {
    it('ネットワークエラーを適切に処理する', async () => {
      const networkError = new Error('Network Error');
      mockAxios.get.mockRejectedValue(networkError);

      await expect(getQuests()).rejects.toThrow('Network Error');
    });

    it('401エラーでトークンを削除する', async () => {
      const authError = {
        response: { status: 401, data: { error: 'Unauthorized' } }
      };
      
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
      mockAxios.get.mockRejectedValue(authError);

      try {
        await getQuests();
      } catch (error) {
        // エラーは期待される
      }

      expect(removeItemSpy).toHaveBeenCalledWith('token');
    });
  });
});