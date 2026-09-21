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

const DELETED_BOOK_IDS_KEY = 'tanda_deleted_books_v3';
const BOOKS_INITIALIZED_KEY = 'tanda_books_initialized_v3';

function getDeletedBookIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_BOOK_IDS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return new Set(list.map(String));
    }
  } catch {}
  return new Set();
}

function addDeletedBookIds(ids: string[]) {
  try {
    const current = getDeletedBookIds();
    ids.forEach((id) => current.add(String(id)));
    localStorage.setItem(DELETED_BOOK_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

function removeDeletedBookId(id: string) {
  try {
    const current = getDeletedBookIds();
    if (current.has(String(id))) {
      current.delete(String(id));
      localStorage.setItem(DELETED_BOOK_IDS_KEY, JSON.stringify(Array.from(current)));
    }
  } catch {}
}

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      books: [],
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
        const deletedIds = getDeletedBookIds();
        try {
          const { data } = await api.get('/api/v1/books', { params });
          const rawList = Array.isArray(data) ? data : (data?.content && Array.isArray(data.content) ? data.content : null);
          if (rawList) {
            const cleanData = rawList.filter((b: Book) => b && b.id && !deletedIds.has(String(b.id)));
            const currentBooks = (get().books || []).filter((b) => b && b.id && !deletedIds.has(String(b.id)));
            const serverMap = new Map(cleanData.map((b: Book) => [b.id, b]));
            const localOnly = currentBooks.filter((b) => !serverMap.has(b.id) && !deletedIds.has(String(b.id)));
            set({ books: [...cleanData, ...localOnly] });
          }
        } catch {
          // If backend is not available (e.g. GitHub Pages or offline), preserve valid local books
          set((state) => ({
            books: (state.books || []).filter((b) => b && b.id && !deletedIds.has(String(b.id))),
          }));
        } finally {
          set({ isLoading: false, isSyncing: false });
        }
      },

      fetchFromBackend: async () => {
        await get().fetchBooks({ includeArchived: true });
      },

      fetchBookById: async (id: string) => {
        const deletedIds = getDeletedBookIds();
        if (deletedIds.has(String(id))) return undefined;
        try {
          const { data } = await api.get(`/api/v1/books/${id}`);
          if (data && data.id && !deletedIds.has(String(data.id))) return data;
        } catch {}
        return get().books.find((b) => b.id === id && !deletedIds.has(String(b.id)));
      },

      addBook: async (newBook, customId) => {
        set({ isLoading: true });
        const localId = customId || `book-${Date.now()}`;
        removeDeletedBookId(localId);

        const localBook: Book = {
          ...newBook,
          id: localId,
          title: newBook.title?.trim() || 'Атаусыз кітап',
          author: newBook.author?.trim() || 'Белгісіз автор',
          category: newBook.category || 'Көркем әдебиет',
          categories: newBook.categories || (newBook.category ? newBook.category.split(',').map((s) => s.trim()).filter(Boolean) : ['Көркем әдебиет']),
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
          const { data } = await api.post('/api/v1/books', localBook);
          if (data && data.id) {
            removeDeletedBookId(data.id);
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
          const { data } = await api.put(`/api/v1/books/${id}`, updates);
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
        if (!id) return;
        const strId = String(id);
        addDeletedBookIds([strId]);
        set({ isLoading: true });

        // Update local state immediately
        set((state) => ({
          books: state.books.filter((b) => String(b.id) !== strId),
          isLoading: false,
        }));

        try {
          await api.delete(`/api/v1/books/${strId}`);
        } catch {
          // ignore error on static/offline host
        }
      },

      deleteBooks: async (ids: string[]) => {
        if (!ids || ids.length === 0) return;
        const stringIds = ids.map(String);
        addDeletedBookIds(stringIds);
        set({ isLoading: true });

        const idSet = new Set(stringIds);
        // Update local state immediately
        set((state) => ({
          books: state.books.filter((b) => !idSet.has(String(b.id))),
          isLoading: false,
        }));

        try {
          await Promise.allSettled(stringIds.map((id) => api.delete(`/api/v1/books/${id}`)));
        } catch {
          // ignore error on static host
        }
      },

      toggleArchive: async (id: string) => {
        const book = get().books.find((b) => b.id === id);
        const newArchivedState = book ? !book.isArchived : true;
        try {
          const { data } = await api.patch(`/api/v1/books/${id}/archive`, {
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
      name: 'tanda_books_storage_v3',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const deletedIds = getDeletedBookIds();
        const testTitles = new Set(['кімді кінәләйсің', 'michael jackson', 'аааа', 'dddd']);
        const testIds = new Set(['book-aaaa']);

        let currentBooks = state.books && Array.isArray(state.books) ? state.books : [];

        // Check if books exist in old storage keys on migration
        if (currentBooks.length === 0 && !localStorage.getItem(BOOKS_INITIALIZED_KEY)) {
          try {
            const oldStorage =
              localStorage.getItem('tanda_books_storage_v2') ||
              localStorage.getItem('tanda_books_storage_v1') ||
              localStorage.getItem('tanda_books_storage');
            if (oldStorage) {
              const parsed = JSON.parse(oldStorage);
              if (parsed?.state?.books?.length > 0) {
                currentBooks = parsed.state.books;
              }
            }
          } catch {}
        }

        // Filter out deleted IDs and test mock books
        currentBooks = currentBooks.filter(
          (b) =>
            b &&
            b.id &&
            !deletedIds.has(String(b.id)) &&
            !testTitles.has((b.title || '').trim().toLowerCase()) &&
            !testTitles.has((b.author || '').trim().toLowerCase()) &&
            !testIds.has(b.id)
        );

        // First initialization only: seed INITIAL_BOOKS if not already initialized
        const isInitialized = localStorage.getItem(BOOKS_INITIALIZED_KEY);
        if (!isInitialized) {
          const existingMap = new Map(currentBooks.map((b) => [b.id, b]));
          INITIAL_BOOKS.forEach((initBook) => {
            if (!deletedIds.has(initBook.id) && !existingMap.has(initBook.id)) {
              currentBooks.push(initBook);
            }
          });
          localStorage.setItem(BOOKS_INITIALIZED_KEY, 'true');
        }

        state.books = currentBooks;
      },
    }
  )
);

// Fetch initial books on module load if in browser
if (typeof window !== 'undefined') {
  useBookStore.getState().fetchBooks();
}
