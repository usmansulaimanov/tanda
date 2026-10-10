import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Pause, Square, ExternalLink, Flame, Timer } from 'lucide-react';
import { useReadingTrackerStore } from '../../store/useReadingTrackerStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paraqtaApi, ReadingSessionRequest } from '../../shared/api/paraqta.api';

const formatDurationHMS = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
};

export const FloatingReadingTracker: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBook } = useAudioPlayerStore();

  const {
    isRunning,
    isPaused,
    mode,
    timerDuration,
    accumulatedSeconds,
    segmentStartTime,
    sessionInitialStartTime,
    selectedBookTitle,
    customBookTitle,
    selectedGroupId,
    fixedGroupId,
    fixedGroupName,
    togglePause,
    resetSession,
  } = useReadingTrackerStore();

  const [currentElapsed, setCurrentElapsed] = useState<number>(0);

  // Live ticking counter
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
        const seg = Math.max(0, Math.floor((now - segmentStartTime) / 1000));
        setCurrentElapsed(accumulatedSeconds + seg);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isPaused, segmentStartTime, accumulatedSeconds]);

  const saveSessionMutation = useMutation({
    mutationFn: paraqtaApi.saveSession,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['readingStats'] });
      queryClient.invalidateQueries({ queryKey: ['myReadingGroups'] });
      const targetGroupId = fixedGroupId || selectedGroupId;
      if (targetGroupId) {
        queryClient.invalidateQueries({ queryKey: ['readingGroupDetail', targetGroupId] });
      }
      resetSession();
    },
    onError: () => {
      resetSession();
    },
  });

  // Determine if full reading tracker is already on current page
  const isParaqtaRoot = location.pathname === '/paraqta' || location.pathname === '/paraqta/';
  const isGroupPage = location.pathname.startsWith('/paraqta/groups/');
  const isTrackerVisibleOnPage = isParaqtaRoot || isGroupPage;

  if (!isRunning || isTrackerVisibleOnPage) {
    return null;
  }

  const bookName = (selectedBookTitle || customBookTitle).trim();
  const displayLabel = bookName || fixedGroupName || (selectedGroupId ? 'Топтық оқу' : 'Жеке оқу');

  const displayTime =
    mode === 'STOPWATCH'
      ? formatDurationHMS(currentElapsed)
      : formatDurationHMS(Math.max(0, timerDuration - currentElapsed));

  const handleStopAndSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const finalSeconds = currentElapsed;

    if (finalSeconds < 10) {
      resetSession();
      return;
    }

    const payload: ReadingSessionRequest = {
      durationSeconds: finalSeconds,
      sessionType: mode,
      bookTitle: bookName || undefined,
      groupId: (fixedGroupId || selectedGroupId) || undefined,
      startedAt: new Date(sessionInitialStartTime || now - finalSeconds * 1000).toISOString(),
      endedAt: new Date(now).toISOString(),
    };

    saveSessionMutation.mutate(payload);
  };

  const handleNavigateToTracker = () => {
    const targetGroupId = fixedGroupId || selectedGroupId;
    if (targetGroupId) {
      navigate(`/paraqta/groups/${targetGroupId}`);
    } else {
      navigate('/paraqta');
    }
  };

  // Adjust bottom offset depending on whether AudioPlayerBar or MobileNav is visible
  const bottomClass = currentBook
    ? 'bottom-36 md:bottom-24'
    : 'bottom-20 md:bottom-6';

  return (
    <div
      onClick={handleNavigateToTracker}
      className={`fixed ${bottomClass} right-4 sm:right-6 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white shadow-2xl rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-slate-700/80 hover:border-orange-500/50 flex items-center gap-3 sm:gap-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-slideUp`}
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#F08000] flex items-center justify-center shrink-0 shadow-inner">
        {mode === 'TIMER' ? (
          <Timer className="w-5 h-5 text-amber-400 animate-pulse" />
        ) : (
          <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
        )}
      </div>

      {/* Info & Timer */}
      <div className="min-w-0 pr-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base sm:text-lg font-black tracking-wider text-white">
            {displayTime}
          </span>
          {isPaused && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase">
              Үзіліс
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-[200px] flex items-center gap-1">
          <span className="truncate">{displayLabel}</span>
          <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={togglePause}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all shadow-md active:scale-90 cursor-pointer ${
            isPaused
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30'
          }`}
          title={isPaused ? 'Жалғастыру' : 'Үзіліс'}
        >
          {isPaused ? <Play className="w-4 h-4 fill-current ml-0.5" /> : <Pause className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleStopAndSave}
          disabled={saveSessionMutation.isPending}
          className="w-9 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all shadow-md shadow-rose-600/30 active:scale-90 cursor-pointer"
          title="Аяқтау және сақтау"
        >
          <Square className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
};
