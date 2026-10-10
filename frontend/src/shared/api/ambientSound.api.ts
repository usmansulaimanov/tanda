import { apiClient } from './client';

export interface AmbientSound {
  id: number;
  name: string;
  audioUrl: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AmbientSoundRequest {
  name: string;
  audioUrl: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const ambientSoundApi = {
  getActiveSounds: async (): Promise<AmbientSound[]> => {
    const res = await apiClient.get<AmbientSound[]>('/api/v1/paraqta/ambient-sounds');
    return res.data;
  },

  getAllAdminSounds: async (): Promise<AmbientSound[]> => {
    const res = await apiClient.get<AmbientSound[]>('/api/v1/admin/ambient-sounds');
    return res.data;
  },

  createSound: async (data: AmbientSoundRequest): Promise<AmbientSound> => {
    const res = await apiClient.post<AmbientSound>('/api/v1/admin/ambient-sounds', data);
    return res.data;
  },

  updateSound: async (id: number, data: AmbientSoundRequest): Promise<AmbientSound> => {
    const res = await apiClient.put<AmbientSound>(`/api/v1/admin/ambient-sounds/${id}`, data);
    return res.data;
  },

  toggleActive: async (id: number): Promise<AmbientSound> => {
    const res = await apiClient.patch<AmbientSound>(`/api/v1/admin/ambient-sounds/${id}/toggle`);
    return res.data;
  },

  deleteSound: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/ambient-sounds/${id}`);
  },
};
