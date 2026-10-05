import { create } from 'zustand';
import { api } from '../lib/api';
import { Book } from '../types';
import { sanitizeInput, sanitizeUrl } from '../utils/security';
import { resolveMediaUrl, formatAudioUrl } from '../utils/mediaUtils';

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
  fetchBooks: (params?: { category?: string; search?: string; includeArchived?: boolean; includeDeleted?: boolean }) => Promise<void>;
  fetchFromBackend: () => Promise<void>;
  fetchBookById: (id: string) => Promise<Book | undefined>;
  addBook: (newBook: Omit<Book, 'id'>, customId?: string) => Promise<Book>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  deleteBooks: (ids: string[]) => Promise<void>;
  restoreBook: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
}

let latestFetchRequestId = 0;

export const useBookStore = create<BookState>((set, get) => ({
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
    const currentRequestId = ++latestFetchRequestId;
    set({ isSyncing: true });
    try {
      const { data } = await api.get('/api/v1/books', { params });
      if (currentRequestId !== latestFetchRequestId) {
        return;
      }
      const rawList = Array.isArray(data)
        ? data
        : data?.content && Array.isArray(data.content)
        ? data.content
        : [];
      const normalizedList = rawList.map((b: Book) => ({
        ...b,
        coverImage: b?.coverImage ? resolveMediaUrl(b.coverImage) : b?.coverImage,
        audioUrl: b?.audioUrl ? formatAudioUrl(b.audioUrl) : b?.audioUrl,
      }));
      set({ books: normalizedList });
    } finally {
      if (currentRequestId === latestFetchRequestId) {
        set({ isLoading: false, isSyncing: false });
      }
    }
  },

  fetchFromBackend: async () => {
    await get().fetchBooks({ includeArchived: true, includeDeleted: true });
  },

  fetchBookById: async (id: string) => {
    try {
      const { data } = await api.get(`/api/v1/books/${id}`);
      if (data && data.id) {
        const normalized = {
          ...data,
          coverImage: data.coverImage ? resolveMediaUrl(data.coverImage) : data.coverImage,
          audioUrl: data.audioUrl ? formatAudioUrl(data.audioUrl) : data.audioUrl,
        };
        set((state) => ({
          books: state.books.some((b) => b.id === data.id)
            ? state.books.map((b) => (b.id === data.id ? { ...b, ...normalized } : b))
            : [normalized, ...state.books],
        }));
        return normalized;
      }
    } catch {}
    return get().books.find((b) => b.id === id);
  },

  addBook: async (newBook, customId) => {
    set({ isLoading: true });
    try {
      const payload: Partial<Book> = {
        ...newBook,
        ...(customId ? { id: customId } : {}),
        title: newBook.title?.trim() || 'Атаусыз кітап',
        author: newBook.author?.trim() || 'Белгісіз автор',
        category: newBook.category || 'Көркем әдебиет',
        categories:
          newBook.categories ||
          (newBook.category
            ? newBook.category.split(',').map((s) => s.trim()).filter(Boolean)
            : ['Көркем әдебиет']),
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
      };

      const { data } = await api.post('/api/v1/books', payload);
      set((state) => ({
        books: [data, ...state.books.filter((b) => b.id !== data.id)],
      }));
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  updateBook: async (id: string, updates: Partial<Book>) => {
    set({ isLoading: true });
    try {
      const cleanedUpdates = {
        ...updates,
        ...(updates.title ? { title: sanitizeInput(updates.title.trim()) } : {}),
        ...(updates.author ? { author: sanitizeInput(updates.author.trim()) } : {}),
        ...(updates.coverImage ? { coverImage: sanitizeUrl(updates.coverImage) } : {}),
        ...(updates.audioUrl ? { audioUrl: sanitizeUrl(updates.audioUrl) } : {}),
      };
      const { data } = await api.put(`/api/v1/books/${id}`, cleanedUpdates);
      set((state) => ({
        books: state.books.map((b) => (b.id === id ? { ...b, ...data } : b)),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBook: async (id: string) => {
    if (!id) return;
    const strId = String(id);
    set({ isLoading: true });
    try {
      await api.delete(`/api/v1/books/${strId}`);
      set((state) => ({
        books: state.books.map((b) => (String(b.id) === strId ? { ...b, isDeleted: true } : b)),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBooks: async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const stringIds = ids.map(String);
    const idSet = new Set(stringIds);
    set({ isLoading: true });
    try {
      await Promise.all(stringIds.map((id) => api.delete(`/api/v1/books/${id}`)));
      set((state) => ({
        books: state.books.map((b) => (idSet.has(String(b.id)) ? { ...b, isDeleted: true } : b)),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  restoreBook: async (id: string) => {
    if (!id) return;
    const strId = String(id);
    set({ isLoading: true });
    try {
      const { data } = await api.patch(`/api/v1/books/${strId}/restore`);
      set((state) => ({
        books: state.books.map((b) => (String(b.id) === strId ? { ...b, ...data, isDeleted: false } : b)),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  toggleArchive: async (id: string) => {
    const book = get().books.find((b) => b.id === id);
    const newArchivedState = book ? !book.isArchived : true;
    const { data } = await api.patch(`/api/v1/books/${id}/archive`, {
      isArchived: newArchivedState,
    });
    set((state) => ({
      books: state.books.map((b) => (b.id === id ? { ...b, ...data } : b)),
    }));
  },
}));
