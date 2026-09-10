import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

interface SavedBooksState {
  savedByUser: Record<string, string[]>;
  savedBookIds: string[];
  getSavedBookIds: (userKey?: string) => string[];
  toggleSavedBook: (bookId: string, userKey?: string) => boolean;
  isBookSaved: (bookId: string, userKey?: string) => boolean;
  addSavedBook: (bookId: string, userKey?: string) => void;
  removeSavedBook: (bookId: string, userKey?: string) => void;
  clearSavedBooks: (userKey?: string) => void;
}

function resolveUserKey(explicitKey?: string): string {
  if (explicitKey) return explicitKey.trim().toLowerCase();
  const currentUser = useAuthStore.getState().user;
  if (!currentUser) return 'guest';
  return (currentUser.email || currentUser.id || 'guest').trim().toLowerCase();
}

export const useSavedBooksStore = create<SavedBooksState>()(
  persist(
    (set, get) => ({
      savedByUser: {},
      savedBookIds: [],

      getSavedBookIds: (userKey?: string) => {
        const key = resolveUserKey(userKey);
        return get().savedByUser[key] || [];
      },

      toggleSavedBook: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const allSaved = { ...get().savedByUser };
        const userSaved = allSaved[key] || [];

        let isNowSaved = false;
        let updatedList: string[] = [];

        if (userSaved.includes(bookId)) {
          updatedList = userSaved.filter((id) => id !== bookId);
          isNowSaved = false;
        } else {
          updatedList = [...userSaved, bookId];
          isNowSaved = true;
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
        const userSaved = get().savedByUser[key] || [];
        return userSaved.includes(bookId);
      },

      addSavedBook: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const allSaved = { ...get().savedByUser };
        const userSaved = allSaved[key] || [];

        if (!userSaved.includes(bookId)) {
          const updatedList = [...userSaved, bookId];
          allSaved[key] = updatedList;
          set({
            savedByUser: allSaved,
            savedBookIds: updatedList,
          });
        }
      },

      removeSavedBook: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const allSaved = { ...get().savedByUser };
        const userSaved = allSaved[key] || [];
        const updatedList = userSaved.filter((id) => id !== bookId);

        allSaved[key] = updatedList;
        set({
          savedByUser: allSaved,
          savedBookIds: updatedList,
        });
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
          state.savedBookIds = state.savedByUser[key] || [];
        }
      },
    }
  )
);

// Synchronize savedBookIds whenever the logged-in user changes (login, switch account, logout)
useAuthStore.subscribe((authState) => {
  const key = (authState.user?.email || authState.user?.id || 'guest').trim().toLowerCase();
  const savedState = useSavedBooksStore.getState();
  const currentList = savedState.savedByUser[key] || [];
  useSavedBooksStore.setState({ savedBookIds: currentList });
});
