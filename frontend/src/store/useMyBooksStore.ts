import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';
import { useSavedBooksStore } from './useSavedBooksStore';

export type BookShelfStatus = 'reading' | 'completed' | 'want_to_read';

export interface UserBookRecord {
  bookId: string;
  status: BookShelfStatus;
  addedAt: string;
  lastReadAt?: string;
  currentPage?: number;
  totalPages?: number;
  progressPercent?: number;
  completedAt?: string;
}

interface MyBooksState {
  shelfByUser: Record<string, Record<string, UserBookRecord>>;
  currentShelf: Record<string, UserBookRecord>;
  activeTab: BookShelfStatus;

  setActiveTab: (tab: BookShelfStatus) => void;
  setBookStatus: (bookId: string, status: BookShelfStatus, userKey?: string) => void;
  removeBookFromShelf: (bookId: string, userKey?: string) => void;
  getBookRecord: (bookId: string, userKey?: string) => UserBookRecord | undefined;
  getBookStatus: (bookId: string, userKey?: string) => BookShelfStatus | null;
  getBooksByStatus: (status: BookShelfStatus, userKey?: string) => UserBookRecord[];
  
  markAsReading: (bookId: string, currentPage?: number, totalPages?: number, userKey?: string) => void;
  markAsCompleted: (bookId: string, userKey?: string) => void;
  markAsWantToRead: (bookId: string, userKey?: string) => void;
  updateReadingProgress: (bookId: string, currentPage: number, totalPages?: number, userKey?: string) => void;
}

function resolveUserKey(explicitKey?: string): string {
  if (explicitKey) return explicitKey.trim().toLowerCase();
  try {
    const currentUser = useAuthStore?.getState?.()?.user;
    if (currentUser?.email || currentUser?.id) {
      return (currentUser.email || currentUser.id).trim().toLowerCase();
    }
  } catch {}

  try {
    const authStorage = typeof window !== 'undefined' ? localStorage.getItem('tanda_auth_storage') : null;
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const user = parsed?.state?.user;
      if (user?.email || user?.id) {
        return (user.email || user.id).trim().toLowerCase();
      }
    }
  } catch {}

  return 'guest';
}

export const useMyBooksStore = create<MyBooksState>()(
  persist(
    (set, get) => ({
      shelfByUser: {},
      currentShelf: {},
      activeTab: 'reading',

      setActiveTab: (tab) => set({ activeTab: tab }),

      setBookStatus: (bookId: string, status: BookShelfStatus, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        const existing = userShelf[bookId];
        const nowIso = new Date().toISOString();

        userShelf[bookId] = {
          bookId,
          status,
          addedAt: existing?.addedAt || nowIso,
          lastReadAt: status === 'reading' ? nowIso : existing?.lastReadAt,
          currentPage: existing?.currentPage || 1,
          totalPages: existing?.totalPages,
          progressPercent: existing?.progressPercent || 0,
          completedAt: status === 'completed' ? nowIso : undefined,
        };

        allShelves[key] = userShelf;
        set({
          shelfByUser: allShelves,
          currentShelf: userShelf,
        });

        // If marked as want_to_read or reading, make sure it's in saved store as well
        if (status === 'want_to_read') {
          useSavedBooksStore.getState().addSavedBook(bookId, key);
        }
      },

      removeBookFromShelf: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        delete userShelf[bookId];

        allShelves[key] = userShelf;
        set({
          shelfByUser: allShelves,
          currentShelf: userShelf,
        });

        // Also remove from saved store if present
        useSavedBooksStore.getState().removeSavedBook(bookId, key);
      },

      getBookRecord: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const userShelf = get().shelfByUser[key] || {};
        return userShelf[bookId];
      },

      getBookStatus: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const userShelf = get().shelfByUser[key] || {};
        const rec = userShelf[bookId];
        if (rec) return rec.status;

        // Fallback: check saved store (saved books automatically count as 'want_to_read')
        const isSaved = useSavedBooksStore.getState().isBookSaved(bookId, key);
        return isSaved ? 'want_to_read' : null;
      },

      getBooksByStatus: (status: BookShelfStatus, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const userShelf = get().shelfByUser[key] || {};
        const list = Object.values(userShelf).filter((r) => r.status === status);

        // If requesting 'want_to_read', also include any savedBookIds not yet explicitly in userShelf
        if (status === 'want_to_read') {
          const savedIds = useSavedBooksStore.getState().getSavedBookIds(key);
          const shelfBookIds = new Set(Object.keys(userShelf));
          
          for (const sId of savedIds) {
            if (!shelfBookIds.has(sId)) {
              list.push({
                bookId: sId,
                status: 'want_to_read',
                addedAt: new Date().toISOString(),
              });
            }
          }
        }

        return list;
      },

      markAsReading: (bookId: string, currentPage = 1, totalPages?: number, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        const existing = userShelf[bookId];

        // Don't downgrade completed books automatically unless requested
        if (existing?.status === 'completed') {
          return;
        }

        const nowIso = new Date().toISOString();
        const percent = totalPages && totalPages > 0 
          ? Math.min(100, Math.round((currentPage / totalPages) * 100))
          : existing?.progressPercent || 5;

        userShelf[bookId] = {
          bookId,
          status: 'reading',
          addedAt: existing?.addedAt || nowIso,
          lastReadAt: nowIso,
          currentPage: currentPage || existing?.currentPage || 1,
          totalPages: totalPages || existing?.totalPages,
          progressPercent: percent,
        };

        allShelves[key] = userShelf;
        set({
          shelfByUser: allShelves,
          currentShelf: userShelf,
        });
      },

      markAsCompleted: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        const existing = userShelf[bookId];
        const nowIso = new Date().toISOString();

        userShelf[bookId] = {
          bookId,
          status: 'completed',
          addedAt: existing?.addedAt || nowIso,
          lastReadAt: nowIso,
          completedAt: nowIso,
          currentPage: existing?.totalPages || existing?.currentPage || 1,
          totalPages: existing?.totalPages,
          progressPercent: 100,
        };

        allShelves[key] = userShelf;
        set({
          shelfByUser: allShelves,
          currentShelf: userShelf,
        });
      },

      markAsWantToRead: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        get().setBookStatus(bookId, 'want_to_read', key);
      },

      updateReadingProgress: (bookId: string, currentPage: number, totalPages?: number, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        const existing = userShelf[bookId];
        const nowIso = new Date().toISOString();

        const tot = totalPages || existing?.totalPages || 100;
        const percent = Math.min(100, Math.max(0, Math.round((currentPage / tot) * 100)));
        const isFinished = percent >= 100;

        userShelf[bookId] = {
          bookId,
          status: isFinished ? 'completed' : 'reading',
          addedAt: existing?.addedAt || nowIso,
          lastReadAt: nowIso,
          completedAt: isFinished ? nowIso : existing?.completedAt,
          currentPage,
          totalPages: tot,
          progressPercent: percent,
        };

        allShelves[key] = userShelf;
        set({
          shelfByUser: allShelves,
          currentShelf: userShelf,
        });
      },
    }),
    {
      name: 'tanda_my_books_shelf_storage_v1',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const key = resolveUserKey();
          state.currentShelf = state.shelfByUser[key] || {};
        }
      },
    }
  )
);

// Synchronize currentShelf on user change (login/logout/switch)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useAuthStore?.subscribe?.((authState) => {
      const key = (authState?.user?.email || authState?.user?.id || 'guest').trim().toLowerCase();
      const state = useMyBooksStore.getState();
      const current = state.shelfByUser[key] || {};
      useMyBooksStore.setState({ currentShelf: current });
    });
  }, 0);
}
