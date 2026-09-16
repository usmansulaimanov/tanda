import { apiClient } from './client';
import { User } from '../../types';

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/api/v1/auth/login', { email, password });
    return data;
  },

  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/api/v1/auth/register', { name, email, password });
    return data;
  },

  loginWithGoogle: async (credential: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/api/v1/auth/google', { credential });
    return data;
  },

  refresh: async (): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/api/v1/auth/refresh');
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/api/v1/auth/me');
    return data;
  },
};
