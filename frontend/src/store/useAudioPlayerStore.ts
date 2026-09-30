import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Book, AudioChapter } from '../types';
import { api } from '../lib/api';
import { useMyBooksStore } from './useMyBooksStore';
import { useAuthStore } from './useAuthStore';

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
  isAdPlaying: boolean;
  adProgress: number;
  adDuration: number;
  adTitle: string;

  setIsAdPlaying: (isAdPlaying: boolean) => void;
  setAdProgress: (sec: number) => void;
  setAdDuration: (sec: number) => void;
  setAdTitle: (title: string) => void;

  openDailyLimitModal: () => void;
  closeDailyLimitModal: () => void;
  checkDailyLimit: () => Promise<boolean>;

  playBook: (book: Book, chapterIndex?: number, initialProgress?: number) => Promise<void> | void;
  playChapter: (index: number, explicitProgress?: number) => void;
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

let lastSyncTimeMs = 0;
let lastSyncedSec = -1;

export interface StoredBookProgress {
  time: number;
  chapterId?: string;
  chapterIndex?: number;
  chapterProgress?: Record<string, number>;
  updatedAt: number;
}

export async function syncProgressNow(bookId: string, chapterId?: string, timeSec?: number, chapterIndex?: number) {
  if (typeof window === 'undefined') return;
  const sec = Math.floor(timeSec || 0);
  const uid = useAuthStore.getState().user?.id || 'guest';

  // Fast local backup with chapter map keyed per user
  try {
    let existing: StoredBookProgress = { time: sec, chapterId, chapterIndex, chapterProgress: {}, updatedAt: Date.now() };
    const raw = localStorage.getItem(`tanda_book_progress_${uid}_${bookId}`) || localStorage.getItem(`tanda_book_progress_${bookId}`);
    if (raw) {
      existing = { ...existing, ...JSON.parse(raw) };
      if (!existing.chapterProgress) existing.chapterProgress = {};
    }
    if (chapterId) {
      existing.chapterProgress![chapterId] = sec;
    }
    if (chapterIndex !== undefined) {
      existing.chapterProgress![`idx_${chapterIndex}`] = sec;
    }
    existing.time = sec;
    existing.chapterId = chapterId;
    existing.chapterIndex = chapterIndex;
    existing.updatedAt = Date.now();
    localStorage.setItem(`tanda_book_progress_${uid}_${bookId}`, JSON.stringify(existing));
  } catch {}

  const token = localStorage.getItem('tanda_token');
  if (!token) return;

  lastSyncTimeMs = Date.now();
  lastSyncedSec = sec;

  try {
    await api.put(`/api/v1/progress/${bookId}`, {
      currentAudioChapterId: chapterId,
      currentAudioTime: sec,
    });
  } catch {
    // ignore
  }
}

export function throttledSyncProgress(bookId: string, chapterId?: string, timeSec?: number, chapterIndex?: number) {
  if (typeof window === 'undefined') return;
  const sec = Math.floor(timeSec || 0);
  const uid = useAuthStore.getState().user?.id || 'guest';

  // Fast local backup on every second keyed per user
  try {
    let existing: StoredBookProgress = { time: sec, chapterId, chapterIndex, chapterProgress: {}, updatedAt: Date.now() };
    const raw = localStorage.getItem(`tanda_book_progress_${uid}_${bookId}`) || localStorage.getItem(`tanda_book_progress_${bookId}`);
    if (raw) {
      existing = { ...existing, ...JSON.parse(raw) };
      if (!existing.chapterProgress) existing.chapterProgress = {};
    }
    if (chapterId) {
      existing.chapterProgress![chapterId] = sec;
    }
    if (chapterIndex !== undefined) {
      existing.chapterProgress![`idx_${chapterIndex}`] = sec;
    }
    existing.time = sec;
    existing.chapterId = chapterId;
    existing.chapterIndex = chapterIndex;
    existing.updatedAt = Date.now();
    localStorage.setItem(`tanda_book_progress_${uid}_${bookId}`, JSON.stringify(existing));
  } catch {}

  const now = Date.now();
  // Sync to backend every 3 seconds or on significant position jump (seek)
  if (now - lastSyncTimeMs >= 3000 || Math.abs(sec - lastSyncedSec) >= 4) {
    lastSyncTimeMs = now;
    lastSyncedSec = sec;
    const token = localStorage.getItem('tanda_token');
    if (token) {
      api.put(`/api/v1/progress/${bookId}`, {
        currentAudioChapterId: chapterId,
        currentAudioTime: sec,
      }).catch(() => {});
    }
  }
}

export function getSavedChapterProgress(bookId: string, chapterId?: string, chapterIndex?: number): number | null {
  if (typeof window === 'undefined') return null;
  const uid = useAuthStore.getState().user?.id || 'guest';
  try {
    const raw = localStorage.getItem(`tanda_book_progress_${uid}_${bookId}`) || localStorage.getItem(`tanda_book_progress_${bookId}`);
    if (raw) {
      const parsed: StoredBookProgress = JSON.parse(raw);
      if (parsed?.chapterProgress) {
        if (chapterId && parsed.chapterProgress[chapterId] !== undefined) {
          return parsed.chapterProgress[chapterId];
        }
        if (chapterIndex !== undefined && parsed.chapterProgress[`idx_${chapterIndex}`] !== undefined) {
          return parsed.chapterProgress[`idx_${chapterIndex}`];
        }
      }
    }
  } catch {}
  return null;
}

export function resetRoyaltyTracking() {
  // Server-side AudioSession handles accurate listening tracking
}

export function getCachedSystemSettings(): any {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('tanda_system_settings');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveCachedSystemSettings(settings: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('tanda_system_settings', JSON.stringify(settings));
  } catch {}
}

export function isAdRequiredForUser(bookId?: string): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('tanda_token');
  if (!token) return false;

  const cachedSettings = getCachedSystemSettings();
  if (cachedSettings) {
    if (cachedSettings.premiumEnabled === false || Boolean(cachedSettings.openAccessMode)) {
      return false;
    }
    if (!cachedSettings.audioAdEnabled || !cachedSettings.audioAdUrl) {
      return false;
    }
  }

  // 1. Check in-memory Zustand auth store state
  const authState = useAuthStore.getState();
  const authUser = authState.user;

  if (authUser?.isPremium) {
    return false;
  }
  if (
    authUser?.role === 'author' ||
    authUser?.role === 'admin' ||
    authUser?.isAuthor ||
    authUser?.isSuperAdmin ||
    Boolean(authUser?.duty)
  ) {
    return false;
  }

  // 2. If token exists and auth is still initializing, do not default to forcing ad
  if (token && !authState.isAuthInitialized) {
    return false;
  }

  // 3. Fallback check for any legacy local storage user
  const authUserRaw = localStorage.getItem('tanda_user') || localStorage.getItem('user');
  if (authUserRaw) {
    try {
      const parsed = JSON.parse(authUserRaw);
      if (parsed?.isPremium || parsed?.role === 'admin' || parsed?.role === 'author') {
        return false;
      }
    } catch {}
  }

  if (cachedSettings?.audioAdEnabled && cachedSettings?.audioAdUrl) {
    return true;
  }

  return false;
}

// Backend Audio Session & Heartbeat Management
let activeSessionId: string | null = null;
let heartbeatInterval: any = null;

export async function startAudioSession(bookId: string, chapterId?: string) {
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

export async function flushHeartbeatNow(overridePos?: number) {
  if (!activeSessionId) return;
  const state = useAudioPlayerStore.getState();
  const currentSec = overridePos !== undefined ? Math.floor(overridePos) : Math.floor(state.progress || 0);
  const rate = state.playbackRate || 1.0;
  try {
    const { data } = await api.post(`/api/v1/audio/sessions/${activeSessionId}/heartbeat`, {
      positionSeconds: currentSec,
      playbackRate: rate,
    });
    if (data?.dailyLimitReached) {
      stopHeartbeatTimer();
      useAudioPlayerStore.getState().pause();
      useAudioPlayerStore.setState({
        isDailyLimitReached: true,
        showDailyLimitModal: true,
      });
    }
  } catch (err) {
    console.debug('Flush heartbeat error:', err);
  }
}

function startHeartbeatTimer() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  heartbeatInterval = setInterval(async () => {
    const state = useAudioPlayerStore.getState();
    if (!state.isPlaying || !activeSessionId || state.isAdPlaying) return;

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
  }, 5000);
}

function stopHeartbeatTimer() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export async function endAudioSession(finalPosition?: number) {
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

export function isUserExemptFromPremium(): boolean {
  const authState = useAuthStore.getState();
  const authUser = authState.user;
  const authRole = authState.role;
  const isAuthorOrStaff = Boolean(
    authUser && (authRole === 'author' || authRole === 'admin' || authUser.role === 'author' || authUser.role === 'admin' || authUser.isAuthor || authUser.isSuperAdmin || Boolean(authUser.duty))
  );
  const cachedSettings = getCachedSystemSettings();
  const isPremiumSystemDisabled = cachedSettings?.premiumEnabled === false || Boolean(cachedSettings?.openAccessMode);
  return Boolean(authUser?.isPremium || isPremiumSystemDisabled || isAuthorOrStaff);
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
      isAdPlaying: false,
      adProgress: 0,
      adDuration: 15,
      adTitle: '',

      setIsAdPlaying: (isAdPlaying) => set({ isAdPlaying }),
      setAdProgress: (adProgress) => set({ adProgress }),
      setAdDuration: (adDuration) => set({ adDuration }),
      setAdTitle: (adTitle) => set({ adTitle }),

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

      playBook: async (book, targetChapterIndex?: number, explicitProgress?: number) => {
        if (get().isDailyLimitReached) {
          set({ showDailyLimitModal: true, isPlaying: false });
          return;
        }

        const isExempt = isUserExemptFromPremium();
        if (book.isFree === false && !isExempt) {
          if (targetChapterIndex !== undefined && targetChapterIndex > 0) {
            set({ isPlaying: false });
            window.dispatchEvent(new CustomEvent('tanda:premium:modal', {
              detail: { reason: 'Тегін үзінді тек 1-бөлім үшін беріледі. Барлық бөлімдерді толық тыңдау үшін Tanda Premium-ге қосылыңыз!' }
            }));
            return;
          }
        }

        // Flush and sync previous book's progress before loading new book
        const prevBook = get().currentBook;
        const prevChapter = get().currentChapter;
        const prevProgress = get().progress;
        const prevChapterIndex = get().chapterIndex;
        if (prevBook && prevBook.id !== book.id && prevProgress > 0) {
          await syncProgressNow(prevBook.id, prevChapter?.id, prevProgress, prevChapterIndex);
          await endAudioSession(prevProgress);
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

        let resolvedChapterIndex = targetChapterIndex !== undefined ? targetChapterIndex : 0;
        let resolvedProgress = explicitProgress !== undefined ? explicitProgress : 0;

        const isSameBook = get().currentBook?.id === book.id;
        if (targetChapterIndex === undefined && explicitProgress === undefined) {
          if (isSameBook && get().progress > 0) {
            resolvedProgress = get().progress;
            resolvedChapterIndex = get().chapterIndex;
          } else {
            // 1. Check local backup first for instant restore
            try {
              const localSaved = localStorage.getItem(`tanda_book_progress_${book.id}`);
              if (localSaved) {
                const parsed: StoredBookProgress = JSON.parse(localSaved);
                if (parsed && typeof parsed.time === 'number' && parsed.time > 0) {
                  resolvedProgress = parsed.time;
                  if (parsed.chapterId) {
                    const chIdx = chapters.findIndex((c) => c.id === parsed.chapterId);
                    if (chIdx >= 0) resolvedChapterIndex = chIdx;
                  } else if (parsed.chapterIndex !== undefined && chapters[parsed.chapterIndex]) {
                    resolvedChapterIndex = parsed.chapterIndex;
                  }
                }
              }
            } catch {}

            // 2. Fetch from backend API (cross-device sync)
            try {
              const token = localStorage.getItem('tanda_token');
              if (token) {
                const { data } = await api.get(`/api/v1/progress/${book.id}`);
                if (data && data.currentAudioTime !== undefined && data.currentAudioTime > 0) {
                  resolvedProgress = data.currentAudioTime;
                  if (data.currentAudioChapterId) {
                    const chIdx = chapters.findIndex((c) => c.id === data.currentAudioChapterId);
                    if (chIdx >= 0) {
                      resolvedChapterIndex = chIdx;
                    }
                  }
                }
              }
            } catch {
              // fallback
            }
          }
        } else if (targetChapterIndex !== undefined && explicitProgress === undefined) {
          const targetChap = chapters[targetChapterIndex];
          const savedChapProg = getSavedChapterProgress(book.id, targetChap?.id, targetChapterIndex);
          if (savedChapProg !== null && savedChapProg !== undefined && savedChapProg > 0) {
            resolvedProgress = savedChapProg;
          }
        }

        // If not exempt on premium book, enforce preview constraints
        if (book.isFree === false && !isExempt) {
          if (resolvedChapterIndex > 0) {
            resolvedChapterIndex = 0;
            resolvedProgress = 0;
          }
          const limitMinutes = (book.previewDurationMinutes && book.previewDurationMinutes > 0)
            ? book.previewDurationMinutes
            : 15;
          const limitSec = limitMinutes * 60;
          if (resolvedProgress >= limitSec) {
            resolvedProgress = 0;
          }
        }

        const chapter = chapters[resolvedChapterIndex] || chapters[0] || null;
        const hasOwnAudio = Boolean(chapter?.audioUrl && chapter.audioUrl.trim());
        const defaultStart = !hasOwnAudio && chapters.length > 0 ? getChapterStartTime(chapters, resolvedChapterIndex) : 0;
        const startProgress = resolvedProgress > 0 ? resolvedProgress : defaultStart;
        const chapterDur = chapter?.duration ? parseDurationToSeconds(chapter.duration) : 180;

        const cachedSettings = getCachedSystemSettings();
        const needsAd = isAdRequiredForUser(book.id);

        set({
          currentBook: book,
          currentChapter: chapter,
          chapterIndex: resolvedChapterIndex,
          isPlaying: true,
          progress: startProgress,
          duration: chapterDur,
          isAdPlaying: needsAd,
          adProgress: 0,
          adDuration: cachedSettings?.audioAdDuration || 15,
          adTitle: cachedSettings?.audioAdTitle || 'Tanda Аудио-Жарнама',
        });

        useMyBooksStore.getState().markAsReading(book.id);
        if (!needsAd) {
          startAudioSession(book.id, chapter?.id);
        }
        syncProgressNow(book.id, chapter?.id, startProgress, resolvedChapterIndex);
        window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: startProgress } }));
      },

      playChapter: (index, explicitProgress) => {
        if (get().isDailyLimitReached) {
          set({ showDailyLimitModal: true, isPlaying: false });
          return;
        }

        const { currentBook, currentChapter: prevChap, chapterIndex: prevIdx, progress: prevProg } = get();
        if (!currentBook) return;

        const isExempt = isUserExemptFromPremium();
        if (currentBook.isFree === false && !isExempt && index > 0) {
          set({ isPlaying: false });
          window.dispatchEvent(new CustomEvent('tanda:premium:modal', {
            detail: { reason: 'Тегін үзінді тек 1-бөлім үшін беріледі. Барлық бөлімдерді толық тыңдау үшін Tanda Premium-ге қосылыңыз!' }
          }));
          return;
        }

        // 1. Save previous chapter's position before switching
        if (prevChap && prevProg > 0) {
          syncProgressNow(currentBook.id, prevChap.id, prevProg, prevIdx);
        }

        const chapters = currentBook.audioChapters || [];
        if (chapters.length > 0 && chapters[index]) {
          const chapter = chapters[index];
          const hasOwnAudio = Boolean(chapter.audioUrl && chapter.audioUrl.trim());
          const defaultStart = !hasOwnAudio ? getChapterStartTime(chapters, index) : 0;
          const chapterDur = chapter.duration ? parseDurationToSeconds(chapter.duration) : 180;

          let startProgress = defaultStart;

          if (explicitProgress !== undefined) {
            startProgress = hasOwnAudio ? explicitProgress : (defaultStart + explicitProgress);
          } else {
            // Check if there is saved progress for this chapter
            const savedTime = getSavedChapterProgress(currentBook.id, chapter.id, index);
            if (savedTime !== null && savedTime !== undefined && savedTime > 0) {
              if (hasOwnAudio) {
                if (savedTime < chapterDur) {
                  startProgress = savedTime;
                }
              } else {
                // Virtual chapter continuous audio: check if savedTime is within this chapter's range
                if (savedTime >= defaultStart && savedTime < defaultStart + chapterDur) {
                  startProgress = savedTime;
                } else if (savedTime >= 0 && savedTime < chapterDur) {
                  startProgress = defaultStart + savedTime;
                }
              }
            }
          }

          set({
            chapterIndex: index,
            currentChapter: chapter,
            isPlaying: true,
            progress: startProgress,
            duration: chapterDur,
          });

          startAudioSession(currentBook.id, chapter?.id);
          syncProgressNow(currentBook.id, chapter?.id, startProgress, index);
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
          const state = get();
          flushHeartbeatNow(state.progress);
          if (state.currentBook) {
            syncProgressNow(state.currentBook.id, state.currentChapter?.id, state.progress);
          }
        }
        set({ isPlaying });
      },

      togglePlay: () => {
        const state = get();
        if (!state.isPlaying && state.isDailyLimitReached) {
          set({ showDailyLimitModal: true, isPlaying: false });
          return;
        }
        const isExempt = isUserExemptFromPremium();
        if (!state.isPlaying && state.currentBook && state.currentBook.isFree === false && !isExempt) {
          const limitMinutes = (state.currentBook.previewDurationMinutes && state.currentBook.previewDurationMinutes > 0)
            ? state.currentBook.previewDurationMinutes
            : 15;
          const limitSec = limitMinutes * 60;
          if (state.progress >= limitSec) {
            set({ progress: 0 });
            window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: 0 } }));
          }
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
          flushHeartbeatNow(state.progress);
          if (state.currentBook) {
            syncProgressNow(state.currentBook.id, state.currentChapter?.id, state.progress);
          }
        }
        set({ isPlaying: next });
      },

      pause: () => {
        stopHeartbeatTimer();
        const state = get();
        flushHeartbeatNow(state.progress);
        if (state.currentBook) {
          syncProgressNow(state.currentBook.id, state.currentChapter?.id, state.progress);
        }
        set({ isPlaying: false });
      },

      resume: () => {
        const state = get();
        if (state.isDailyLimitReached) {
          set({ showDailyLimitModal: true, isPlaying: false });
          return;
        }
        const isExempt = isUserExemptFromPremium();
        if (state.currentBook && state.currentBook.isFree === false && !isExempt) {
          const limitMinutes = (state.currentBook.previewDurationMinutes && state.currentBook.previewDurationMinutes > 0)
            ? state.currentBook.previewDurationMinutes
            : 15;
          const limitSec = limitMinutes * 60;
          if (state.progress >= limitSec) {
            set({ progress: 0 });
            window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: 0 } }));
          }
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

        const isExempt = isUserExemptFromPremium();
        if (currentBook.isFree === false && !isExempt) {
          set({ isPlaying: false });
          window.dispatchEvent(new CustomEvent('tanda:premium:modal', {
            detail: { reason: 'Тегін үзінді тек 1-бөлім үшін беріледі. Барлық бөлімдерді толық тыңдау үшін Tanda Premium-ге қосылыңыз!' }
          }));
          return;
        }

        const chapters = currentBook.audioChapters || [];

        if (repeatMode === 'one') {
          if (chapters.length > 0) {
            get().playChapter(chapterIndex, 0);
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
          // Егер соңғы аудио (бөлім) болса, ешқайда өтпейді
        }
      },

      prevChapter: () => {
        const { currentBook, chapterIndex } = get();
        if (!currentBook) return;

        const isExempt = isUserExemptFromPremium();
        if (currentBook.isFree === false && !isExempt) {
          get().playChapter(0);
          return;
        }

        // Егер алдыңғы бөлім бар болса (chapterIndex > 0), осы аудионы басынан бастамай, бірден алдыңғы бөлімге өтеді
        // және сол бөлімнің соңғы тыңдалған / сақталған орнынан жалғастырады
        if (chapterIndex > 0) {
          get().playChapter(chapterIndex - 1);
        } else {
          // Егер 1-бөлімнің өзінде тұрса, басына (0-ге) қайтарады
          get().playChapter(0, 0);
        }
      },

      setProgress: (progress) => {
        set({ progress });
        const { currentBook, currentChapter, chapterIndex } = get();
        if (currentBook) {
          throttledSyncProgress(currentBook.id, currentChapter?.id, progress, chapterIndex);
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
        const state = get();
        if (state.currentBook && state.progress > 0) {
          syncProgressNow(state.currentBook.id, state.currentChapter?.id, state.progress);
        }
        endAudioSession();
        set({
          currentBook: null,
          currentChapter: null,
          chapterIndex: 0,
          isPlaying: false,
          progress: 0,
          isAdPlaying: false,
          adProgress: 0,
          sleepTimerMinutes: null,
          sleepTimerEndTime: null,
        });
      },
    }),
    {
      name: 'tanda_audio_player_state_v2',
      partialize: (state) => ({
        currentBook: state.currentBook,
        currentChapter: state.currentChapter,
        chapterIndex: state.chapterIndex,
        isPlaying: state.isPlaying,
        progress: state.progress,
        duration: state.duration,
        volume: state.volume,
        playbackRate: state.playbackRate,
        repeatMode: state.repeatMode,
      }),
    }
  )
);

// Clean up deprecated localStorage keys
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_audio_player_settings_v1');
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

  // Preload system settings on startup
  api.get('/api/v1/system/settings').then(({ data }) => {
    if (data) {
      saveCachedSystemSettings(data);
    }
  }).catch(() => {});

  // Check daily limit on startup
  setTimeout(() => {
    useAudioPlayerStore.getState().checkDailyLimit().catch(() => {});
  }, 1000);
}
