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
const FADE_IN_DURATION_MS = 3000; // 3 seconds smooth fade-in

// Global audio elements cache per sound ID
const audioInstances = new Map<number, HTMLAudioElement>();
// Global animation frame IDs per sound ID
const fadeFrameIds = new Map<number, number>();
// Global 'playing' listener callbacks per sound ID to cancel if toggled off before playback starts
const playingListeners = new Map<number, () => void>();

const cancelActiveFade = (soundId: number) => {
  // Cancel animation frame if running
  const frameId = fadeFrameIds.get(soundId);
  if (frameId !== undefined) {
    cancelAnimationFrame(frameId);
    fadeFrameIds.delete(soundId);
  }

  // Remove playing listener if pending
  const listener = playingListeners.get(soundId);
  const audio = audioInstances.get(soundId);
  if (listener && audio) {
    audio.removeEventListener('playing', listener);
    playingListeners.delete(soundId);
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

    cancelActiveFade(sound.id);

    if (isActive) {
      // Stop and reset this sound immediately
      const audio = audioInstances.get(sound.id);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
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
        audio.volume = 0; // strictly mute at start
        audio.loop = true;

        const targetVol = DEFAULT_VOLUME;

        // Function that executes the smooth 3-second fade-in once playback actually begins
        const startSmoothFadeIn = () => {
          playingListeners.delete(sound.id);
          const startTime = performance.now();

          const animateFade = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, Math.max(0, elapsed / FADE_IN_DURATION_MS));
            const currentVol = targetVol * progress;

            if (audio) {
              audio.volume = currentVol;
            }

            if (progress < 1) {
              fadeFrameIds.set(sound.id, requestAnimationFrame(animateFade));
            } else {
              fadeFrameIds.delete(sound.id);
              if (audio) {
                audio.volume = targetVol;
              }
            }
          };

          fadeFrameIds.set(sound.id, requestAnimationFrame(animateFade));
        };

        // Attach listener for 'playing' event so fade-in starts only when sound actually begins streaming
        const onPlaying = () => {
          audio.removeEventListener('playing', onPlaying);
          startSmoothFadeIn();
        };

        playingListeners.set(sound.id, onPlaying);
        audio.addEventListener('playing', onPlaying);

        audio.play().catch((err) => {
          console.error(`Error playing ambient sound ${sound.name}:`, err);
        });
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
    cancelActiveFade(soundId);
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
    cancelActiveFade(soundId);
    const audio = audioInstances.get(soundId);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
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
    audioInstances.forEach((_, soundId) => {
      cancelActiveFade(soundId);
    });

    audioInstances.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
    });

    set({
      activeSounds: {},
      activeSoundIds: [],
    });
  },
}));
