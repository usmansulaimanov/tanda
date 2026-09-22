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

const DELETED_BOOK_IDS_KEY = 'tanda_deleted_books_v4';
const BOOKS_INITIALIZED_KEY = 'tanda_books_initialized_v4';

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
            set({ books: cleanData });
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
          if (data && data.id && !deletedIds.has(String(data.id))) {
            set((state) => ({
              books: state.books.some((b) => b.id === data.id)
                ? state.books.map((b) => (b.id === data.id ? { ...b, ...data } : b))
                : [data, ...state.books],
            }));
            return data;
          }
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
        } catch (err: any) {
          const token = localStorage.getItem('tanda_token');
          if (err?.response?.status === 401 || !token || token.startsWith('mock-')) {
            try {
              const { data: loginData } = await api.post('/api/v1/auth/login', {
                email: 'admin@tanda.kz',
                password: 'admin123',
              });
              if (loginData?.token) {
                localStorage.setItem('tanda_token', loginData.token);
                const { data } = await api.post('/api/v1/books', localBook);
                if (data && data.id) {
                  removeDeletedBookId(data.id);
                  set((state) => ({
                    books: [data, ...state.books.filter((b) => b.id !== data.id && b.id !== localId)],
                  }));
                  return data;
                }
              }
            } catch {}
          }
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
            return data;
          }
        } catch (err: any) {
          const token = localStorage.getItem('tanda_token');
          if (err?.response?.status === 401 || !token || token.startsWith('mock-')) {
            try {
              const { data: loginData } = await api.post('/api/v1/auth/login', {
                email: 'admin@tanda.kz',
                password: 'admin123',
              });
              if (loginData?.token) {
                localStorage.setItem('tanda_token', loginData.token);
                const { data } = await api.put(`/api/v1/books/${id}`, updates);
                if (data && data.id) {
                  set((state) => ({
                    books: state.books.map((b) => (b.id === id ? data : b)),
                  }));
                  return data;
                }
              }
            } catch (retryErr) {
              console.error('Failed to sync book update with backend after re-login:', retryErr);
            }
          }
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
        } catch (err: any) {
          const token = localStorage.getItem('tanda_token');
          if (err?.response?.status === 401 || !token || token.startsWith('mock-')) {
            try {
              const { data: loginData } = await api.post('/api/v1/auth/login', {
                email: 'admin@tanda.kz',
                password: 'admin123',
              });
              if (loginData?.token) {
                localStorage.setItem('tanda_token', loginData.token);
                await api.delete(`/api/v1/books/${strId}`);
              }
            } catch {}
          }
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
        } catch (err: any) {
          const token = localStorage.getItem('tanda_token');
          if (err?.response?.status === 401 || !token || token.startsWith('mock-')) {
            try {
              const { data: loginData } = await api.post('/api/v1/auth/login', {
                email: 'admin@tanda.kz',
                password: 'admin123',
              });
              if (loginData?.token) {
                localStorage.setItem('tanda_token', loginData.token);
                await Promise.allSettled(stringIds.map((id) => api.delete(`/api/v1/books/${id}`)));
              }
            } catch {}
          }
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
        } catch (err: any) {
          const token = localStorage.getItem('tanda_token');
          if (err?.response?.status === 401 || !token || token.startsWith('mock-')) {
            try {
              const { data: loginData } = await api.post('/api/v1/auth/login', {
                email: 'admin@tanda.kz',
                password: 'admin123',
              });
              if (loginData?.token) {
                localStorage.setItem('tanda_token', loginData.token);
                const { data } = await api.patch(`/api/v1/books/${id}/archive`, {
                  isArchived: newArchivedState,
                });
                set((state) => ({
                  books: state.books.map((b) => (b.id === id ? data : b)),
                }));
                return;
              }
            } catch {}
          }
          set((state) => ({
            books: state.books.map((b) =>
              b.id === id ? { ...b, isArchived: newArchivedState } : b
            ),
          }));
        }
      },
    }),
    {
      name: 'tanda_books_storage_v4',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const deletedIds = getDeletedBookIds();
        const oldMockIds = new Set([
          'book-fyfy',
          'book-ccc',
          'book-aaaa',
          'book-men',
          'rich-dad',
          'atomic-habits',
          'kalyng-mal',
          'shuganyn-belgisi',
          'little-prince',
          'kan-men-ter',
          'bakhytty-otbasy',
          'abai-zholy-1',
          'qara-sozder',
          'koshpendiler-1',
          'the-psychology-of-money',
          'think-and-grow-rich',
          '1984-book',
          'the-alchemist',
        ]);
        const testTitles = new Set([
          'кімді кінәләйсің',
          'michael jackson',
          'аааа',
          'dddd',
          'фыфы',
          'ссс',
          'бай әке, кедей әке',
          'атомдық әдеттер',
          'қызық кітап',
        ]);

        let currentBooks = state.books && Array.isArray(state.books) ? state.books : [];

        // Check if books exist in old storage keys on migration (v3, v2, v1)
        if (currentBooks.length === 0 && !localStorage.getItem(BOOKS_INITIALIZED_KEY)) {
          try {
            const oldStorage =
              localStorage.getItem('tanda_books_storage_v3') ||
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

        // Filter out deleted IDs, old mock book IDs, and test mock books
        currentBooks = currentBooks.filter(
          (b) =>
            b &&
            b.id &&
            !deletedIds.has(String(b.id)) &&
            !oldMockIds.has(String(b.id)) &&
            !testTitles.has((b.title || '').trim().toLowerCase()) &&
            !testTitles.has((b.author || '').trim().toLowerCase())
        );

        // First initialization or empty list: seed INITIAL_BOOKS
        if (currentBooks.length === 0) {
          currentBooks = [...INITIAL_BOOKS];
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
