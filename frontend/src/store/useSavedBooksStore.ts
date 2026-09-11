import { create } from 'zustand';
import { api } from '../lib/api';
import { useAuthStore } from './useAuthStore';

interface SavedBooksState {
  savedBookIds: string[];
  isLoading: boolean;

  fetchSavedBooks: () => Promise<void>;
  toggleSavedBook: (bookId: string) => Promise<boolean>;
  isBookSaved: (bookId: string) => boolean;
  getSavedBookIds: () => string[];
  addSavedBook: (bookId: string) => Promise<void>;
  removeSavedBook: (bookId: string) => Promise<void>;
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
      const { data } = await api.get('/api/saved-books');
      set({ savedBookIds: data.bookIds || [] });
    } catch {
      set({ savedBookIds: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleSavedBook: async (bookId: string) => {
    const currentSaved = get().savedBookIds;
    const isSaved = currentSaved.includes(bookId);

    if (isSaved) {
      // Optimistic update
      set({ savedBookIds: currentSaved.filter((id) => id !== bookId) });
      try {
        await api.delete(`/api/saved-books/${bookId}`);
        return false;
      } catch (err) {
        // Rollback
        set({ savedBookIds: currentSaved });
        return true;
      }
    } else {
      // Optimistic update
      set({ savedBookIds: [...currentSaved, bookId] });
      try {
        await api.post(`/api/saved-books/${bookId}`);
        return true;
      } catch (err) {
        // Rollback
        set({ savedBookIds: currentSaved });
        return false;
      }
    }
  },

  isBookSaved: (bookId: string) => {
    return get().savedBookIds.includes(bookId);
  },

  getSavedBookIds: () => {
    return get().savedBookIds;
  },

  addSavedBook: async (bookId: string) => {
    if (!get().savedBookIds.includes(bookId)) {
      await get().toggleSavedBook(bookId);
    }
  },

  removeSavedBook: async (bookId: string) => {
    if (get().savedBookIds.includes(bookId)) {
      await get().toggleSavedBook(bookId);
    }
  },
}));

// Re-fetch saved books on auth state change
useAuthStore.subscribe((authState) => {
  if (authState.isAuthenticated) {
    useSavedBooksStore.getState().fetchSavedBooks();
  } else {
    useSavedBooksStore.setState({ savedBookIds: [] });
  }
});
