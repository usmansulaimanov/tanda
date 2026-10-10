import { create } from 'zustand';
import { AmbientSound } from '../shared/api/ambientSound.api';
import { formatAudioUrl } from '../utils/mediaUtils';

interface ActiveSoundInfo {
  sound: AmbientSound;
  volume: number; // 0 to 1
}

interface AmbientSoundState {
  activeSounds: Record<number, ActiveSoundInfo>; // soundId -> info
  activeSoundIds: number[];
  
  toggleSound: (sound: AmbientSound) => void;
  setSoundVolume: (soundId: number, volume: number) => void;
  isSoundActive: (soundId: number) => boolean;
  getSoundVolume: (soundId: number) => number;
  stopSound: (soundId: number) => void;
  stopAll: () => void;
}

// Global audio elements cache per sound ID
const audioInstances = new Map<number, HTMLAudioElement>();

const getOrCreateAudio = (sound: AmbientSound, volume: number) => {
  if (typeof window === 'undefined') return null;

  let audio = audioInstances.get(sound.id);
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audioInstances.set(sound.id, audio);
  }

  const resolvedSrc = formatAudioUrl(sound.audioUrl);
  if (audio.src !== resolvedSrc) {
    audio.src = resolvedSrc;
  }
  audio.volume = Math.max(0, Math.min(1, volume));
  return audio;
};

export const useAmbientSoundStore = create<AmbientSoundState>((set, get) => ({
  activeSounds: {},
  activeSoundIds: [],

  isSoundActive: (soundId: number) => {
    return Boolean(get().activeSounds[soundId]);
  },

  getSoundVolume: (soundId: number) => {
    return get().activeSounds[soundId]?.volume ?? 0.6;
  },

  toggleSound: (sound: AmbientSound) => {
    const { activeSounds } = get();
    const isActive = Boolean(activeSounds[sound.id]);

    if (isActive) {
      // Stop and remove this sound
      const audio = audioInstances.get(sound.id);
      if (audio) {
        audio.pause();
      }

      const nextActive = { ...activeSounds };
      delete nextActive[sound.id];

      set({
        activeSounds: nextActive,
        activeSoundIds: Object.keys(nextActive).map(Number),
      });
    } else {
      // Start this sound
      const defaultVol = 0.6;
      const audio = getOrCreateAudio(sound, defaultVol);
      if (audio) {
        audio.play().catch((err) => {
          console.error(`Error playing ambient sound ${sound.name}:`, err);
        });
      }

      const nextActive = {
        ...activeSounds,
        [sound.id]: {
          sound,
          volume: defaultVol,
        },
      };

      set({
        activeSounds: nextActive,
        activeSoundIds: Object.keys(nextActive).map(Number),
      });
    }
  },

  setSoundVolume: (soundId: number, volume: number) => {
    const safeVol = Math.max(0, Math.min(1, volume));
    const { activeSounds } = get();
    const current = activeSounds[soundId];

    if (current) {
      const audio = audioInstances.get(soundId);
      if (audio) {
        audio.volume = safeVol;
      }

      set({
        activeSounds: {
          ...activeSounds,
          [soundId]: {
            ...current,
            volume: safeVol,
          },
        },
      });
    }
  },

  stopSound: (soundId: number) => {
    const audio = audioInstances.get(soundId);
    if (audio) {
      audio.pause();
    }

    const { activeSounds } = get();
    const nextActive = { ...activeSounds };
    delete nextActive[soundId];

    set({
      activeSounds: nextActive,
      activeSoundIds: Object.keys(nextActive).map(Number),
    });
  },

  stopAll: () => {
    audioInstances.forEach((audio) => {
      audio.pause();
    });

    set({
      activeSounds: {},
      activeSoundIds: [],
    });
  },
}));
