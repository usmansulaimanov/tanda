import { create } from 'zustand';
import { Book } from '../types';

export interface AudioListenEvent {
  bookId: string;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
}

export interface RankedAudioBook {
  book: Book;
  rank: number;
  todayListens: number;
  totalListens: number;
}

interface TopAudioState {
  listenHistory: AudioListenEvent[];
  recordAudioListen: (bookId: string) => void;
  getTop10AudioBooks: (allBooks: Book[]) => RankedAudioBook[];
  getTodayListenCount: (bookId: string) => number;
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const useTopAudioStore = create<TopAudioState>((set, get) => ({
  listenHistory: [],

  recordAudioListen: (bookId: string) => {
    if (!bookId) return;
    const now = Date.now();
    const dateStr = getTodayString();

    const newEvent: AudioListenEvent = {
      bookId,
      timestamp: now,
      dateStr,
    };

    set((state) => {
      // Keep history of the last 14 days
      const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
      const filtered = (state.listenHistory || []).filter(
        (e) => e.timestamp >= fourteenDaysAgo
      );
      return {
        listenHistory: [newEvent, ...filtered],
      };
    });
  },

  getTodayListenCount: (bookId: string) => {
    const dateStr = getTodayString();
    const state = get();
    return (state.listenHistory || []).filter(
      (e) => e.bookId === bookId && e.dateStr === dateStr
    ).length;
  },

  getTop10AudioBooks: (allBooks: Book[]): RankedAudioBook[] => {
    if (!allBooks || allBooks.length === 0) return [];

    const dateStr = getTodayString();
    const state = get();

    // 1. Filter books that strictly have audio enabled and are not archived
    const audioBooks = allBooks.filter((b) => !b.isArchived && Boolean(b.hasAudio));
    const candidateBooks = audioBooks.length > 0 ? audioBooks : allBooks.filter((b) => !b.isArchived);

    // 2. Count real listens for today and total in history
    const todayListenCounts: Record<string, number> = {};
    const totalListenCounts: Record<string, number> = {};

    (state.listenHistory || []).forEach((e) => {
      totalListenCounts[e.bookId] = (totalListenCounts[e.bookId] || 0) + 1;
      if (e.dateStr === dateStr) {
        todayListenCounts[e.bookId] = (todayListenCounts[e.bookId] || 0) + 1;
      }
    });

    // 3. Compute score based strictly on real events and backend listen counts
    const scoredBooks = candidateBooks.map((book) => {
      const todayListens = todayListenCounts[book.id] || 0;
      const totalListens = (book.audioListensCount || book.listensCount || 0) + (totalListenCounts[book.id] || 0);

      return {
        book,
        todayListens,
        totalListens,
      };
    });

    // 4. Sort descending by today's listens, then total listens
    scoredBooks.sort((a, b) => {
      if (b.todayListens !== a.todayListens) {
        return b.todayListens - a.todayListens;
      }
      return b.totalListens - a.totalListens;
    });

    // 5. Take top 10 and assign ranks 1..10
    return scoredBooks.slice(0, 10).map((item, idx) => ({
      book: item.book,
      rank: idx + 1,
      todayListens: item.todayListens,
      totalListens: item.totalListens,
    }));
  },
}));

// Clean legacy localStorage key if present
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_top_audio_stats_v1');
  } catch {}
}
