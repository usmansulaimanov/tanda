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
            set({ books: data });
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
          return data;
        } catch {
          return get().books.find((b) => b.id === id);
        }
      },

      addBook: async (newBook, customId) => {
        set({ isLoading: true });
        const localId = customId || `book-${Date.now()}`;
        const localBook: Book = {
          ...newBook,
          id: localId,
          title: sanitizeInput(newBook.title) || 'Атаусыз кітап',
          author: sanitizeInput(newBook.author) || 'Белгісіз автор',
          category: newBook.category || 'Көркем әдебиет',
          pages: newBook.pages ? Number(newBook.pages) : null,
          hasAudio: Boolean(newBook.hasAudio),
          audioNarrator: sanitizeInput(newBook.audioNarrator || ''),
          audioDuration: sanitizeInput(newBook.audioDuration || ''),
          audioChapters: newBook.audioChapters || [],
          audioUrl: sanitizeUrl(newBook.audioUrl),
          coverImage: sanitizeUrl(newBook.coverImage),
          gradient: newBook.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
          description: sanitizeInput(newBook.description || ''),
          isFree: Boolean(newBook.isFree),
          isArchived: Boolean(newBook.isArchived),
          createdAt: new Date().toISOString(),
        };

        try {
          const { data } = await api.post('/api/books', localBook);
          set((state) => ({ books: [data, ...state.books.filter((b) => b.id !== data.id)] }));
          return data;
        } catch {
          // Fallback to local state
          set((state) => ({ books: [localBook, ...state.books.filter((b) => b.id !== localId)] }));
          return localBook;
        } finally {
          set({ isLoading: false });
        }
      },

      updateBook: async (id: string, updates: Partial<Book>) => {
        set({ isLoading: true });
        try {
          const { data } = await api.put(`/api/books/${id}`, updates);
          set((state) => ({
            books: state.books.map((b) => (b.id === id ? data : b)),
          }));
        } catch {
          // Fallback to local update
          set((state) => ({
            books: state.books.map((b) => (b.id === id ? { ...b, ...updates } : b)),
          }));
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
      name: 'tanda_books_storage',
      onRehydrateStorage: () => (state) => {
        if (state && (!state.books || state.books.length === 0)) {
          // Check if books exist in old storage key
          try {
            const oldV1 = localStorage.getItem('tanda_books_storage_v1');
            if (oldV1) {
              const parsed = JSON.parse(oldV1);
              if (parsed?.state?.books?.length > 0) {
                state.books = parsed.state.books;
                return;
              }
            }
          } catch {}
          state.books = INITIAL_BOOKS;
        }
      },
    }
  )
);

// Fetch initial books on module load if in browser
if (typeof window !== 'undefined') {
  useBookStore.getState().fetchBooks();
}
