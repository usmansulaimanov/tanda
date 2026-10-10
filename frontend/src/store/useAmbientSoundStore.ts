import { create } from 'zustand';
import { AmbientSound } from '../shared/api/ambientSound.api';
import { formatAudioUrl } from '../utils/mediaUtils';

interface AmbientSoundState {
  currentSound: AmbientSound | null;
  isPlaying: boolean;
  volume: number; // 0 to 1
  setVolume: (volume: number) => void;
  selectAndPlaySound: (sound: AmbientSound) => void;
  togglePlay: () => void;
  stopSound: () => void;
}

let globalAudio: HTMLAudioElement | null = null;

const getAudio = () => {
  if (typeof window === 'undefined') return null;
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.loop = true;
  }
  return globalAudio;
};

export const useAmbientSoundStore = create<AmbientSoundState>((set, get) => ({
  currentSound: null,
  isPlaying: false,
  volume: 0.6,

  setVolume: (volume: number) => {
    const safeVol = Math.max(0, Math.min(1, volume));
    set({ volume: safeVol });
    const audio = getAudio();
    if (audio) {
      audio.volume = safeVol;
    }
  },

  selectAndPlaySound: (sound: AmbientSound) => {
    const current = get().currentSound;
    const isPlaying = get().isPlaying;
    const audio = getAudio();

    if (!audio) return;

    // If same sound clicked while playing, toggle pause
    if (current?.id === sound.id) {
      if (isPlaying) {
        audio.pause();
        set({ isPlaying: false });
      } else {
        audio.play().catch(console.error);
        set({ isPlaying: true });
      }
      return;
    }

    // Switch sound
    audio.src = formatAudioUrl(sound.audioUrl);
    audio.volume = get().volume;
    audio.play().catch(console.error);
    set({ currentSound: sound, isPlaying: true });
  },

  togglePlay: () => {
    const { currentSound, isPlaying } = get();
    const audio = getAudio();
    if (!audio || !currentSound) return;

    if (isPlaying) {
      audio.pause();
      set({ isPlaying: false });
    } else {
      audio.play().catch(console.error);
      set({ isPlaying: true });
    }
  },

  stopSound: () => {
    const audio = getAudio();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    set({ currentSound: null, isPlaying: false });
  },
}));
