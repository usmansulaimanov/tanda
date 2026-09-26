import { apiClient } from './client';
import { ReaderListeningOverview, ReaderDetailedStatsResponse } from '../../types';

export const readersApi = {
  getReadersOverview: async (month?: string): Promise<ReaderListeningOverview[]> => {
    const params = month ? { month } : undefined;
    const { data } = await apiClient.get<ReaderListeningOverview[]>('/api/v1/admin/stats/readers-overview', { params });
    return data;
  },

  getReaderDetailedStats: async (userId: string, month?: string): Promise<ReaderDetailedStatsResponse> => {
    const params = month ? { month } : undefined;
    const { data } = await apiClient.get<ReaderDetailedStatsResponse>(`/api/v1/admin/stats/readers/${userId}`, { params });
    return data;
  },

  getDeletedUserArchives: async (): Promise<import('../../types').DeletedUserArchive[]> => {
    const { data } = await apiClient.get<import('../../types').DeletedUserArchive[]>('/api/v1/admin/users/deleted-archives');
    return data;
  },
};
