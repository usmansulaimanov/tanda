import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  Square,
  Timer,
  Clock,
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Users,
  AlertCircle,
} from 'lucide-react';
import { paraqtaApi, ReadingGroup, ReadingSessionRequest } from '../../shared/api/paraqta.api';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { useReadingTrackerStore } from '../../store/useReadingTrackerStore';
import { useAmbientSoundStore } from '../../store/useAmbientSoundStore';
import { formatDurationHMS } from './ParaqtaPage';

// Play pleasant 3-tone focus chime (C5 -> E5 -> G5)
export const playChimeSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.22;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.9);
    });
  } catch (e) {
    console.error('Audio play error', e);
  }
};

interface ReadingTrackerWidgetProps {
  fixedGroupId?: string;
  fixedGroupName?: string;
  onSessionSaved?: (durationSeconds: number) => void;
}

export const ReadingTrackerWidget: React.FC<ReadingTrackerWidgetProps> = ({
  fixedGroupId,
  fixedGroupName,
  onSessionSaved,
}) => {
  const queryClient = useQueryClient();
  const { currentShelf } = useMyBooksStore();
  const myShelfBooks = Object.values(currentShelf);

  const {
    mode,
    timerDuration,
    customMinutes,
    isRunning,
    isPaused,
    accumulatedSeconds,
    segmentStartTime,
    sessionInitialStartTime,
    selectedBookTitle,
    customBookTitle,
    selectedGroupId,
    soundEnabled,
    setMode,
    setTimerDuration,
    setCustomMinutes,
    setSelectedBookTitle,
    setCustomBookTitle,
    setSelectedGroupId,
    setSoundEnabled,
    startSession,
    pauseSession,
    resumeSession,
    togglePause,
    resetSession,
  } = useReadingTrackerStore();

  const [currentElapsed, setCurrentElapsed] = useState<number>(0);
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);
  const [showOverrideConfirmModal, setShowOverrideConfirmModal] = useState<boolean>(false);
  const [pendingOverrideInfo, setPendingOverrideInfo] = useState<{ isGroup: boolean; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; type: 'success' | 'error' } | null>(null);

  const showToast = (title: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const { data: myGroups = [] } = useQuery<ReadingGroup[]>({
    queryKey: ['myReadingGroups'],
    queryFn: paraqtaApi.getMyGroups,
    enabled: !fixedGroupId,
  });

  const triggerNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        console.error('Notification error', e);
      }
    }
  };

  // Main Ticker
  useEffect(() => {
    if (!isRunning) {
      setCurrentElapsed(0);
      return;
    }

    const updateTime = () => {
      if (isPaused || !segmentStartTime) {
        setCurrentElapsed(accumulatedSeconds);
      } else {
        const now = Date.now();
        const currentSegmentSec = Math.max(0, Math.floor((now - segmentStartTime) / 1000));
        const totalSec = accumulatedSeconds + currentSegmentSec;
        setCurrentElapsed(totalSec);

        if (mode === 'STOPWATCH') {
          // 1-hour automatic stop limit (3600 seconds)
          if (totalSec >= 3600) {
            if (soundEnabled) playChimeSound();
            try {
              useAmbientSoundStore.getState().stopAll();
            } catch (e) {}
            triggerNotification('1 сағаттық оқу уақыты аяқталды! ⏰', '1 сағат оқыдыңыз. Оқу сессиясы сәтті аяқталып сақталды.');
            showToast('1 сағаттық оқу уақыты аяқталды! Сессия сақталды.', 'success');
            handleStopSession(3600);
            return;
          }

          if (totalSec > 0 && totalSec % 1800 === 0) {
            triggerNotification('Оқуды жалғастырасыз ба?', '30 минут өтті. Өте керемет нәтиже! Жалғастырамыз ба?');
            setShowReminderModal(true);
          }
        } else {
          const left = timerDuration - totalSec;
          if (left <= 0) {
            if (soundEnabled) playChimeSound();
            triggerNotification('Таймер аяқталды! ⏰', 'Бүгінгі оқу сессияңыз сәтті аяқталды! Нәтижеңіз сақталды.');
            handleStopSession(timerDuration);
          }
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isPaused, segmentStartTime, accumulatedSeconds, mode, timerDuration, soundEnabled]);

  const saveSessionMutation = useMutation({
    mutationFn: paraqtaApi.saveSession,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['readingStats'] });
      queryClient.invalidateQueries({ queryKey: ['myReadingGroups'] });
      if (fixedGroupId) {
        queryClient.invalidateQueries({ queryKey: ['readingGroupDetail', fixedGroupId] });
      } else if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ['readingGroupDetail', selectedGroupId] });
      }

      if (onSessionSaved) {
        onSessionSaved(res.durationSeconds);
      }
      resetSession();
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Сессияны сақтау кезінде қате кетті', 'error');
      resetSession();
    },
  });

  const handleStartSession = () => {
    if (isRunning) {
      const currentTargetGroupId = fixedGroupId || selectedGroupId || '';
      const activeGroup = fixedGroupId || selectedGroupId || '';
      if (activeGroup !== currentTargetGroupId) {
        setPendingOverrideInfo({
          isGroup: Boolean(activeGroup),
          name: fixedGroupName || (myGroups.find((g) => g.id === selectedGroupId)?.name) || 'Басқа оқу',
        });
        setShowOverrideConfirmModal(true);
        return;
      }
    }

    startSessionInternal();
  };

  const startSessionInternal = () => {
    const duration = mode === 'TIMER' ? (parseInt(customMinutes, 10) * 60 || 1800) : 1800;
    startSession({
      mode,
      timerDuration: duration,
      customMinutes,
      selectedBookTitle,
      customBookTitle,
      selectedGroupId: fixedGroupId || selectedGroupId || '',
      fixedGroupId,
      fixedGroupName,
      soundEnabled,
    });
  };

  const handleConfirmOverride = () => {
    setShowOverrideConfirmModal(false);
    setPendingOverrideInfo(null);
    startSessionInternal();
  };

  const handleStopSession = (forcedDuration?: number) => {
    const now = Date.now();
    let finalSeconds: number;
    if (forcedDuration !== undefined) {
      finalSeconds = forcedDuration;
    } else if (isPaused) {
      finalSeconds = accumulatedSeconds;
    } else if (segmentStartTime) {
      finalSeconds = accumulatedSeconds + Math.max(0, Math.floor((now - segmentStartTime) / 1000));
    } else {
      finalSeconds = accumulatedSeconds;
    }

    if (finalSeconds < 10) {
      resetSession();
      return;
    }

    const payload: ReadingSessionRequest = {
      durationSeconds: finalSeconds,
      sessionType: mode,
      bookTitle: (selectedBookTitle || customBookTitle).trim() || undefined,
      groupId: (fixedGroupId || selectedGroupId) || undefined,
      startedAt: new Date(sessionInitialStartTime || now - finalSeconds * 1000).toISOString(),
      endedAt: new Date(now).toISOString(),
    };

    saveSessionMutation.mutate(payload);
  };

  const handleResetSession = () => {
    resetSession();
  };

  const displayTime =
    mode === 'STOPWATCH'
      ? formatDurationHMS(currentElapsed)
      : formatDurationHMS(Math.max(0, timerDuration - currentElapsed));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-md relative overflow-hidden flex flex-col items-center text-center">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all transform animate-slideDown ${
            toastMessage.type === 'success'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
              : 'bg-gradient-to-r from-rose-600 to-red-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{toastMessage.title}</span>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl sm:rounded-2xl mb-5">
        <button
          disabled={isRunning}
          onClick={() => setMode('STOPWATCH')}
          className={`px-5 py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all ${
            mode === 'STOPWATCH'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Секундомер
        </button>
        <button
          disabled={isRunning}
          onClick={() => setMode('TIMER')}
          className={`px-5 py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all ${
            mode === 'TIMER'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Таймер
        </button>
      </div>

      {/* Digital Clock Display (Stays in exact same position) */}
      <div className="my-2 sm:my-3 relative">
        <div className="text-5xl sm:text-6xl md:text-7xl font-mono font-black tracking-wider text-slate-900 dark:text-white select-none">
          {displayTime}
        </div>
      </div>

      {/* Timer Presets Slot (Fixed height to prevent widget resizing/jumping) */}
      <div className="h-9 flex items-center justify-center gap-2 my-2">
        {mode === 'TIMER' && !isRunning ? (
          [15, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                setCustomMinutes(String(mins));
                setTimerDuration(mins * 60);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                parseInt(customMinutes, 10) === mins
                  ? 'border-[#F08000] bg-orange-500/10 text-[#F08000]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-500/50'
              }`}
            >
              {mins} мин
            </button>
          ))
        ) : (
          <div className="h-7" />
        )}
      </div>

      {/* Book & Group Selector Config */}
      <div className="w-full max-w-xl my-4 sm:my-5 space-y-3 text-left">
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
            Оқып жатқан кітабыңыз:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              disabled={isRunning}
              placeholder="Абай жолы"
              value={customBookTitle}
              onChange={(e) => {
                setCustomBookTitle(e.target.value);
                setSelectedBookTitle('');
              }}
              className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#F08000]"
            />
            {myShelfBooks && myShelfBooks.length > 0 && (
              <select
                disabled={isRunning}
                value={selectedBookTitle}
                onChange={(e) => {
                  setSelectedBookTitle(e.target.value);
                  setCustomBookTitle(e.target.value);
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F08000]"
              >
                <option value="">Сөреден...</option>
                {myShelfBooks.map((b: any) => (
                  <option key={b.id} value={b.title}>
                    {b.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Group Dropdown (only when not inside a fixed group page) */}
        {!fixedGroupId && myGroups.length > 0 && (
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Топтық жарысқа қосу:
            </label>
            <select
              disabled={isRunning}
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#F08000]"
            >
              <option value="">Жеке оқу</option>
              {myGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  👥 {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3">
        {!isRunning ? (
          <button
            onClick={handleStartSession}
            className="px-7 py-4 rounded-2xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer min-w-[170px]"
          >
            <Play className="w-5 h-5 fill-current" /> Оқуды бастау
          </button>
        ) : (
          <>
            <button
              onClick={togglePause}
              className={`py-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer w-40 sm:w-44 select-none ${
                isPaused
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
              <span>{isPaused ? 'Жалғастыру' : 'Үзіліс'}</span>
            </button>

            <button
              onClick={() => handleStopSession()}
              disabled={saveSessionMutation.isPending}
              className="py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer w-36 sm:w-40 select-none"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>{saveSessionMutation.isPending ? 'Сақталуда...' : 'Аяқтау'}</span>
            </button>
          </>
        )}

        {(isRunning || currentElapsed > 0) && (
          <button
            onClick={handleResetSession}
            className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Басынан бастау"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-4 rounded-2xl border transition-colors ${
            soundEnabled
              ? 'border-orange-500/30 bg-orange-500/10 text-[#F08000]'
              : 'border-slate-200 dark:border-slate-700 text-slate-400'
          }`}
          title={soundEnabled ? 'Дыбыс қосулы' : 'Дыбыс сөндірулі'}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* 30-min Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto mb-4 text-3xl">
              ⏳
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">30 минут оқыдыңыз!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Өте керемет қарқын! Кішкене демалып аласыз ба әлде оқуды жалғастырасыз ба?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  handleStopSession();
                }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                Аяқтау және сақтау
              </button>
              <button
                onClick={() => setShowReminderModal(false)}
                className="flex-1 py-3 bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Жалғастыру
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Confirmation Modal */}
      {showOverrideConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Оқу сессиясын ауыстыру
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Қазір басқа оқу сессиясы жүріп жатыр
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Сізде қазір <strong className="text-amber-700 dark:text-amber-400">{pendingOverrideInfo?.isGroup ? `«${pendingOverrideInfo.name}» тобында` : '«Жеке оқу» режимінде'}</strong> белсенді секундомер жүріп жатыр.
              <br /><br />
              Жаңадан <strong className="text-slate-900 dark:text-white">{fixedGroupName ? `«${fixedGroupName}» тобында` : 'жаңа сессияны'}</strong> бастасаңыз, алдыңғы секундомер тоқтатылады және уақыт осы жаңа сессияға есептеледі.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowOverrideConfirmModal(false);
                  setPendingOverrideInfo(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={handleConfirmOverride}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 cursor-pointer"
              >
                Иә, осы жерде бастау
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
