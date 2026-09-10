import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SavedBooksState {
  savedBookIds: string[];
  toggleSavedBook: (bookId: string) => boolean;
  isBookSaved: (bookId: string) => boolean;
  addSavedBook: (bookId: string) => void;
  removeSavedBook: (bookId: string) => void;
  clearSavedBooks: () => void;
}

export const useSavedBooksStore = create<SavedBooksState>()(
  persist(
    (set, get) => ({
      savedBookIds: [],
      toggleSavedBook: (bookId: string) => {
        const current = get().savedBookIds;
        if (current.includes(bookId)) {
          set({ savedBookIds: current.filter((id) => id !== bookId) });
          return false;
        } else {
          set({ savedBookIds: [...current, bookId] });
          return true;
        }
      },
      isBookSaved: (bookId: string) => {
        return get().savedBookIds.includes(bookId);
      },
      addSavedBook: (bookId: string) => {
        const current = get().savedBookIds;
        if (!current.includes(bookId)) {
          set({ savedBookIds: [...current, bookId] });
        }
      },
      removeSavedBook: (bookId: string) => {
        set({ savedBookIds: get().savedBookIds.filter((id) => id !== bookId) });
      },
      clearSavedBooks: () => set({ savedBookIds: [] }),
    }),
    {
      name: 'tanda_saved_books_storage',
    }
  )
);
