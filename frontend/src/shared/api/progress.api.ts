import { apiClient } from './client';

export interface ReadingProgressPayload {
  bookId: string;
  currentPage?: number;
  totalPages?: number;
  currentAudioTime?: number;
  totalAudioDuration?: number;
  audioChapterIndex?: number;
  completed?: boolean;
}

export const progressApi = {
  saveProgress: async (payload: ReadingProgressPayload): Promise<void> => {
    await apiClient.post('/api/v1/progress', payload);
  },

  getProgress: async (bookId: string) => {
    const { data } = await apiClient.get(`/api/v1/progress/${bookId}`);
    return data;
  },

  getAllProgress: async () => {
    const { data } = await apiClient.get('/api/v1/progress');
    return data;
  },
};
