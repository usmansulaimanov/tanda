import { apiClient } from './client';
import { Book } from '../../types';

export interface BooksFilterParams {
  category?: string;
  format?: 'all' | 'audio' | 'text';
  free?: boolean;
  search?: string;
  page?: number;
  limit?: number;
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

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/books/${id}`);
  },
};
