import axios from 'axios';
import api, { getQuests, getQuestById, acceptQuest, completeQuest } from '../api';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getQuests(1, 10);

      expect(mockedAxios.get).toHaveBeenCalledWith('/quests', {
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

      mockedAxios.get.mockResolvedValue(mockResponse);

      await getQuests();

      expect(mockedAxios.get).toHaveBeenCalledWith('/quests', {
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

      mockedAxios.get.mockResolvedValue({ data: mockQuest });

      const result = await getQuestById('quest-1');

      expect(mockedAxios.get).toHaveBeenCalledWith('/quests/quest-1');
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

      mockedAxios.post.mockResolvedValue({ data: mockQuest });

      const result = await acceptQuest('quest-1');

      expect(mockedAxios.post).toHaveBeenCalledWith('/quests/quest-1/accept');
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

      mockedAxios.post.mockResolvedValue({ data: mockQuest });

      const result = await completeQuest('quest-1');

      expect(mockedAxios.post).toHaveBeenCalledWith('/quests/quest-1/complete');
      expect(result).toEqual(mockQuest);
    });
  });

  describe('Error Handling', () => {
    it('ネットワークエラーを適切に処理する', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(getQuests()).rejects.toThrow('Network Error');
    });

    it('401エラーでトークンを削除する', async () => {
      const authError = {
        response: { status: 401, data: { error: 'Unauthorized' } }
      };
      
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
      mockedAxios.get.mockRejectedValue(authError);

      try {
        await getQuests();
      } catch (error) {
        // エラーは期待される
      }

      expect(removeItemSpy).toHaveBeenCalledWith('token');
    });
  });
});