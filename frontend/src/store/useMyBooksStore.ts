import { create } from 'zustand';
import { api } from '../lib/api';
import { useSavedBooksStore } from './useSavedBooksStore';

export type BookShelfStatus = 'reading' | 'completed' | 'want_to_read';

export interface UserBookRecord {
  bookId: string;
  status: BookShelfStatus;
  isReading?: boolean;
  isCompleted?: boolean;
  isWantToRead?: boolean;
  addedAt: string;
  lastReadAt?: string;
  currentPage?: number;
  totalPages?: number;
  progressPercent?: number;
  completedAt?: string;
  title?: string;
  author?: string;
  coverImage?: string;
  category?: string;
  hasAudio?: boolean;
  audioDuration?: string;
  isFree?: boolean;
  gradient?: string;
}

interface MyBooksState {
  currentShelf: Record<string, UserBookRecord>;
  activeTab: BookShelfStatus;
  isLoading: boolean;

  fetchShelf: () => Promise<void>;
  setActiveTab: (tab: BookShelfStatus) => void;
  setBookStatus: (bookId: string, status: BookShelfStatus) => Promise<void>;
  toggleBookStatus: (bookId: string, status: BookShelfStatus) => Promise<void>;
  removeBookFromShelf: (bookId: string) => Promise<void>;
  getBookRecord: (bookId: string) => UserBookRecord | undefined;
  getBookStatus: (bookId: string) => BookShelfStatus | null;
  hasStatus: (bookId: string, status: BookShelfStatus) => boolean;
  getBooksByStatus: (status: BookShelfStatus) => UserBookRecord[];
  
  markAsReading: (bookId: string, currentPage?: number, totalPages?: number) => Promise<void>;
  markAsCompleted: (bookId: string) => Promise<void>;
  markAsWantToRead: (bookId: string) => Promise<void>;
  updateReadingProgress: (bookId: string, currentPage: number, totalPages?: number) => Promise<void>;
}

export const useMyBooksStore = create<MyBooksState>((set, get) => ({
  currentShelf: {},
  activeTab: 'reading',
  isLoading: false,

  fetchShelf: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tanda_token') : null;
    if (!token) {
      set({ currentShelf: {}, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/v1/me/books');
      if (Array.isArray(data)) {
        const shelfMap: Record<string, UserBookRecord> = {};
        for (const item of data) {
          if (item?.bookId) {
            shelfMap[String(item.bookId)] = {
              bookId: String(item.bookId),
              status: (item.status?.toLowerCase() || 'want_to_read') as BookShelfStatus,
              isReading: Boolean(item.isReading || item.status === 'reading'),
              isCompleted: Boolean(item.isCompleted || item.status === 'completed'),
              isWantToRead: Boolean(item.isWantToRead || item.status === 'want_to_read'),
              addedAt: item.addedAt || new Date().toISOString(),
              lastReadAt: item.lastReadAt,
              currentPage: item.currentPage || 1,
              totalPages: item.totalPages,
              progressPercent: item.progressPercent || 0,
              completedAt: item.completedAt,
              title: item.title,
              author: item.author,
              coverImage: item.coverImage,
              category: item.category,
              hasAudio: item.hasAudio,
              audioDuration: item.audioDuration,
              isFree: item.isFree,
              gradient: item.gradient,
            };
          }
        }
        set({ currentShelf: shelfMap });
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        set({ currentShelf: {} });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setBookStatus: async (bookId: string, status: BookShelfStatus) => {
    const strId = String(bookId);
    const existing = get().currentShelf[strId];
    const nowIso = new Date().toISOString();

    const isReading = status === 'reading' ? true : Boolean(existing?.isReading);
    const isCompleted = status === 'completed' ? true : Boolean(existing?.isCompleted);
    const isWantToRead = status === 'want_to_read' ? true : Boolean(existing?.isWantToRead);

    const optimisticRecord: UserBookRecord = {
      bookId: strId,
      status,
      isReading,
      isCompleted,
      isWantToRead,
      addedAt: existing?.addedAt || nowIso,
      lastReadAt: status === 'reading' ? nowIso : existing?.lastReadAt,
      currentPage: existing?.currentPage || 1,
      totalPages: existing?.totalPages,
      progressPercent: existing?.progressPercent || 0,
      completedAt: status === 'completed' ? nowIso : existing?.completedAt,
    };

    set((state) => ({
      currentShelf: { ...state.currentShelf, [strId]: optimisticRecord },
    }));

    try {
      const { data } = await api.post(`/api/v1/me/books/${strId}`, {
        status,
        isReading,
        isCompleted,
        isWantToRead,
      });
      if (data?.bookId) {
        set((state) => ({
          currentShelf: {
            ...state.currentShelf,
            [strId]: {
              ...optimisticRecord,
              status: (data.status?.toLowerCase() || status) as BookShelfStatus,
              isReading: Boolean(data.isReading ?? isReading),
              isCompleted: Boolean(data.isCompleted ?? isCompleted),
              isWantToRead: Boolean(data.isWantToRead ?? isWantToRead),
              progressPercent: data.progressPercent ?? optimisticRecord.progressPercent,
              completedAt: data.completedAt,
            },
          },
        }));
      }

      if (status === 'want_to_read') {
        try {
          useSavedBooksStore.getState().addSavedBook(strId);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to set book status on server:', err);
      if (existing) {
        set((state) => ({
          currentShelf: { ...state.currentShelf, [strId]: existing },
        }));
      } else {
        set((state) => {
          const next = { ...state.currentShelf };
          delete next[strId];
          return { currentShelf: next };
        });
      }
      throw err;
    }
  },

  toggleBookStatus: async (bookId: string, status: BookShelfStatus) => {
    const strId = String(bookId);
    const existing = get().currentShelf[strId];
    const nowIso = new Date().toISOString();

    const currentFlag = status === 'reading'
      ? Boolean(existing?.isReading || existing?.status === 'reading')
      : status === 'completed'
      ? Boolean(existing?.isCompleted || existing?.status === 'completed')
      : Boolean(existing?.isWantToRead || existing?.status === 'want_to_read' || useSavedBooksStore.getState().isBookSaved(strId));

    const nextFlag = !currentFlag;

    const isReading = status === 'reading' ? nextFlag : Boolean(existing?.isReading || existing?.status === 'reading');
    const isCompleted = status === 'completed' ? nextFlag : Boolean(existing?.isCompleted || existing?.status === 'completed');
    const isWantToRead = status === 'want_to_read' ? nextFlag : Boolean(existing?.isWantToRead || existing?.status === 'want_to_read');

    const hasAny = isReading || isCompleted || isWantToRead;

    if (!hasAny) {
      // If all flags turned off, remove completely
      await get().removeBookFromShelf(strId);
      return;
    }

    const optimisticRecord: UserBookRecord = {
      bookId: strId,
      status: isReading ? 'reading' : isCompleted ? 'completed' : 'want_to_read',
      isReading,
      isCompleted,
      isWantToRead,
      addedAt: existing?.addedAt || nowIso,
      lastReadAt: isReading ? nowIso : existing?.lastReadAt,
      currentPage: existing?.currentPage || 1,
      totalPages: existing?.totalPages,
      progressPercent: existing?.progressPercent || 0,
      completedAt: isCompleted ? nowIso : existing?.completedAt,
    };

    set((state) => ({
      currentShelf: { ...state.currentShelf, [strId]: optimisticRecord },
    }));

    try {
      const { data } = await api.post(`/api/v1/me/books/${strId}`, {
        isReading,
        isCompleted,
        isWantToRead,
      });

      if (data?.bookId) {
        set((state) => ({
          currentShelf: {
            ...state.currentShelf,
            [strId]: {
              ...optimisticRecord,
              isReading: Boolean(data.isReading ?? isReading),
              isCompleted: Boolean(data.isCompleted ?? isCompleted),
              isWantToRead: Boolean(data.isWantToRead ?? isWantToRead),
            },
          },
        }));
      }

      if (status === 'want_to_read') {
        if (nextFlag) {
          useSavedBooksStore.getState().addSavedBook(strId);
        } else {
          useSavedBooksStore.getState().removeSavedBook(strId);
        }
      }
    } catch (err) {
      console.error('Failed to toggle book status on server:', err);
      if (existing) {
        set((state) => ({
          currentShelf: { ...state.currentShelf, [strId]: existing },
        }));
      }
      throw err;
    }
  },

  removeBookFromShelf: async (bookId: string) => {
    const strId = String(bookId);
    const existing = get().currentShelf[strId];

    set((state) => {
      const next = { ...state.currentShelf };
      delete next[strId];
      return { currentShelf: next };
    });

    try {
      await api.delete(`/api/v1/me/books/${strId}`);
      try {
        useSavedBooksStore.getState().removeSavedBook(strId);
      } catch {}
    } catch (err) {
      console.error('Failed to remove book from shelf on server:', err);
      if (existing) {
        set((state) => ({
          currentShelf: { ...state.currentShelf, [strId]: existing },
        }));
      }
      throw err;
    }
  },

  getBookRecord: (bookId: string) => {
    return get().currentShelf[String(bookId)];
  },

  getBookStatus: (bookId: string) => {
    const strId = String(bookId);
    const rec = get().currentShelf[strId];
    if (rec) return rec.status;

    try {
      const isSaved = useSavedBooksStore.getState().isBookSaved(strId);
      return isSaved ? 'want_to_read' : null;
    } catch {
      return null;
    }
  },

  hasStatus: (bookId: string, status: BookShelfStatus) => {
    const strId = String(bookId);
    const rec = get().currentShelf[strId];
    if (!rec) {
      if (status === 'want_to_read') {
        return useSavedBooksStore.getState().isBookSaved(strId);
      }
      return false;
    }
    if (status === 'reading') return Boolean(rec.isReading || rec.status === 'reading');
    if (status === 'completed') return Boolean(rec.isCompleted || rec.status === 'completed');
    if (status === 'want_to_read') return Boolean(rec.isWantToRead || rec.status === 'want_to_read' || useSavedBooksStore.getState().isBookSaved(strId));
    return false;
  },

  getBooksByStatus: (status: BookShelfStatus) => {
    const shelf = get().currentShelf;

    if (status === 'want_to_read') {
      try {
        const savedIds = useSavedBooksStore.getState().getSavedBookIds();
        const savedIdSet = new Set(savedIds.map(String));

        for (const [id, rec] of Object.entries(shelf)) {
          if (rec.isWantToRead || rec.status === 'want_to_read') {
            savedIdSet.add(String(id));
          }
        }

        const list: UserBookRecord[] = [];
        for (const sId of savedIdSet) {
          const existingRec = shelf[sId];
          list.push({
            bookId: sId,
            status: 'want_to_read',
            isReading: existingRec?.isReading,
            isCompleted: existingRec?.isCompleted,
            isWantToRead: true,
            addedAt: existingRec?.addedAt || new Date().toISOString(),
            lastReadAt: existingRec?.lastReadAt,
            currentPage: existingRec?.currentPage,
            totalPages: existingRec?.totalPages,
            progressPercent: existingRec?.progressPercent,
            title: existingRec?.title,
            author: existingRec?.author,
            coverImage: existingRec?.coverImage,
            category: existingRec?.category,
            hasAudio: existingRec?.hasAudio,
            audioDuration: existingRec?.audioDuration,
            isFree: existingRec?.isFree,
            gradient: existingRec?.gradient,
          });
        }
        return list;
      } catch {}
    }

    if (status === 'reading') {
      return Object.values(shelf).filter((r) => Boolean(r.isReading || r.status === 'reading'));
    }

    if (status === 'completed') {
      return Object.values(shelf).filter((r) => Boolean(r.isCompleted || r.status === 'completed'));
    }

    return Object.values(shelf);
  },

  markAsReading: async (bookId: string, currentPage = 1, totalPages?: number) => {
    const strId = String(bookId);
    const existing = get().currentShelf[strId];
    if (existing?.status === 'completed') {
      return;
    }

    try {
      await api.post(`/api/v1/me/books/${strId}`, {
        status: 'reading',
        currentPage,
        totalPages,
      });
      await get().fetchShelf();
    } catch (err) {
      console.error('Failed to mark as reading on server:', err);
    }
  },

  markAsCompleted: async (bookId: string) => {
    const strId = String(bookId);
    try {
      await api.patch(`/api/v1/me/books/${strId}`, {
        status: 'completed',
        progressPercent: 100,
      });
      await get().fetchShelf();
    } catch (err) {
      console.error('Failed to mark as completed on server:', err);
    }
  },

  markAsWantToRead: async (bookId: string) => {
    await get().setBookStatus(bookId, 'want_to_read');
  },

  updateReadingProgress: async (bookId: string, currentPage: number, totalPages?: number) => {
    const strId = String(bookId);
    try {
      await api.patch(`/api/v1/me/books/${strId}`, {
        currentPage,
        totalPages,
      });
      await get().fetchShelf();
    } catch (err) {
      console.error('Failed to update reading progress on server:', err);
    }
  },
}));

// Clean up deprecated localStorage key immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_my_books_shelf_storage_v1');
  } catch {}
}
