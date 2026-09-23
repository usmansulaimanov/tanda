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
  isDailyLimitReached: boolean;
  showDailyLimitModal: boolean;

  openDailyLimitModal: () => void;
  closeDailyLimitModal: () => void;
  checkDailyLimit: () => Promise<boolean>;

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
    api.put(`/api/v1/progress/${bookId}`, {
      currentAudioChapterId: chapterId,
      currentAudioTime: Math.floor(timeSec || 0),
    }).catch(() => {});
  }, 3000);
}

export function resetRoyaltyTracking() {
  // Server-side AudioSession handles accurate listening tracking
}

// Backend Audio Session & Heartbeat Management
let activeSessionId: string | null = null;
let heartbeatInterval: any = null;

async function startAudioSession(bookId: string, chapterId?: string) {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('tanda_token');
  if (!token) return;

  if (useAudioPlayerStore.getState().isDailyLimitReached) {
    useAudioPlayerStore.getState().pause();
    useAudioPlayerStore.setState({ showDailyLimitModal: true });
    return;
  }

  if (activeSessionId) {
    await endAudioSession();
  }

  try {
    const { data } = await api.post('/api/v1/audio/sessions', {
      bookId: String(bookId),
      chapterId: chapterId ? String(chapterId) : undefined,
    });
    if (data?.sessionId) {
      activeSessionId = data.sessionId;
      startHeartbeatTimer();
    }
  } catch (err: any) {
    const msg = err?.response?.data?.message || '';
    if (err?.response?.status === 400 && (msg.includes('лимитіңіз') || msg.includes('8 сағат'))) {
      useAudioPlayerStore.getState().pause();
      useAudioPlayerStore.setState({
        isDailyLimitReached: true,
        showDailyLimitModal: true,
      });
    }
    console.debug('Failed to start audio session:', err);
  }
}

function startHeartbeatTimer() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  heartbeatInterval = setInterval(async () => {
    const state = useAudioPlayerStore.getState();
    if (!state.isPlaying || !activeSessionId) return;

    try {
      const { data } = await api.post(`/api/v1/audio/sessions/${activeSessionId}/heartbeat`, {
        positionSeconds: Math.floor(state.progress || 0),
        playbackRate: state.playbackRate || 1.0,
      });

      if (data?.dailyLimitReached) {
        stopHeartbeatTimer();
        useAudioPlayerStore.getState().pause();
        useAudioPlayerStore.setState({
          isDailyLimitReached: true,
          showDailyLimitModal: true,
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || '';
      if (err?.response?.status === 400 && (msg.includes('лимитіңіз') || msg.includes('8 сағат'))) {
        stopHeartbeatTimer();
        useAudioPlayerStore.getState().pause();
        useAudioPlayerStore.setState({
          isDailyLimitReached: true,
          showDailyLimitModal: true,
        });
      }
      console.debug('Heartbeat error:', err);
    }
  }, 15000);
}

function stopHeartbeatTimer() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

async function endAudioSession(finalPosition?: number) {
  stopHeartbeatTimer();
  if (!activeSessionId) return;

  const currentId = activeSessionId;
  activeSessionId = null;

  try {
    const currentSec = finalPosition ?? Math.floor(useAudioPlayerStore.getState().progress || 0);
    const rate = useAudioPlayerStore.getState().playbackRate || 1.0;
    await api.patch(`/api/v1/audio/sessions/${currentId}/end`, {
      positionSeconds: currentSec,
      playbackRate: rate,
    });
  } catch (err) {
    console.debug('End audio session error:', err);
  }
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
      isDailyLimitReached: false,
      showDailyLimitModal: false,

      openDailyLimitModal: () => set({ showDailyLimitModal: true }),
      closeDailyLimitModal: () => set({ showDailyLimitModal: false }),
      checkDailyLimit: async () => {
        try {
          const token = localStorage.getItem('tanda_token');
          if (!token) return false;
          const { data } = await api.get('/api/v1/audio/sessions/daily-limit');
          if (data?.limitReached) {
            set({ isDailyLimitReached: true });
            return true;
          } else {
            set({ isDailyLimitReached: false });
            return false;
          }
        } catch {
          return false;
        }
      },

      playBook: (book, chapterIndex = 0) => {
        if (get().isDailyLimitReached) {
          set({ showDailyLimitModal: true, isPlaying: false });
          return;
        }

        let chapters = book.audioChapters || [];
        if (chapters.length === 0 && (book.hasAudio || book.audioUrl)) {
          chapters = [
            {
              id: `${book.id}-ch-1`,
              title: '1-бөлім',
              duration: book.audioDuration || '05:00',
              audioUrl: book.audioUrl || '',
            },
          ];
        }
        const chapter = chapters[chapterIndex] || chapters[0] || null;
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
        startAudioSession(book.id, chapter?.id);
        debouncedSyncProgress(book.id, chapter?.id, startProgress);
      },

      playChapter: (index) => {
        if (get().isDailyLimitReached) {
          set({ showDailyLimitModal: true, isPlaying: false });
          return;
        }

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

          startAudioSession(currentBook.id, chapter?.id);
          debouncedSyncProgress(currentBook.id, chapter?.id, startProgress);
          window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: startProgress } }));
        }
      },

      setIsPlaying: (isPlaying) => {
        if (isPlaying && get().isDailyLimitReached) {
          set({ showDailyLimitModal: true, isPlaying: false });
          return;
        }
        if (isPlaying) {
          const curBook = get().currentBook;
          if (!activeSessionId && curBook) {
            startAudioSession(curBook.id, get().currentChapter?.id);
          } else {
            startHeartbeatTimer();
          }
        } else {
          stopHeartbeatTimer();
        }
        set({ isPlaying });
      },

      togglePlay: () => {
        const state = get();
        if (!state.isPlaying && state.isDailyLimitReached) {
          set({ showDailyLimitModal: true, isPlaying: false });
          return;
        }
        const next = !state.isPlaying;
        if (next) {
          if (!activeSessionId && state.currentBook) {
            startAudioSession(state.currentBook.id, state.currentChapter?.id);
          } else {
            startHeartbeatTimer();
          }
        } else {
          stopHeartbeatTimer();
        }
        set({ isPlaying: next });
      },

      pause: () => {
        stopHeartbeatTimer();
        set({ isPlaying: false });
      },

      resume: () => {
        const state = get();
        if (state.isDailyLimitReached) {
          set({ showDailyLimitModal: true, isPlaying: false });
          return;
        }
        if (!activeSessionId && state.currentBook) {
          startAudioSession(state.currentBook.id, state.currentChapter?.id);
        } else {
          startHeartbeatTimer();
        }
        set({ isPlaying: true });
      },

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
        } else if (chapters.length === 1) {
          get().playChapter(0);
        } else {
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
            get().playChapter(0);
          }
        } else if (chapters.length === 1) {
          get().playChapter(0);
        } else {
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

      closePlayer: () => {
        endAudioSession();
        set({
          currentBook: null,
          currentChapter: null,
          chapterIndex: 0,
          isPlaying: false,
          progress: 0,
          sleepTimerMinutes: null,
          sleepTimerEndTime: null,
        });
      },
    }),
    {
      name: 'tanda_audio_player_settings_v1',
      partialize: (state) => ({
        volume: state.volume,
        playbackRate: state.playbackRate,
        repeatMode: state.repeatMode,
      }),
    }
  )
);

// Clean up deprecated localStorage key immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_audio_player_state_v1');
  } catch {}

  window.addEventListener('tanda:logout', () => {
    try {
      useAudioPlayerStore.getState().closePlayer();
    } catch {}
  });

  window.addEventListener('beforeunload', () => {
    try {
      endAudioSession();
    } catch {}
  });

  // Check daily limit on startup
  setTimeout(() => {
    useAudioPlayerStore.getState().checkDailyLimit().catch(() => {});
  }, 1000);
}
