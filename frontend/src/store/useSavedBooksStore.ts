import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { useAuthStore } from './useAuthStore';
import { useMyBooksStore } from './useMyBooksStore';

interface SavedBooksState {
  savedByUser: Record<string, string[]>;
  savedBookIds: string[];
  isLoading: boolean;

  fetchSavedBooks: () => Promise<void>;
  getSavedBookIds: (userKey?: string) => string[];
  toggleSavedBook: (bookId: string, userKey?: string) => boolean;
  isBookSaved: (bookId: string, userKey?: string) => boolean;
  addSavedBook: (bookId: string, userKey?: string) => void;
  removeSavedBook: (bookId: string, userKey?: string) => void;
  clearSavedBooks: (userKey?: string) => void;
}

export function resolveUserKey(explicitKey?: string): string {
  if (explicitKey && typeof explicitKey === 'string') {
    return explicitKey.trim().toLowerCase();
  }
  try {
    const currentUser = useAuthStore?.getState?.()?.user;
    if (currentUser?.email || currentUser?.id) {
      return String(currentUser.email || currentUser.id).trim().toLowerCase();
    }
  } catch {}

  try {
    const authStorage = typeof window !== 'undefined' ? localStorage.getItem('tanda_auth_storage') : null;
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const user = parsed?.state?.user;
      if (user?.email || user?.id) {
        return String(user.email || user.id).trim().toLowerCase();
      }
    }
  } catch {}

  return 'guest';
}

export const useSavedBooksStore = create<SavedBooksState>()(
  persist(
    (set, get) => ({
      savedByUser: {},
      savedBookIds: [],
      isLoading: false,

      fetchSavedBooks: async () => {
        const key = resolveUserKey();
        const localList = (get().savedByUser[key] || []).map(String);
        set({ savedBookIds: localList });

        const token = localStorage.getItem('tanda_token');
        if (token && token !== 'mock-jwt-token') {
          try {
            const { data } = await api.get('/api/saved-books');
            if (data?.bookIds && Array.isArray(data.bookIds)) {
              const strList = data.bookIds.map(String);
              const allSaved = { ...get().savedByUser };
              allSaved[key] = strList;
              set({ savedByUser: allSaved, savedBookIds: strList });
            }
          } catch {
            // retain local list on offline/GitHub Pages
          }
        }
      },

      getSavedBookIds: (userKey?: string) => {
        const key = resolveUserKey(userKey);
        const list = new Set((get().savedByUser[key] || []).map(String));
        try {
          const shelf = useMyBooksStore.getState().shelfByUser[key] || {};
          for (const [bId, rec] of Object.entries(shelf)) {
            if (rec.status === 'want_to_read') {
              list.add(String(bId));
            }
          }
        } catch {}
        return Array.from(list);
      },

      toggleSavedBook: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const strId = String(bookId);
        const allSaved = { ...get().savedByUser };
        const userSaved = (allSaved[key] || []).map(String);

        let isNowSaved = false;
        let updatedList: string[] = [];

        if (userSaved.includes(strId)) {
          updatedList = userSaved.filter((id) => id !== strId);
          isNowSaved = false;
          api.delete(`/api/saved-books/${strId}`).catch(() => {});

          try {
            const myStore = useMyBooksStore.getState();
            const rec = myStore.getBookRecord(strId, key);
            if (rec?.status === 'want_to_read') {
              myStore.removeBookFromShelf(strId, key);
            }
          } catch {}
        } else {
          updatedList = [...userSaved, strId];
          isNowSaved = true;
          api.post(`/api/saved-books/${strId}`).catch(() => {});

          try {
            const myStore = useMyBooksStore.getState();
            const rec = myStore.getBookRecord(strId, key);
            if (!rec || !rec.status) {
              myStore.setBookStatus(strId, 'want_to_read', key);
            }
          } catch {}
        }

        allSaved[key] = updatedList;
        set({
          savedByUser: allSaved,
          savedBookIds: updatedList,
        });

        return isNowSaved;
      },

      isBookSaved: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const strId = String(bookId);
        const userSaved = (get().savedByUser[key] || []).map(String);
        if (userSaved.includes(strId)) return true;
        try {
          const shelf = useMyBooksStore.getState().shelfByUser[key] || {};
          if (shelf[strId]?.status === 'want_to_read') return true;
        } catch {}
        return false;
      },

      addSavedBook: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const strId = String(bookId);
        const allSaved = { ...get().savedByUser };
        const userSaved = (allSaved[key] || []).map(String);

        if (!userSaved.includes(strId)) {
          const updatedList = [...userSaved, strId];
          allSaved[key] = updatedList;
          set({
            savedByUser: allSaved,
            savedBookIds: updatedList,
          });
          api.post(`/api/saved-books/${strId}`).catch(() => {});

          try {
            const myStore = useMyBooksStore.getState();
            const rec = myStore.getBookRecord(strId, key);
            if (!rec) {
              myStore.setBookStatus(strId, 'want_to_read', key);
            }
          } catch {}
        }
      },

      removeSavedBook: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const strId = String(bookId);
        const allSaved = { ...get().savedByUser };
        const userSaved = (allSaved[key] || []).map(String);
        const updatedList = userSaved.filter((id) => id !== strId);

        allSaved[key] = updatedList;
        set({
          savedByUser: allSaved,
          savedBookIds: updatedList,
        });
        api.delete(`/api/saved-books/${strId}`).catch(() => {});

        try {
          const myStore = useMyBooksStore.getState();
          const rec = myStore.getBookRecord(strId, key);
          if (rec?.status === 'want_to_read') {
            myStore.removeBookFromShelf(strId, key);
          }
        } catch {}
      },

      clearSavedBooks: (userKey?: string) => {
        const key = resolveUserKey(userKey);
        const allSaved = { ...get().savedByUser };
        allSaved[key] = [];

        set({
          savedByUser: allSaved,
          savedBookIds: [],
        });
      },
    }),
    {
      name: 'tanda_saved_books_storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const key = resolveUserKey();
          state.savedBookIds = (state.savedByUser[key] || []).map(String);
        }
      },
    }
  )
);

// Synchronize savedBookIds whenever the logged-in user changes (login, switch account, logout)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useAuthStore?.subscribe?.((authState) => {
      const key = (authState?.user?.email || authState?.user?.id || 'guest').trim().toLowerCase();
      const savedState = useSavedBooksStore.getState();
      const currentList = (savedState.savedByUser[key] || []).map(String);
      useSavedBooksStore.setState({ savedBookIds: currentList });
    });
  }, 0);
}
