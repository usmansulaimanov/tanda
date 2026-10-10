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

const DEFAULT_VOLUME = 0.4;
const FADE_IN_DURATION_MS = 3000;
const FADE_INTERVAL_MS = 50;

// Global audio elements cache per sound ID
const audioInstances = new Map<number, HTMLAudioElement>();
// Global fade timer interval IDs per sound ID
const fadeTimers = new Map<number, number>();

const clearFadeTimer = (soundId: number) => {
  const timer = fadeTimers.get(soundId);
  if (timer !== undefined) {
    window.clearInterval(timer);
    fadeTimers.delete(soundId);
  }
};

const getOrCreateAudio = (sound: AmbientSound) => {
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
  audio.loop = true;
  return audio;
};

export const useAmbientSoundStore = create<AmbientSoundState>((set, get) => ({
  activeSounds: {},
  activeSoundIds: [],

  isSoundActive: (soundId: number) => {
    return Boolean(get().activeSounds[soundId]);
  },

  getSoundVolume: (soundId: number) => {
    return get().activeSounds[soundId]?.volume ?? DEFAULT_VOLUME;
  },

  toggleSound: (sound: AmbientSound) => {
    const { activeSounds } = get();
    const isActive = Boolean(activeSounds[sound.id]);

    clearFadeTimer(sound.id);

    if (isActive) {
      // Stop and reset this sound immediately
      const audio = audioInstances.get(sound.id);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      const nextActive = { ...activeSounds };
      delete nextActive[sound.id];

      set({
        activeSounds: nextActive,
        activeSoundIds: Object.keys(nextActive).map(Number),
      });
    } else {
      // Start this sound from the beginning with smooth 3s fade-in (0% -> 40%)
      const audio = getOrCreateAudio(sound);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = 0;
        audio.loop = true;
        
        audio.play().catch((err) => {
          console.error(`Error playing ambient sound ${sound.name}:`, err);
        });

        // 3-second smooth fade-in ramp
        const targetVol = DEFAULT_VOLUME;
        const totalSteps = Math.max(1, Math.round(FADE_IN_DURATION_MS / FADE_INTERVAL_MS));
        const stepIncrement = targetVol / totalSteps;
        let currentVol = 0;

        const timer = window.setInterval(() => {
          currentVol = Math.min(targetVol, currentVol + stepIncrement);
          if (audio) {
            audio.volume = currentVol;
          }
          if (currentVol >= targetVol) {
            clearFadeTimer(sound.id);
            if (audio) {
              audio.volume = targetVol;
            }
          }
        }, FADE_INTERVAL_MS);

        fadeTimers.set(sound.id, timer);
      }

      const nextActive = {
        ...activeSounds,
        [sound.id]: {
          sound,
          volume: DEFAULT_VOLUME,
        },
      };

      set({
        activeSounds: nextActive,
        activeSoundIds: Object.keys(nextActive).map(Number),
      });
    }
  },

  setSoundVolume: (soundId: number, volume: number) => {
    clearFadeTimer(soundId);
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
    clearFadeTimer(soundId);
    const audio = audioInstances.get(soundId);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
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
    fadeTimers.forEach((timer) => window.clearInterval(timer));
    fadeTimers.clear();

    audioInstances.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    set({
      activeSounds: {},
      activeSoundIds: [],
    });
  },
}));
