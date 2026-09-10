import { create } from 'zustand';
import { Book, AudioChapter } from '../types';

interface AudioPlayerState {
  currentBook: Book | null;
  currentChapter: AudioChapter | null;
  chapterIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  playbackRate: number;
  volume: number;

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
  closePlayer: () => void;
}

export const useAudioPlayerStore = create<AudioPlayerState>((set, get) => ({
  currentBook: null,
  currentChapter: null,
  chapterIndex: 0,
  isPlaying: false,
  progress: 0,
  duration: 180,
  playbackRate: 1,
  volume: 1,

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
  },

  playChapter: (index) => {
    const { currentBook } = get();
    if (!currentBook || !currentBook.audioChapters) return;
    const chapter = currentBook.audioChapters[index];
    if (chapter) {
      set({
        chapterIndex: index,
        currentChapter: chapter,
        isPlaying: true,
        progress: 0,
      });
    }
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  nextChapter: () => {
    const { currentBook, chapterIndex } = get();
    if (!currentBook?.audioChapters) return;
    if (chapterIndex < currentBook.audioChapters.length - 1) {
      get().playChapter(chapterIndex + 1);
    }
  },

  prevChapter: () => {
    const { currentBook, chapterIndex } = get();
    if (!currentBook?.audioChapters) return;
    if (chapterIndex > 0) {
      get().playChapter(chapterIndex - 1);
    }
  },

  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setVolume: (volume) => set({ volume }),
  closePlayer: () => set({ currentBook: null, currentChapter: null, isPlaying: false, progress: 0 }),
}));
