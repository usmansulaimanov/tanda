import { apiClient } from './client';

export interface ReadingProgressSavePayload {
  epubCfi?: string;
  fontSize?: number;
  readerTheme?: 'light' | 'sepia' | 'dark';
  colorTemperature?: number;
  currentPage?: number;
  currentAudioTime?: number;
  currentAudioChapterId?: string;
}

export interface ReadingProgressResponse {
  id?: string;
  bookId?: string;
  userId?: string;
  currentPage?: number;
  currentAudioTime?: number;
  currentAudioChapterId?: string;
  epubCfi?: string;
  fontSize?: number;
  readerTheme?: 'light' | 'sepia' | 'dark';
  colorTemperature?: number;
}

export const progressApi = {
  saveProgress: async (bookId: string, payload: ReadingProgressSavePayload): Promise<void> => {
    // Backend controller: PUT /api/v1/progress/{bookId}
    await apiClient.put(`/api/v1/progress/${bookId}`, payload);
  },

  getProgress: async (bookId: string): Promise<ReadingProgressResponse> => {
    const { data } = await apiClient.get(`/api/v1/progress/${bookId}`);
    return data;
  },

  getAllProgress: async () => {
    const { data } = await apiClient.get('/api/v1/progress');
    return data;
  },
};

