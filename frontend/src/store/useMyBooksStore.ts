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

export const useMyBooksStore = create<MyBooksState>()(
  persist(
    (set, get) => ({
      shelfByUser: {},
      currentShelf: {},
      activeTab: 'reading',

      setActiveTab: (tab) => set({ activeTab: tab }),

      setBookStatus: (bookId: string, status: BookShelfStatus, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const strId = String(bookId);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        const existing = userShelf[strId];
        const nowIso = new Date().toISOString();

        userShelf[strId] = {
          bookId: strId,
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

        // If marked as want_to_read, make sure it's in saved store as well
        if (status === 'want_to_read') {
          try {
            useSavedBooksStore.getState().addSavedBook(strId, key);
          } catch {}
        }
      },

      removeBookFromShelf: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const strId = String(bookId);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        delete userShelf[strId];

        allShelves[key] = userShelf;
        set({
          shelfByUser: allShelves,
          currentShelf: userShelf,
        });

        try {
          useSavedBooksStore.getState().removeSavedBook(strId, key);
        } catch {}
      },

      getBookRecord: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const strId = String(bookId);
        const userShelf = get().shelfByUser[key] || {};
        return userShelf[strId];
      },

      getBookStatus: (bookId: string, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const strId = String(bookId);
        const userShelf = get().shelfByUser[key] || {};
        const rec = userShelf[strId];
        if (rec) return rec.status;

        // Fallback: check saved store (saved books automatically count as 'want_to_read')
        try {
          const isSaved = useSavedBooksStore.getState().isBookSaved(strId, key);
          return isSaved ? 'want_to_read' : null;
        } catch {
          return null;
        }
      },

      getBooksByStatus: (status: BookShelfStatus, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const userShelf = get().shelfByUser[key] || {};

        // If requesting 'want_to_read', return all saved books + want_to_read books unified
        if (status === 'want_to_read') {
          try {
            const savedIds = useSavedBooksStore.getState().getSavedBookIds(key);
            const savedIdSet = new Set(savedIds.map(String));

            for (const [id, rec] of Object.entries(userShelf)) {
              if (rec.status === 'want_to_read') {
                savedIdSet.add(String(id));
              }
            }

            const list: UserBookRecord[] = [];
            for (const sId of savedIdSet) {
              const existingRec = userShelf[sId];
              list.push({
                bookId: sId,
                status: 'want_to_read',
                addedAt: existingRec?.addedAt || new Date().toISOString(),
                lastReadAt: existingRec?.lastReadAt,
                currentPage: existingRec?.currentPage,
                totalPages: existingRec?.totalPages,
                progressPercent: existingRec?.progressPercent,
              });
            }
            return list;
          } catch {}
        }

        return Object.values(userShelf).filter((r) => r.status === status);
      },

      markAsReading: (bookId: string, currentPage = 1, totalPages?: number, userKey?: string) => {
        const key = resolveUserKey(userKey);
        const strId = String(bookId);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        const existing = userShelf[strId];

        // Don't downgrade completed books automatically unless requested
        if (existing?.status === 'completed') {
          return;
        }

        const nowIso = new Date().toISOString();
        const percent = totalPages && totalPages > 0 
          ? Math.min(100, Math.round((currentPage / totalPages) * 100))
          : existing?.progressPercent || 5;

        userShelf[strId] = {
          bookId: strId,
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
        const strId = String(bookId);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        const existing = userShelf[strId];
        const nowIso = new Date().toISOString();

        userShelf[strId] = {
          bookId: strId,
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
        const strId = String(bookId);
        const allShelves = { ...get().shelfByUser };
        const userShelf = { ...(allShelves[key] || {}) };
        const existing = userShelf[strId];
        const nowIso = new Date().toISOString();

        const tot = totalPages || existing?.totalPages || 100;
        const percent = Math.min(100, Math.max(0, Math.round((currentPage / tot) * 100)));
        const isFinished = percent >= 100;

        userShelf[strId] = {
          bookId: strId,
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
      partialize: (state) => ({
        shelfByUser: state.shelfByUser,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const key = resolveUserKey();
          state.currentShelf = state.shelfByUser[key] || {};
          state.activeTab = 'reading';
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
