import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Book, AudioChapter } from '../types';
import { api } from '../lib/api';

interface AudioPlayerState {
  currentBook: Book | null;
  currentChapter: AudioChapter | null;
  chapterIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  playbackRate: number;
  volume: number;
  repeatMode: 'off' | 'one' | 'all';
  sleepTimerMinutes: number | null;
  sleepTimerEndTime: number | null;

  playBook: (book: Book, chapterIndex?: number) => void;
  playChapter: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextChapter: () => void;
  prevChapter: () => void;
  setProgress: (sec: number) => void;
  setDuration: (sec: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (vol: number) => void;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
  toggleRepeatMode: () => void;
  setSleepTimer: (minutes: number | null) => void;
  cancelSleepTimer: () => void;
  closePlayer: () => void;
}

let syncTimeout: any = null;

function debouncedSyncProgress(bookId: string, chapterId?: string, timeSec?: number) {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('tanda_token');
  if (!token) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    api.put(`/api/progress/${bookId}`, {
      currentAudioChapterId: chapterId,
      currentAudioTime: Math.floor(timeSec || 0),
    }).catch(() => {});
  }, 3000);
}

export const useAudioPlayerStore = create<AudioPlayerState>()(
  persist(
    (set, get) => ({
      currentBook: null,
      currentChapter: null,
      chapterIndex: 0,
      isPlaying: false,
      progress: 0,
      duration: 180,
      playbackRate: 1,
      volume: 1,
      repeatMode: 'off',
      sleepTimerMinutes: null,
      sleepTimerEndTime: null,

      playBook: (book, chapterIndex = 0) => {
        const chapters = book.audioChapters || [];
        const chapter = chapters[chapterIndex] || null;
        set({
          currentBook: book,
          currentChapter: chapter,
          chapterIndex,
          isPlaying: true,
          progress: 0,
        });
        debouncedSyncProgress(book.id, chapter?.id, 0);
      },

      playChapter: (index) => {
        const { currentBook } = get();
        if (!currentBook) return;
        const chapters = currentBook.audioChapters || [];
        if (chapters.length > 0 && chapters[index]) {
          set({
            chapterIndex: index,
            currentChapter: chapters[index],
            isPlaying: true,
            progress: 0,
          });
          debouncedSyncProgress(currentBook.id, chapters[index]?.id, 0);
        }
      },

      setIsPlaying: (isPlaying) => set({ isPlaying }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      pause: () => set({ isPlaying: false }),
      resume: () => set({ isPlaying: true }),

      nextChapter: () => {
        const { currentBook, chapterIndex, repeatMode } = get();
        if (!currentBook) return;
        const chapters = currentBook.audioChapters || [];

        if (chapters.length > 0) {
          if (chapterIndex < chapters.length - 1) {
            get().playChapter(chapterIndex + 1);
          } else if (repeatMode === 'all') {
            get().playChapter(0);
          } else {
            set({ isPlaying: false, progress: 0 });
          }
        } else {
          // Single audio track
          if (repeatMode === 'one' || repeatMode === 'all') {
            set({ progress: 0, isPlaying: true });
          } else {
            set({ isPlaying: false, progress: 0 });
          }
        }
      },

      prevChapter: () => {
        const { currentBook, chapterIndex, progress } = get();
        if (!currentBook) return;
        const chapters = currentBook.audioChapters || [];

        if (progress > 4) {
          set({ progress: 0 });
          return;
        }

        if (chapters.length > 0) {
          if (chapterIndex > 0) {
            get().playChapter(chapterIndex - 1);
          } else {
            set({ progress: 0 });
          }
        } else {
          set({ progress: 0 });
        }
      },

      setProgress: (progress) => {
        set({ progress });
        const { currentBook, currentChapter } = get();
        if (currentBook) {
          debouncedSyncProgress(currentBook.id, currentChapter?.id, progress);
        }
      },

      setDuration: (duration) => set({ duration }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setVolume: (volume) => set({ volume }),

      setRepeatMode: (repeatMode) => set({ repeatMode }),
      toggleRepeatMode: () => {
        const current = get().repeatMode;
        const next: 'off' | 'one' | 'all' =
          current === 'off' ? 'one' : current === 'one' ? 'all' : 'off';
        set({ repeatMode: next });
      },

      setSleepTimer: (minutes) => {
        if (minutes === null || minutes <= 0) {
          set({ sleepTimerMinutes: null, sleepTimerEndTime: null });
        } else {
          const endTime = Date.now() + minutes * 60 * 1000;
          set({ sleepTimerMinutes: minutes, sleepTimerEndTime: endTime });
        }
      },

      cancelSleepTimer: () => {
        set({ sleepTimerMinutes: null, sleepTimerEndTime: null });
      },

      closePlayer: () =>
        set({
          currentBook: null,
          currentChapter: null,
          chapterIndex: 0,
          isPlaying: false,
          progress: 0,
          sleepTimerMinutes: null,
          sleepTimerEndTime: null,
        }),
    }),
    {
      name: 'tanda_audio_player_state_v1',
    }
  )
);
