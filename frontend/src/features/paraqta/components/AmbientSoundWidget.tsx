import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Headphones,
  Waves,
  CloudRain,
  Flame,
  Trees,
  Moon,
  Coffee,
  Wind,
  Volume2,
  VolumeX,
  Volume1,
} from 'lucide-react';
import { ambientSoundApi, AmbientSound } from '../../../shared/api/ambientSound.api';
import { useAmbientSoundStore } from '../../../store/useAmbientSoundStore';

const getSoundIcon = (iconName?: string) => {
  switch (iconName?.toLowerCase()) {
    case 'cloudrain':
    case 'rain':
      return <CloudRain className="w-4 h-4" />;
    case 'flame':
    case 'fire':
      return <Flame className="w-4 h-4" />;
    case 'trees':
    case 'forest':
      return <Trees className="w-4 h-4" />;
    case 'moon':
    case 'night':
      return <Moon className="w-4 h-4" />;
    case 'coffee':
      return <Coffee className="w-4 h-4" />;
    case 'wind':
      return <Wind className="w-4 h-4" />;
    case 'waves':
    case 'water':
    case 'sea':
    default:
      return <Waves className="w-4 h-4" />;
  }
};

export const AmbientSoundWidget: React.FC = () => {
  const { data: sounds = [], isLoading } = useQuery({
    queryKey: ['ambientSounds'],
    queryFn: ambientSoundApi.getActiveSounds,
    staleTime: 5 * 60 * 1000,
  });

  const { currentSound, isPlaying, volume, setVolume, selectAndPlaySound, stopSound } =
    useAmbientSoundStore();

  if (isLoading && sounds.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm animate-pulse space-y-3">
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-2"></div>
        <div className="space-y-2">
          <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
          <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (sounds.length === 0) {
    return null;
  }

  const handleToggle = (sound: AmbientSound) => {
    if (currentSound?.id === sound.id && isPlaying) {
      stopSound();
    } else {
      selectAndPlaySound(sound);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-[#F08000] flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-none">
              Оқу атмосферасы
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Кітап оқуға арналған фокустық дыбыстар
            </p>
          </div>
        </div>

        {isPlaying && currentSound && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {currentSound.name} ойнауда
          </span>
        )}
      </div>

      {/* Sounds List with Switch & Volume Slider */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {sounds.map((sound: AmbientSound) => {
          const isActive = currentSound?.id === sound.id && isPlaying;

          return (
            <div
              key={sound.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isActive
                  ? 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/60 shadow-sm shadow-orange-500/5'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Left: Icon + Title */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-gradient-to-tr from-[#F08000] to-orange-400 text-white shadow-sm shadow-orange-500/20'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {getSoundIcon(sound.icon)}
                </div>
                <span
                  className={`text-xs font-bold truncate transition-colors ${
                    isActive
                      ? 'text-[#D97706] dark:text-orange-400'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {sound.name}
                </span>
              </div>

              {/* Right: Volume Slider (if active) + Toggle Switch */}
              <div className="flex items-center gap-2.5 shrink-0">
                {isActive && (
                  <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200 bg-white/90 dark:bg-slate-900/90 px-2 py-1 rounded-xl border border-orange-200 dark:border-orange-800/60">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVolume(volume === 0 ? 0.6 : 0);
                      }}
                      className="text-orange-500 hover:text-orange-600 transition-colors p-0.5"
                      title={volume === 0 ? 'Дыбысты қосу' : 'Дыбысты басу'}
                    >
                      {volume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#F08000]"
                    />

                    <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 w-6 text-right shrink-0">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                )}

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleToggle(sound)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? 'bg-[#F08000]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={isActive}
                  title={isActive ? 'Өшіру' : 'Қосу'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
