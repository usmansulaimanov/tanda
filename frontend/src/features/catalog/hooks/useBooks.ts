import { useQuery } from '@tanstack/react-query';
import { booksApi, BooksFilterParams } from '../../../shared/api/books.api';
import { Book } from '../../../types';
import { useBookStore } from '../../../store/useBookStore';

export function useBooks(filters?: BooksFilterParams) {
  return useQuery<Book[]>({
    queryKey: ['books', filters],
    queryFn: async () => {
      try {
        const books = await booksApi.getAll(filters);
        if (Array.isArray(books) && books.length > 0) {
          return books;
        }
      } catch (error) {
        // Backend unavailable
      }
      return useBookStore.getState().books;
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
        // Backend getById failed
      }
      const fallback = useBookStore.getState().books.find((b: Book) => b.id === id);
      if (fallback) return fallback;
      throw new Error('Кітап табылмады');
    },
    enabled: Boolean(id),
  });
}
