import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'in_progress' | 'completed';
  reward: string;
  difficulty: string;
  mdFilePath: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuestsResponse {
  quests: Quest[];
  pagination: Pagination;
}

export const getQuests = async (page = 1, limit = 10): Promise<QuestsResponse> => {
  const response = await api.get<QuestsResponse>('/quests', {
    params: { page, limit }
  });
  return response.data;
};

export const getQuestById = async (id: string): Promise<Quest> => {
  const response = await api.get<Quest>(`/quests/${id}`);
  return response.data;
};

export const acceptQuest = async (id: string): Promise<Quest> => {
  const response = await api.post<Quest>(`/quests/${id}/accept`);
  return response.data;
};

export const completeQuest = async (id: string): Promise<Quest> => {
  const response = await api.post<Quest>(`/quests/${id}/complete`);
  return response.data;
};

export const createQuest = async (data: Partial<Quest>): Promise<Quest> => {
  const response = await api.post<Quest>('/quests', data);
  return response.data;
};

export const updateQuest = async (id: string, data: Partial<Quest>): Promise<Quest> => {
  const response = await api.put<Quest>(`/quests/${id}`, data);
  return response.data;
};

export const deleteQuest = async (id: string): Promise<void> => {
  await api.delete(`/quests/${id}`);
};

export const getCompletedQuests = async (userId?: string): Promise<Quest[]> => {
  const params = userId ? { userId } : {};
  const response = await api.get<Quest[]>('/quests/completed', { params });
  return response.data;
};

export default api;