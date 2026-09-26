import { apiClient } from './client';
import { Book } from '../../types';

export interface BooksFilterParams {
  category?: string;
  format?: 'all' | 'audio' | 'text';
  free?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  includeArchived?: boolean;
  includeDeleted?: boolean;
}

export const booksApi = {
  getAll: async (params?: BooksFilterParams): Promise<Book[]> => {
    const { data } = await apiClient.get<Book[]>('/api/v1/books', { params });
    return data;
  },

  getById: async (id: string): Promise<Book> => {
    const { data } = await apiClient.get<Book>(`/api/v1/books/${id}`);
    return data;
  },

  create: async (bookData: Partial<Book>): Promise<Book> => {
    const { data } = await apiClient.post<Book>('/api/v1/books', bookData);
    return data;
  },

  update: async (id: string, bookData: Partial<Book>): Promise<Book> => {
    const { data } = await apiClient.put<Book>(`/api/v1/books/${id}`, bookData);
    return data;
  },

  restore: async (id: string): Promise<Book> => {
    const { data } = await apiClient.patch<Book>(`/api/v1/books/${id}/restore`);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/books/${id}`);
  },

  permanentDelete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/books/${id}/permanent`);
  },

  getStats: async (id: string, month?: string): Promise<import('../../types').BookStatsResponse> => {
    const params = month ? { month } : undefined;
    const { data } = await apiClient.get<import('../../types').BookStatsResponse>(`/api/v1/books/${id}/stats`, { params });
    return data;
  },

  getAudience: async (
    id: string,
    params?: { tier?: string; scope?: string; month?: string }
  ): Promise<import('../../types').BookAudienceMember[]> => {
    const { data } = await apiClient.get<import('../../types').BookAudienceMember[]>(
      `/api/v1/books/${id}/audience`,
      { params }
    );
    return data;
  },

  getUserBookStats: async (
    bookId: string,
    userId: string,
    month?: string
  ): Promise<import('../../types').UserBookListeningStatsResponse> => {
    const params = month ? { month } : undefined;
    const { data } = await apiClient.get<import('../../types').UserBookListeningStatsResponse>(
      `/api/v1/books/${bookId}/readers/${userId}/stats`,
      { params }
    );
    return data;
  },

  getPublicStats: async (): Promise<{ readersCount: number }> => {
    const { data } = await apiClient.get<{ readersCount: number }>('/api/v1/books/public-stats');
    return data;
  },
};

