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
  Square,
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

  const {
    activeSounds,
    activeSoundIds,
    isSoundActive,
    getSoundVolume,
    toggleSound,
    setSoundVolume,
    stopAll,
  } = useAmbientSoundStore();

  const playingCount = activeSoundIds.length;

  if (isLoading && sounds.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm animate-pulse space-y-3">
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-2"></div>
        <div className="space-y-2.5">
          <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
          <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
          <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (sounds.length === 0) {
    return null;
  }

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
              Бірнеше дыбысты бір уақытта қосып тыңдауға болады
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {playingCount > 0 && (
            <>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {playingCount === 1
                  ? `${activeSounds[activeSoundIds[0]]?.sound.name} ойнауда`
                  : `${playingCount} дыбыс ойнауда`}
              </span>

              <button
                type="button"
                onClick={stopAll}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
                title="Барлық дыбыстарды өшіру"
              >
                <Square className="w-3 h-3 fill-current" /> Барлығын өшіру
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sounds 1-Column Vertical List */}
      <div className="flex flex-col gap-2.5">
        {sounds.map((sound: AmbientSound) => {
          const isActive = isSoundActive(sound.id);
          const soundVol = getSoundVolume(sound.id);

          return (
            <div
              key={sound.id}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isActive
                  ? 'bg-orange-50/70 dark:bg-orange-950/25 border-orange-300 dark:border-orange-800/80 shadow-sm shadow-orange-500/5'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Left: Icon + Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
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
                  className={`text-sm font-bold truncate transition-colors ${
                    isActive
                      ? 'text-[#D97706] dark:text-orange-400'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {sound.name}
                </span>
              </div>

              {/* Right: Volume Slider (When active) + Switch Toggle */}
              <div className="flex items-center gap-3 shrink-0">
                {isActive && (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800/60 shadow-sm">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSoundVolume(sound.id, soundVol === 0 ? 0.6 : 0);
                      }}
                      className="text-orange-500 hover:text-orange-600 transition-colors p-0.5"
                      title={soundVol === 0 ? 'Дыбысты қосу' : 'Дыбысты басу'}
                    >
                      {soundVol === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : soundVol < 0.5 ? (
                        <Volume1 className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={soundVol}
                      onChange={(e) => setSoundVolume(sound.id, parseFloat(e.target.value))}
                      className="w-20 sm:w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#F08000]"
                    />

                    <span className="text-[11px] font-mono font-bold text-orange-600 dark:text-orange-400 min-w-[30px] text-right shrink-0">
                      {Math.round(soundVol * 100)}%
                    </span>
                  </div>
                )}

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => toggleSound(sound)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? 'bg-[#F08000]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={isActive}
                  title={isActive ? `${sound.name} өшіру` : `${sound.name} қосу`}
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
