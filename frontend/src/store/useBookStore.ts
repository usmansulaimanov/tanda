import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { Book } from '../types';
import { INITIAL_BOOKS } from '../data/initialBooks';
import { sanitizeInput, sanitizeUrl } from '../utils/security';

interface BookState {
  books: Book[];
  isLoading: boolean;
  isSyncing: boolean;
  searchQuery: string;
  selectedCategory: string;
  formatFilter: 'all' | 'audio' | 'ebook';
  freeFilter: 'all' | 'free' | 'paid';

  // Filter setters
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  setFormatFilter: (format: 'all' | 'audio' | 'ebook') => void;
  setFreeFilter: (free: 'all' | 'free' | 'paid') => void;

  // API operations
  fetchBooks: (params?: { category?: string; search?: string; includeArchived?: boolean }) => Promise<void>;
  fetchFromBackend: () => Promise<void>;
  fetchBookById: (id: string) => Promise<Book | undefined>;
  addBook: (newBook: Omit<Book, 'id'>, customId?: string) => Promise<Book>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  deleteBooks: (ids: string[]) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
}

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      books: INITIAL_BOOKS,
      isLoading: false,
      isSyncing: false,
      searchQuery: '',
      selectedCategory: 'Барлығы',
      formatFilter: 'all',
      freeFilter: 'all',

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (cat) => set({ selectedCategory: cat }),
      setFormatFilter: (format) => set({ formatFilter: format }),
      setFreeFilter: (free) => set({ freeFilter: free }),

      fetchBooks: async (params = {}) => {
        set({ isSyncing: true });
        try {
          const { data } = await api.get('/api/books', { params });
          if (Array.isArray(data) && data.length > 0) {
            const currentBooks = get().books || [];
            const serverMap = new Map(data.map((b: Book) => [b.id, b]));
            const localOnly = currentBooks.filter((b) => !serverMap.has(b.id));
            set({ books: [...data, ...localOnly] });
          }
        } catch {
          // If backend is not available (e.g. GitHub Pages), preserve cached books
        } finally {
          set({ isLoading: false, isSyncing: false });
        }
      },

      fetchFromBackend: async () => {
        await get().fetchBooks({ includeArchived: true });
      },

      fetchBookById: async (id: string) => {
        try {
          const { data } = await api.get(`/api/books/${id}`);
          if (data && data.id) return data;
        } catch {}
        return get().books.find((b) => b.id === id);
      },

      addBook: async (newBook, customId) => {
        set({ isLoading: true });
        const localId = customId || `book-${Date.now()}`;
        const localBook: Book = {
          ...newBook,
          id: localId,
          title: newBook.title?.trim() || 'Атаусыз кітап',
          author: newBook.author?.trim() || 'Белгісіз автор',
          category: newBook.category || 'Көркем әдебиет',
          pages: newBook.pages ? Number(newBook.pages) : null,
          hasAudio: Boolean(newBook.hasAudio),
          audioNarrator: newBook.audioNarrator?.trim() || '',
          audioDuration: newBook.audioDuration?.trim() || '',
          audioChapters: newBook.audioChapters || [],
          audioUrl: sanitizeUrl(newBook.audioUrl),
          coverImage: sanitizeUrl(newBook.coverImage),
          gradient: newBook.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
          description: newBook.description?.trim() || '',
          isFree: Boolean(newBook.isFree),
          isArchived: Boolean(newBook.isArchived),
          createdAt: new Date().toISOString(),
        };

        // Immediately update state and persist
        set((state) => ({ books: [localBook, ...state.books.filter((b) => b.id !== localId)] }));

        try {
          const { data } = await api.post('/api/books', localBook);
          if (data && data.id) {
            set((state) => ({
              books: [data, ...state.books.filter((b) => b.id !== data.id && b.id !== localId)],
            }));
            return data;
          }
        } catch {
          // Local state already updated
        } finally {
          set({ isLoading: false });
        }
        return localBook;
      },

      updateBook: async (id: string, updates: Partial<Book>) => {
        set({ isLoading: true });
        set((state) => ({
          books: state.books.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }));
        try {
          const { data } = await api.put(`/api/books/${id}`, updates);
          if (data && data.id) {
            set((state) => ({
              books: state.books.map((b) => (b.id === id ? data : b)),
            }));
          }
        } catch {
          // Local state already updated
        } finally {
          set({ isLoading: false });
        }
      },

      deleteBook: async (id: string) => {
        set({ isLoading: true });
        try {
          await api.delete(`/api/books/${id}`);
        } catch {
          // ignore error on static host
        } finally {
          set((state) => ({
            books: state.books.filter((b) => b.id !== id),
            isLoading: false,
          }));
        }
      },

      deleteBooks: async (ids: string[]) => {
        if (!ids || ids.length === 0) return;
        set({ isLoading: true });
        const idSet = new Set(ids);
        try {
          await Promise.allSettled(ids.map((id) => api.delete(`/api/books/${id}`)));
        } catch {
          // ignore error on static host
        } finally {
          set((state) => ({
            books: state.books.filter((b) => !idSet.has(b.id)),
            isLoading: false,
          }));
        }
      },

      toggleArchive: async (id: string) => {
        const book = get().books.find((b) => b.id === id);
        const newArchivedState = book ? !book.isArchived : true;
        try {
          const { data } = await api.patch(`/api/books/${id}/archive`, {
            isArchived: newArchivedState,
          });
          set((state) => ({
            books: state.books.map((b) => (b.id === id ? data : b)),
          }));
        } catch {
          set((state) => ({
            books: state.books.map((b) =>
              b.id === id ? { ...b, isArchived: newArchivedState } : b
            ),
          }));
        }
      },
    }),
    {
      name: 'tanda_books_storage_v2',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const testTitles = new Set(['кімді кінәләйсің', 'michael jackson', 'аааа', 'ссс', 'фыфы', 'dddd']);
        const testIds = new Set(['book-aaaa', 'book-ccc', 'book-fyfy']);

        let currentBooks = state.books && state.books.length > 0 ? state.books : [];

        // Check if books exist in old storage keys
        if (currentBooks.length === 0) {
          try {
            const oldStorage = localStorage.getItem('tanda_books_storage') || localStorage.getItem('tanda_books_storage_v1');
            if (oldStorage) {
              const parsed = JSON.parse(oldStorage);
              if (parsed?.state?.books?.length > 0) {
                currentBooks = parsed.state.books;
              }
            }
          } catch {}
        }

        // Filter out test mock books
        currentBooks = currentBooks.filter(
          (b) =>
            !testTitles.has((b.title || '').trim().toLowerCase()) &&
            !testTitles.has((b.author || '').trim().toLowerCase()) &&
            !testIds.has(b.id)
        );

        // Merge initial authentic books
        const existingMap = new Map(currentBooks.map((b) => [b.id, b]));
        INITIAL_BOOKS.forEach((initBook) => {
          if (!existingMap.has(initBook.id)) {
            currentBooks.push(initBook);
          } else {
            const existing = existingMap.get(initBook.id)!;
            if (!existing.hasAudio && initBook.hasAudio) {
              Object.assign(existing, {
                hasAudio: initBook.hasAudio,
                audioNarrator: initBook.audioNarrator,
                audioDuration: initBook.audioDuration,
                audioChapters: initBook.audioChapters,
              });
            }
          }
        });

        state.books = currentBooks.length > 0 ? currentBooks : INITIAL_BOOKS;
      },
    }
  )
);

// Fetch initial books on module load if in browser
if (typeof window !== 'undefined') {
  useBookStore.getState().fetchBooks();
}
