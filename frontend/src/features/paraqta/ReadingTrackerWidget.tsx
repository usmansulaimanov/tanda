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
} from 'lucide-react';
import { paraqtaApi, ReadingGroup, ReadingSessionRequest } from '../../shared/api/paraqta.api';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { formatDurationHMS } from './ParaqtaPage';

// Play pleasant web audio chime
export const playChimeSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);
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

  const [mode, setMode] = useState<'STOPWATCH' | 'TIMER'>('STOPWATCH');
  const [timerDuration, setTimerDuration] = useState<number>(30 * 60);
  const [customMinutes, setCustomMinutes] = useState<string>('30');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30 * 60);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [selectedBookTitle, setSelectedBookTitle] = useState<string>('');
  const [customBookTitle, setCustomBookTitle] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(fixedGroupId || '');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);
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

  // Restore active session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tanda_active_reading_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startTime && parsed.isRunning) {
          // If in a fixed group page, only load if it matches or allow syncing
          const now = Date.now();
          const runningElapsed = Math.floor((now - parsed.startTime) / 1000);
          setMode(parsed.mode || 'STOPWATCH');
          setSelectedBookTitle(parsed.bookTitle || '');
          if (!fixedGroupId) {
            setSelectedGroupId(parsed.groupId || '');
          }
          setSessionStartTime(parsed.startTime);
          setIsRunning(true);
          setIsPaused(false);

          if (parsed.mode === 'TIMER') {
            const target = parsed.timerDuration || 1800;
            setTimerDuration(target);
            const left = Math.max(0, target - runningElapsed);
            setRemainingSeconds(left);
            setElapsedSeconds(runningElapsed);
          } else {
            setElapsedSeconds(runningElapsed);
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore session', e);
    }
  }, [fixedGroupId]);

  // Persist session to localStorage
  useEffect(() => {
    if (isRunning && sessionStartTime) {
      localStorage.setItem(
        'tanda_active_reading_session',
        JSON.stringify({
          startTime: sessionStartTime,
          mode,
          timerDuration,
          bookTitle: selectedBookTitle || customBookTitle,
          groupId: fixedGroupId || selectedGroupId,
          isRunning: true,
        })
      );
    } else {
      localStorage.removeItem('tanda_active_reading_session');
    }
  }, [isRunning, sessionStartTime, mode, timerDuration, selectedBookTitle, customBookTitle, selectedGroupId, fixedGroupId]);

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
    let interval: any = null;

    if (isRunning && !isPaused && sessionStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const totalSec = Math.floor((now - sessionStartTime) / 1000);

        if (mode === 'STOPWATCH') {
          setElapsedSeconds(totalSec);

          if (totalSec > 0 && totalSec % 1800 === 0) {
            triggerNotification('Оқуды жалғастырасыз ба?', '30 минут өтті. Өте керемет нәтиже! Жалғастырамыз ба?');
            setShowReminderModal(true);
          }
        } else {
          const left = timerDuration - totalSec;
          if (left <= 0) {
            setRemainingSeconds(0);
            setElapsedSeconds(timerDuration);
            setIsRunning(false);
            if (soundEnabled) playChimeSound();
            triggerNotification('Таймер аяқталды! ⏰', 'Бүгінгі оқу сессияңыз сәтті аяқталды! Нәтижеңіз сақталды.');
            handleStopSession(timerDuration);
          } else {
            setRemainingSeconds(left);
            setElapsedSeconds(totalSec);
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, sessionStartTime, mode, timerDuration, soundEnabled]);

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

      const mins = Math.round(res.durationSeconds / 60);
      const msg = (fixedGroupId || selectedGroupId)
        ? `+${mins} минут жеке парақшаңызға және топ рейтингіне қосылды! 🎉`
        : `+${mins} минут оқу уақытыңызға қосылды! 🎉`;

      showToast(msg);
      if (onSessionSaved) {
        onSessionSaved(res.durationSeconds);
      }
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Сессияны сақтау кезінде қате кетті', 'error');
    },
  });

  const handleStartSession = () => {
    const now = Date.now();
    setSessionStartTime(now);
    setIsRunning(true);
    setIsPaused(false);
    if (mode === 'TIMER') {
      const duration = parseInt(customMinutes, 10) * 60 || 1800;
      setTimerDuration(duration);
      setRemainingSeconds(duration);
    }
  };

  const handlePauseSession = () => {
    setIsPaused(!isPaused);
  };

  const handleStopSession = (forcedDuration?: number) => {
    if (!sessionStartTime) return;
    const now = Date.now();
    const finalSeconds = forcedDuration || Math.floor((now - sessionStartTime) / 1000);

    if (finalSeconds < 5) {
      showToast('Оқу сессиясы тым қысқа (5 секундтан аз), сақталмады', 'error');
      handleResetSession();
      return;
    }

    const payload: ReadingSessionRequest = {
      durationSeconds: finalSeconds,
      sessionType: mode,
      bookTitle: (selectedBookTitle || customBookTitle).trim() || undefined,
      groupId: (fixedGroupId || selectedGroupId) || undefined,
      startedAt: new Date(sessionStartTime).toISOString(),
      endedAt: new Date(now).toISOString(),
    };

    saveSessionMutation.mutate(payload);
    handleResetSession();
  };

  const handleResetSession = () => {
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setSessionStartTime(null);
    localStorage.removeItem('tanda_active_reading_session');
    if (mode === 'TIMER') {
      setRemainingSeconds(timerDuration);
    }
  };

  const displayTime = mode === 'STOPWATCH' ? formatDurationHMS(elapsedSeconds) : formatDurationHMS(remainingSeconds);

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
        <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
          {mode === 'STOPWATCH' ? 'Өткен уақыт' : 'Қалған уақыт'}
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
                setRemainingSeconds(mins * 60);
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
              placeholder="Мысалы: Абай жолы немесе Қағаз кітап"
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
            className="px-7 py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" /> Оқуды бастау
          </button>
        ) : (
          <>
            <button
              onClick={handlePauseSession}
              className={`px-6 py-4 rounded-2xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all ${
                isPaused
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Жалғастыру' : 'Үзіліс'}
            </button>

            <button
              onClick={() => handleStopSession()}
              disabled={saveSessionMutation.isPending}
              className="px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
              {saveSessionMutation.isPending ? 'Сақталуда...' : 'Аяқтау'}
            </button>
          </>
        )}

        {(isRunning || elapsedSeconds > 0) && (
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
    </div>
  );
};
