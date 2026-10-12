import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  resumeActiveSounds: () => void;
}

const DEFAULT_VOLUME = 0.4;
const FADE_IN_DURATION_MS = 3000; // 3 seconds smooth fade-in

// Global audio elements cache per sound ID
const audioInstances = new Map<number, HTMLAudioElement>();
// Global GainNodes and MediaElementAudioSourceNodes for Web Audio API (iOS / mobile volume control)
const gainNodes = new Map<number, GainNode>();
const sourceNodes = new Map<number, MediaElementAudioSourceNode>();
// Global AudioContext singleton
let sharedAudioContext: AudioContext | null = null;

// Global animation frame IDs per sound ID
const fadeFrameIds = new Map<number, number>();
// Global 'playing' listener callbacks per sound ID to cancel if toggled off before playback starts
const playingListeners = new Map<number, () => void>();

const getOrCreateAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new AudioCtx();
    } catch (e) {
      console.warn('Failed to create AudioContext for ambient sounds:', e);
      return null;
    }
  }

  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }

  return sharedAudioContext;
};

const setupGainNode = (soundId: number, audio: HTMLAudioElement): GainNode | null => {
  const existingGain = gainNodes.get(soundId);
  if (existingGain) return existingGain;

  const ctx = getOrCreateAudioContext();
  if (!ctx) return null;

  try {
    let source = sourceNodes.get(soundId);
    if (!source) {
      source = ctx.createMediaElementSource(audio);
      sourceNodes.set(soundId, source);
    }
    const gainNode = ctx.createGain();
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNodes.set(soundId, gainNode);
    return gainNode;
  } catch (err) {
    console.warn(`Web Audio API could not be connected for ambient sound ${soundId}:`, err);
    return null;
  }
};

const applySoundVolume = (soundId: number, audio: HTMLAudioElement, volume: number) => {
  const safeVol = Math.max(0, Math.min(1, volume));
  const gainNode = gainNodes.get(soundId) ?? setupGainNode(soundId, audio);

  if (gainNode) {
    const ctx = getOrCreateAudioContext();
    if (ctx) {
      gainNode.gain.setValueAtTime(safeVol, ctx.currentTime);
    } else {
      gainNode.gain.value = safeVol;
    }
    // Keep HTMLAudioElement volume at 1.0 so GainNode exclusively controls the amplitude
    audio.volume = 1;
  } else {
    // Graceful fallback for environments where Web Audio API is unavailable
    audio.volume = safeVol;
  }
};

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
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audioInstances.set(sound.id, audio);
  }

  const resolvedSrc = formatAudioUrl(sound.audioUrl);
  if (audio.src !== resolvedSrc) {
    audio.src = resolvedSrc;
  }
  audio.crossOrigin = 'anonymous';
  audio.loop = true;
  return audio;
};

export const useAmbientSoundStore = create<AmbientSoundState>()(
  persist(
    (set, get) => ({
      activeSounds: {},
      activeSoundIds: [],

      isSoundActive: (soundId: number) => {
        return Boolean(get().activeSounds[soundId]);
      },

      getSoundVolume: (soundId: number) => {
        return get().activeSounds[soundId]?.volume ?? DEFAULT_VOLUME;
      },

      resumeActiveSounds: () => {
        if (typeof window === 'undefined') return;
        const { activeSounds } = get();
        Object.values(activeSounds).forEach(({ sound, volume }) => {
          const audio = getOrCreateAudio(sound);
          if (audio) {
            setupGainNode(sound.id, audio);
            applySoundVolume(sound.id, audio, volume);
            audio.loop = true;
            if (audio.paused) {
              audio.play().catch(() => {
                // Browser autoplay policy handler: resume on first user interaction
                const resumeOnInteraction = () => {
                  window.removeEventListener('click', resumeOnInteraction);
                  window.removeEventListener('touchstart', resumeOnInteraction);
                  window.removeEventListener('keydown', resumeOnInteraction);
                  const ctx = getOrCreateAudioContext();
                  if (ctx && ctx.state === 'suspended') {
                    ctx.resume().catch(() => {});
                  }
                  audio.play().catch(() => {});
                };
                window.addEventListener('click', resumeOnInteraction, { once: true });
                window.addEventListener('touchstart', resumeOnInteraction, { once: true });
                window.addEventListener('keydown', resumeOnInteraction, { once: true });
              });
            }
          }
        });
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
            applySoundVolume(sound.id, audio, 0);
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
            const ctx = getOrCreateAudioContext();
            if (ctx && ctx.state === 'suspended') {
              ctx.resume().catch(() => {});
            }

            setupGainNode(sound.id, audio);
            applySoundVolume(sound.id, audio, 0); // strictly mute at start

            audio.currentTime = 0;
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
                  applySoundVolume(sound.id, audio, currentVol);
                }

                if (progress < 1) {
                  fadeFrameIds.set(sound.id, requestAnimationFrame(animateFade));
                } else {
                  fadeFrameIds.delete(sound.id);
                  if (audio) {
                    applySoundVolume(sound.id, audio, targetVol);
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
            applySoundVolume(soundId, audio, safeVol);
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
          applySoundVolume(soundId, audio, 0);
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
        audioInstances.forEach((audio, soundId) => {
          cancelActiveFade(soundId);
          audio.pause();
          audio.currentTime = 0;
          applySoundVolume(soundId, audio, 0);
        });

        set({
          activeSounds: {},
          activeSoundIds: [],
        });
      },
    }),
    {
      name: 'tanda_ambient_sounds',
      partialize: (state) => ({
        activeSounds: state.activeSounds,
        activeSoundIds: state.activeSoundIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.resumeActiveSounds();
        }
      },
    }
  )
);
