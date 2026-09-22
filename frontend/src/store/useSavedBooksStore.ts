import { create } from 'zustand';
import { api } from '../lib/api';

interface SavedBooksState {
  savedBookIds: string[];
  isLoading: boolean;

  fetchSavedBooks: () => Promise<void>;
  getSavedBookIds: (userKey?: string) => string[];
  toggleSavedBook: (bookId: string, userKey?: string) => Promise<boolean>;
  isBookSaved: (bookId: string, userKey?: string) => boolean;
  addSavedBook: (bookId: string, userKey?: string) => Promise<void>;
  removeSavedBook: (bookId: string, userKey?: string) => Promise<void>;
  clearSavedBooks: (userKey?: string) => void;
}

export const useSavedBooksStore = create<SavedBooksState>((set, get) => ({
  savedBookIds: [],
  isLoading: false,

  fetchSavedBooks: async () => {
    const token = localStorage.getItem('tanda_token');
    if (!token) {
      set({ savedBookIds: [] });
      return;
    }

    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/v1/saved-books');
      if (data?.bookIds && Array.isArray(data.bookIds)) {
        set({ savedBookIds: data.bookIds.map(String) });
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        set({ savedBookIds: [] });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  getSavedBookIds: (_userKey?: string) => {
    return get().savedBookIds;
  },

  toggleSavedBook: async (bookId: string, _userKey?: string) => {
    const strId = String(bookId);
    const currentlySaved = get().savedBookIds.includes(strId);

    if (currentlySaved) {
      await api.delete(`/api/v1/saved-books/${strId}`);
      set((state) => ({
        savedBookIds: state.savedBookIds.filter((id) => id !== strId),
      }));
      return false;
    } else {
      await api.post(`/api/v1/saved-books/${strId}`);
      set((state) => ({
        savedBookIds: [...state.savedBookIds, strId],
      }));
      return true;
    }
  },

  isBookSaved: (bookId: string, _userKey?: string) => {
    return get().savedBookIds.includes(String(bookId));
  },

  addSavedBook: async (bookId: string, _userKey?: string) => {
    const strId = String(bookId);
    if (!get().savedBookIds.includes(strId)) {
      await api.post(`/api/v1/saved-books/${strId}`);
      set((state) => ({
        savedBookIds: [...state.savedBookIds, strId],
      }));
    }
  },

  removeSavedBook: async (bookId: string, _userKey?: string) => {
    const strId = String(bookId);
    if (get().savedBookIds.includes(strId)) {
      await api.delete(`/api/v1/saved-books/${strId}`);
      set((state) => ({
        savedBookIds: state.savedBookIds.filter((id) => id !== strId),
      }));
    }
  },

  clearSavedBooks: (_userKey?: string) => {
    set({ savedBookIds: [] });
  },
}));

// Clean legacy localStorage key if present
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_saved_books_storage');
  } catch {}
}
