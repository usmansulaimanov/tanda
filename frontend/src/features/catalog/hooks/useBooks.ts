import { useQuery } from '@tanstack/react-query';
import { booksApi, BooksFilterParams } from '../../../shared/api/books.api';
import { Book } from '../../../types';
import { INITIAL_BOOKS } from '../../../data/initialBooks';

export function useBooks(filters?: BooksFilterParams) {
  return useQuery<Book[]>({
    queryKey: ['books', filters],
    queryFn: async () => {
      try {
        const books = await booksApi.getAll(filters);
        if (Array.isArray(books) && books.length > 0) {
          return books;
        }
        return INITIAL_BOOKS;
      } catch (error) {
        console.warn('Backend unavailable, falling back to initial mock books:', error);
        return INITIAL_BOOKS;
      }
    },
  });
}

export function useBookDetail(id: string | undefined) {
  return useQuery<Book>({
    queryKey: ['book', id],
    queryFn: async () => {
      if (!id) throw new Error('Book ID is required');
      try {
        const book = await booksApi.getById(id);
        if (book) return book;
      } catch (e) {
        console.warn('Backend getById failed, checking initialBooks:', e);
      }
      const fallback = INITIAL_BOOKS.find((b: Book) => b.id === id);
      if (fallback) return fallback;
      throw new Error('Кітап табылмады');
    },
    enabled: Boolean(id),
  });
}
