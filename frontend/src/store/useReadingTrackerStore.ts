import { create } from 'zustand';

export interface ReadingTrackerSessionData {
  mode: 'STOPWATCH' | 'TIMER';
  timerDuration: number;
  customMinutes: string;
  isRunning: boolean;
  isPaused: boolean;
  isFloatingDismissed: boolean;
  accumulatedSeconds: number;
  segmentStartTime: number | null;
  sessionInitialStartTime: number | null;
  selectedBookTitle: string;
  customBookTitle: string;
  selectedGroupId: string;
  fixedGroupId?: string;
  fixedGroupName?: string;
  soundEnabled: boolean;
}

interface ReadingTrackerStore extends ReadingTrackerSessionData {
  setMode: (mode: 'STOPWATCH' | 'TIMER') => void;
  setTimerDuration: (sec: number) => void;
  setCustomMinutes: (mins: string) => void;
  setSelectedBookTitle: (title: string) => void;
  setCustomBookTitle: (title: string) => void;
  setSelectedGroupId: (id: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setFloatingDismissed: (dismissed: boolean) => void;

  startSession: (options?: Partial<ReadingTrackerSessionData>) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  togglePause: () => void;
  resetSession: () => void;
  syncFromStorage: () => void;
  getElapsedSeconds: () => number;
  getRemainingSeconds: () => number;
}

const STORAGE_KEY = 'tanda_active_reading_session';

const loadInitialState = (): ReadingTrackerSessionData => {
  const defaultState: ReadingTrackerSessionData = {
    mode: 'STOPWATCH',
    timerDuration: 30 * 60,
    customMinutes: '30',
    isRunning: false,
    isPaused: false,
    isFloatingDismissed: false,
    accumulatedSeconds: 0,
    segmentStartTime: null,
    sessionInitialStartTime: null,
    selectedBookTitle: '',
    customBookTitle: '',
    selectedGroupId: '',
    soundEnabled: true,
  };

  if (typeof window === 'undefined') return defaultState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.isRunning) {
      return {
        ...defaultState,
        mode: parsed.mode || 'STOPWATCH',
        timerDuration: parsed.timerDuration || 30 * 60,
        customMinutes: parsed.customMinutes || '30',
        isRunning: true,
        isPaused: Boolean(parsed.isPaused),
        accumulatedSeconds: parsed.accumulatedSeconds || 0,
        segmentStartTime: parsed.isPaused ? null : (parsed.segmentStartTime || parsed.startTime || Date.now()),
        sessionInitialStartTime: parsed.sessionInitialStartTime || parsed.startTime || Date.now(),
        selectedBookTitle: parsed.bookTitle || parsed.selectedBookTitle || '',
        customBookTitle: parsed.customBookTitle || '',
        selectedGroupId: parsed.groupId || parsed.selectedGroupId || '',
        fixedGroupId: parsed.fixedGroupId,
        fixedGroupName: parsed.groupName || parsed.fixedGroupName,
        soundEnabled: parsed.soundEnabled ?? true,
      };
    }
  } catch (e) {
    console.error('Failed to load initial reading tracker state', e);
  }

  return defaultState;
};

const persistState = (state: ReadingTrackerSessionData) => {
  if (typeof window === 'undefined') return;
  try {
    if (state.isRunning) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mode: state.mode,
          timerDuration: state.timerDuration,
          customMinutes: state.customMinutes,
          isRunning: state.isRunning,
          isPaused: state.isPaused,
          accumulatedSeconds: state.accumulatedSeconds,
          segmentStartTime: state.segmentStartTime,
          sessionInitialStartTime: state.sessionInitialStartTime,
          bookTitle: state.selectedBookTitle || state.customBookTitle,
          groupId: state.fixedGroupId || state.selectedGroupId || '',
          groupName: state.fixedGroupName || '',
          fixedGroupId: state.fixedGroupId,
          fixedGroupName: state.fixedGroupName,
          soundEnabled: state.soundEnabled,
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to persist reading tracker state', e);
  }
};

export const useReadingTrackerStore = create<ReadingTrackerStore>((set, get) => ({
  ...loadInitialState(),

  setMode: (mode) => {
    set({ mode });
  },

  setTimerDuration: (timerDuration) => {
    set({ timerDuration });
  },

  setCustomMinutes: (customMinutes) => {
    set({ customMinutes });
  },

  setSelectedBookTitle: (selectedBookTitle) => {
    set({ selectedBookTitle });
  },

  setCustomBookTitle: (customBookTitle) => {
    set({ customBookTitle });
  },

  setSelectedGroupId: (selectedGroupId) => {
    set({ selectedGroupId });
  },

  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
  },

  setFloatingDismissed: (isFloatingDismissed) => {
    set({ isFloatingDismissed });
  },

  startSession: (options) => {
    const now = Date.now();
    const current = get();
    const mode = options?.mode || current.mode;
    const timerDuration = options?.timerDuration || current.timerDuration;

    const nextState: Partial<ReadingTrackerSessionData> = {
      ...options,
      mode,
      timerDuration,
      isRunning: true,
      isPaused: false,
      isFloatingDismissed: false,
      accumulatedSeconds: 0,
      segmentStartTime: now,
      sessionInitialStartTime: now,
    };

    set(nextState as any);
    persistState(get());
  },

  pauseSession: () => {
    const current = get();
    if (!current.isRunning || current.isPaused) return;

    const now = Date.now();
    const segmentSec = current.segmentStartTime ? Math.max(0, Math.floor((now - current.segmentStartTime) / 1000)) : 0;
    const totalAccumulated = current.accumulatedSeconds + segmentSec;

    const nextState = {
      accumulatedSeconds: totalAccumulated,
      segmentStartTime: null,
      isPaused: true,
    };

    set(nextState);
    persistState(get());
  },

  resumeSession: () => {
    const current = get();
    if (!current.isRunning || !current.isPaused) return;

    const now = Date.now();
    const nextState = {
      segmentStartTime: now,
      isPaused: false,
    };

    set(nextState);
    persistState(get());
  },

  togglePause: () => {
    const current = get();
    if (current.isPaused) {
      get().resumeSession();
    } else {
      get().pauseSession();
    }
  },

  resetSession: () => {
    const nextState: Partial<ReadingTrackerSessionData> = {
      isRunning: false,
      isPaused: false,
      accumulatedSeconds: 0,
      segmentStartTime: null,
      sessionInitialStartTime: null,
    };

    set(nextState as any);
    persistState(get());
  },

  syncFromStorage: () => {
    const loaded = loadInitialState();
    set(loaded as any);
  },

  getElapsedSeconds: () => {
    const current = get();
    if (!current.isRunning) return 0;
    if (current.isPaused || !current.segmentStartTime) {
      return current.accumulatedSeconds;
    }
    const now = Date.now();
    const currentSeg = Math.max(0, Math.floor((now - current.segmentStartTime) / 1000));
    return current.accumulatedSeconds + currentSeg;
  },

  getRemainingSeconds: () => {
    const current = get();
    const elapsed = get().getElapsedSeconds();
    return Math.max(0, current.timerDuration - elapsed);
  },
}));
