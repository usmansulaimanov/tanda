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
  Play,
  Pause,
  Square,
  Sparkles,
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

  const { currentSound, isPlaying, volume, setVolume, selectAndPlaySound, togglePlay, stopSound } =
    useAmbientSoundStore();

  if (isLoading && sounds.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
          <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
          <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (sounds.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
          <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-[#F08000] flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <span>Оқу атмосферасы</span>
          {isPlaying && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Ойнауда
            </span>
          )}
        </div>

        {currentSound && (
          <button
            type="button"
            onClick={stopSound}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
            title="Дыбысты тоқтату"
          >
            <Square className="w-3 h-3 fill-current" /> Өшіру
          </button>
        )}
      </div>

      {/* Sounds Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sounds.map((sound: AmbientSound) => {
          const isSelected = currentSound?.id === sound.id;
          const isSoundPlaying = isSelected && isPlaying;

          return (
            <button
              key={sound.id}
              type="button"
              onClick={() => selectAndPlaySound(sound)}
              className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none text-left border ${
                isSelected
                  ? 'bg-gradient-to-r from-orange-500/15 to-amber-500/15 text-[#F08000] border-orange-500/40 shadow-sm shadow-orange-500/10'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {getSoundIcon(sound.icon)}
              </div>
              <span className="truncate flex-1">{sound.name}</span>
              {isSelected && (
                <div className="shrink-0 text-orange-500">
                  {isSoundPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Volume Slider Controls (When a sound is selected) */}
      {currentSound && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3 animate-fadeIn">
          <button
            type="button"
            onClick={() => setVolume(volume === 0 ? 0.6 : 0)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title={volume === 0 ? 'Дыбысты қосу' : 'Дыбысты басу'}
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#F08000]"
          />

          <span className="text-[11px] font-mono font-bold text-slate-400 w-8 text-right shrink-0">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};
