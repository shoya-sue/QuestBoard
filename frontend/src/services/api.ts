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

export interface QuestsResponse {
  quests: Quest[];
}

export const getQuests = async (): Promise<QuestsResponse> => {
  const response = await api.get<QuestsResponse>('/quests');
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

export default api;