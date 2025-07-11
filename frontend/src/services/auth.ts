import api from './api';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: string;
  createdAt: string;
  acceptedQuests: string[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const googleAuth = async (credential: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/google', { credential });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
  }
  return response.data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<{ user: User }>('/auth/me');
  return response.data.user;
};

export const initializeAuth = (): void => {
  const token = localStorage.getItem('token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};