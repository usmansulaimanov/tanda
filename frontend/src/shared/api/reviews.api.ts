import { apiClient } from './client';
import { BookReview, RatingSummary, CreateReviewPayload } from '../../types';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}

export const reviewsApi = {
  getReviews: async (
    bookId: string,
    page = 0,
    size = 10,
    sort: 'newest' | 'helpful' | 'rating_desc' | 'rating_asc' = 'newest'
  ): Promise<PageResponse<BookReview>> => {
    const { data } = await apiClient.get<PageResponse<BookReview>>(`/api/v1/books/${bookId}/reviews`, {
      params: { page, size, sort },
    });
    return data;
  },

  getSummary: async (bookId: string): Promise<RatingSummary> => {
    const { data } = await apiClient.get<RatingSummary>(`/api/v1/books/${bookId}/reviews/summary`);
    return data;
  },

  getMyReview: async (bookId: string): Promise<BookReview | null> => {
    try {
      const response = await apiClient.get<BookReview>(`/api/v1/books/${bookId}/reviews/my`);
      if (response.status === 204 || !response.data) {
        return null;
      }
      return response.data;
    } catch {
      return null;
    }
  },

  submitReview: async (bookId: string, payload: CreateReviewPayload): Promise<BookReview> => {
    const { data } = await apiClient.post<BookReview>(`/api/v1/books/${bookId}/reviews`, payload);
    return data;
  },

  deleteReview: async (bookId: string, reviewId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/books/${bookId}/reviews/${reviewId}`);
  },

  toggleLike: async (reviewId: number): Promise<{ isLiked: boolean; likesCount: number }> => {
    const { data } = await apiClient.post<{ isLiked: boolean; likesCount: number }>(`/api/v1/reviews/${reviewId}/like`);
    return data;
  },
};
