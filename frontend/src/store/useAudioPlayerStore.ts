import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Book, AudioChapter } from '../types';
import { api } from '../lib/api';
import { useMyBooksStore } from './useMyBooksStore';

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

export function parseDurationToSeconds(durStr?: string): number {
  if (!durStr) return 300;
  const clean = durStr.trim().toLowerCase();
  
  if (clean.includes(':')) {
    const parts = clean.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  
  const minMatch = clean.match(/(\d+)\s*(мин|m|минут)/);
  if (minMatch) {
    return parseInt(minMatch[1], 10) * 60;
  }

  const hrMatch = clean.match(/(\d+)\s*(сағ|h|сағат)/);
  if (hrMatch) {
    return parseInt(hrMatch[1], 10) * 3600;
  }

  const num = parseInt(clean, 10);
  if (!isNaN(num) && num > 0) return num;

  return 300;
}

export function getChapterStartTime(chapters: AudioChapter[], targetIndex: number): number {
  let startTime = 0;
  for (let i = 0; i < targetIndex && i < chapters.length; i++) {
    startTime += parseDurationToSeconds(chapters[i].duration);
  }
  return startTime;
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
        const hasOwnAudio = Boolean(chapter?.audioUrl && chapter.audioUrl.trim());
        const startProgress = !hasOwnAudio && chapters.length > 0 ? getChapterStartTime(chapters, chapterIndex) : 0;
        const chapterDur = chapter?.duration ? parseDurationToSeconds(chapter.duration) : 180;

        set({
          currentBook: book,
          currentChapter: chapter,
          chapterIndex,
          isPlaying: true,
          progress: startProgress,
          duration: chapterDur,
        });
        useMyBooksStore.getState().markAsReading(book.id);
        debouncedSyncProgress(book.id, chapter?.id, startProgress);
      },

      playChapter: (index) => {
        const { currentBook } = get();
        if (!currentBook) return;
        const chapters = currentBook.audioChapters || [];
        if (chapters.length > 0 && chapters[index]) {
          const chapter = chapters[index];
          const hasOwnAudio = Boolean(chapter.audioUrl && chapter.audioUrl.trim());
          const startProgress = !hasOwnAudio ? getChapterStartTime(chapters, index) : 0;
          const chapterDur = chapter.duration ? parseDurationToSeconds(chapter.duration) : 180;

          set({
            chapterIndex: index,
            currentChapter: chapter,
            isPlaying: true,
            progress: startProgress,
            duration: chapterDur,
          });
          debouncedSyncProgress(currentBook.id, chapter?.id, startProgress);
          window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: startProgress } }));
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

        if (repeatMode === 'one') {
          if (chapters.length > 0) {
            get().playChapter(chapterIndex);
          } else {
            set({ progress: 0, isPlaying: true });
            window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: 0 } }));
          }
          return;
        }

        if (chapters.length > 1) {
          if (chapterIndex < chapters.length - 1) {
            get().playChapter(chapterIndex + 1);
          }
          // If already at the last chapter: stay on the last chapter without jumping to chapter 1
        } else if (chapters.length === 1) {
          // Single chapter -> replay from 0:00
          get().playChapter(0);
        } else {
          // Single audio track with no chapters
          set({ progress: 0, isPlaying: true });
          window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: 0 } }));
        }
      },

      prevChapter: () => {
        const { currentBook, chapterIndex, progress } = get();
        if (!currentBook) return;
        const chapters = currentBook.audioChapters || [];

        if (chapters.length > 1) {
          if (progress > 4) {
            get().playChapter(chapterIndex);
          } else if (chapterIndex > 0) {
            get().playChapter(chapterIndex - 1);
          } else {
            // Already at the 1st chapter: restart 1st chapter from 0:00 (do not jump to the last chapter)
            get().playChapter(0);
          }
        } else if (chapters.length === 1) {
          // Single chapter -> replay from 0:00
          get().playChapter(0);
        } else {
          // Single audio track with no chapters
          set({ progress: 0, isPlaying: true });
          window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: 0 } }));
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

if (typeof window !== 'undefined') {
  window.addEventListener('tanda:logout', () => {
    try {
      useAudioPlayerStore.getState().closePlayer();
    } catch {}
  });
}
