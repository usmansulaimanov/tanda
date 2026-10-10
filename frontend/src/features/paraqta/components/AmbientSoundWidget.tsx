import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
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

  const {
    isSoundActive,
    getSoundVolume,
    toggleSound,
    setSoundVolume,
  } = useAmbientSoundStore();

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm transition-all">
      {/* Sounds Compact List */}
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/60">
        {sounds.map((sound: AmbientSound) => {
          const isActive = isSoundActive(sound.id);
          const soundVol = getSoundVolume(sound.id);

          return (
            <div
              key={sound.id}
              className={`py-2 px-1.5 transition-colors flex items-center justify-between gap-3 ${
                isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {/* Left: Icon + Title */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {getSoundIcon(sound.icon)}
                </div>
                <span
                  className={`text-sm font-semibold truncate transition-colors ${
                    isActive
                      ? 'text-[#D97706] dark:text-orange-400 font-bold'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {sound.name}
                </span>
              </div>

              {/* Right: Volume Slider (When active) + Switch Toggle */}
              <div className="flex items-center gap-3 shrink-0">
                {isActive && (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200">
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
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : soundVol < 0.5 ? (
                        <Volume1 className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={soundVol}
                      onChange={(e) => setSoundVolume(sound.id, parseFloat(e.target.value))}
                      className="w-24 sm:w-36 md:w-44 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#F08000]"
                    />

                    <span className="text-[11px] font-mono font-bold text-orange-600 dark:text-orange-400 min-w-[32px] text-right shrink-0">
                      {Math.round(soundVol * 100)}%
                    </span>
                  </div>
                )}

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => toggleSound(sound)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? 'bg-[#F08000]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={isActive}
                  title={isActive ? `${sound.name} өшіру` : `${sound.name} қосу`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-4' : 'translate-x-0'
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
