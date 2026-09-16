import { apiClient } from './client';

export interface UploadResponse {
  key: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
}

export const mediaApi = {
  uploadFile: async (file: File, category: 'covers' | 'audio' | 'books' = 'covers'): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const { data } = await apiClient.post<UploadResponse>('/api/v1/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};
