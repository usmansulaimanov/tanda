import { create } from 'zustand';
import { Book } from '../types';
import { api } from '../lib/api';

export interface RankedAudioBook {
  book: Book;
  rank: number;
  todayListens: number;
  totalListens: number;
  totalSeconds?: number;
}

interface TopAudioState {
  topAudioBooks: RankedAudioBook[];
  isLoading: boolean;
  fetchTopAudio: (limit?: number) => Promise<void>;
  getTop10AudioBooks: (allBooks?: Book[]) => RankedAudioBook[];
  recordAudioListen: (bookId: string) => void;
  getTodayListenCount: (bookId: string) => number;
}

export const useTopAudioStore = create<TopAudioState>((set, get) => ({
  topAudioBooks: [],
  isLoading: false,

  fetchTopAudio: async (limit = 10) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/v1/books/top-audio', {
        params: { limit },
      });
      if (Array.isArray(data)) {
        const mapped: RankedAudioBook[] = data.map((item: any, idx: number) => ({
          book: item.book,
          rank: item.rank || idx + 1,
          todayListens: item.todayListens || 0,
          totalListens: item.totalListens || 0,
          totalSeconds: item.totalSeconds || 0,
        }));
        set({ topAudioBooks: mapped });
      }
    } catch (err) {
      console.error('Failed to fetch top audio books from server:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  getTop10AudioBooks: (allBooks?: Book[]): RankedAudioBook[] => {
    const serverTop = get().topAudioBooks;
    if (serverTop.length > 0) {
      return serverTop.slice(0, 10);
    }

    // Fallback: If server top audio hasn't loaded yet, build initial list from allBooks
    if (!allBooks || allBooks.length === 0) return [];
    const audioBooks = allBooks.filter((b) => !b.isArchived && Boolean(b.hasAudio));
    const candidateBooks = audioBooks.length > 0 ? audioBooks : allBooks.filter((b) => !b.isArchived);

    return candidateBooks.slice(0, 10).map((b, idx) => ({
      book: b,
      rank: idx + 1,
      todayListens: 0,
      totalListens: b.audioListensCount || b.listensCount || 0,
    }));
  },

  // Deprecated client-side recording (server handles via AudioSessions)
  recordAudioListen: (_bookId: string) => {
    // No-op: AudioSessionService records authentic listening events on server
  },

  getTodayListenCount: (bookId: string) => {
    const found = get().topAudioBooks.find((r) => String(r.book?.id) === String(bookId));
    return found ? found.todayListens : 0;
  },
}));

// Clean up deprecated mock stats key from localStorage immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_top_audio_stats_v1');
  } catch {}
}
