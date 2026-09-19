import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

// Pseudo-random deterministic hash based on date and book ID to calculate daily trending scores at 00:00
function getDailySeedScore(bookId: string, dateStr: string): number {
  let hash = 0;
  const str = `${dateStr}-${bookId}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  // Base daily simulated listens between 40 and 350
  return (absHash % 310) + 40;
}

export const useTopAudioStore = create<TopAudioState>()(
  persist(
    (set, get) => ({
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
          // Keep history of the last 14 days to keep storage clean
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
        const realCount = (state.listenHistory || []).filter(
          (e) => e.bookId === bookId && e.dateStr === dateStr
        ).length;
        const seedCount = getDailySeedScore(bookId, dateStr);
        return seedCount + realCount * 12;
      },

      getTop10AudioBooks: (allBooks: Book[]): RankedAudioBook[] => {
        if (!allBooks || allBooks.length === 0) return [];

        const dateStr = getTodayString();
        const state = get();

        // 1. Filter books that have audio (audio chapters, audio duration, or marked hasAudio)
        const audioBooks = allBooks.filter((b) => {
          if (b.isArchived) return false;
          return (
            b.hasAudio ||
            Boolean(b.audioUrl) ||
            Boolean(b.audioDuration) ||
            (Array.isArray(b.audioChapters) && b.audioChapters.length > 0)
          );
        });

        // Fallback: if no explicit audio books found, use active books
        const candidateBooks = audioBooks.length > 0 ? audioBooks : allBooks.filter((b) => !b.isArchived);

        // 2. Count real listens for today
        const realListenCounts: Record<string, number> = {};
        (state.listenHistory || []).forEach((e) => {
          if (e.dateStr === dateStr) {
            realListenCounts[e.bookId] = (realListenCounts[e.bookId] || 0) + 1;
          }
        });

        // 3. Compute combined score for each candidate book
        const scoredBooks = candidateBooks.map((book) => {
          const realListens = realListenCounts[book.id] || 0;
          const seedScore = getDailySeedScore(book.id, dateStr);
          const totalScore = seedScore + realListens * 15;

          return {
            book,
            todayListens: totalScore,
            totalListens: totalScore * 4 + 180,
          };
        });

        // 4. Sort descending by today's listens
        scoredBooks.sort((a, b) => b.todayListens - a.todayListens);

        // 5. Take top 10 and assign ranks 1..10
        return scoredBooks.slice(0, 10).map((item, idx) => ({
          book: item.book,
          rank: idx + 1,
          todayListens: item.todayListens,
          totalListens: item.totalListens,
        }));
      },
    }),
    {
      name: 'tanda_top_audio_stats_v1',
    }
  )
);
