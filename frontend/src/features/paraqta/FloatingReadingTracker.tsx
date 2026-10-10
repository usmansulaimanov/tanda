import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Pause, Square, ExternalLink, Flame, Timer, X, GripVertical } from 'lucide-react';
import { useReadingTrackerStore } from '../../store/useReadingTrackerStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useAmbientSoundStore } from '../../store/useAmbientSoundStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paraqtaApi, ReadingSessionRequest } from '../../shared/api/paraqta.api';
import { playChimeSound } from './ReadingTrackerWidget';

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

const POSITION_STORAGE_KEY = 'tanda_floating_tracker_pos';

const getInitialPosition = (): { x: number; y: number } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      const safeX = Math.min(Math.max(8, parsed.x), Math.max(8, window.innerWidth - 60));
      const safeY = Math.min(Math.max(8, parsed.y), Math.max(8, window.innerHeight - 60));
      return { x: safeX, y: safeY };
    }
  } catch (e) {
    // Ignore invalid JSON
  }
  return null;
};

export const FloatingReadingTracker: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBook } = useAudioPlayerStore();

  const {
    isRunning,
    isPaused,
    isFloatingDismissed,
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
    setFloatingDismissed,
  } = useReadingTrackerStore();

  const [currentElapsed, setCurrentElapsed] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(getInitialPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const latestPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedSignificantlyRef = useRef<boolean>(false);

  // Bounds adjustment on mount
  useEffect(() => {
    if (position && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      const safeX = Math.min(Math.max(8, position.x), Math.max(8, maxX));
      const safeY = Math.min(Math.max(8, position.y), Math.max(8, maxY));
      if (safeX !== position.x || safeY !== position.y) {
        const adjusted = { x: safeX, y: safeY };
        setPosition(adjusted);
        try {
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(adjusted));
        } catch (e) {}
      }
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev || !cardRef.current) return prev;
        const rect = cardRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 8;
        const maxY = window.innerHeight - rect.height - 8;
        const safeX = Math.min(Math.max(8, prev.x), Math.max(8, maxX));
        const safeY = Math.min(Math.max(8, prev.y), Math.max(8, maxY));
        if (safeX !== prev.x || safeY !== prev.y) {
          const adjusted = { x: safeX, y: safeY };
          try {
            localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(adjusted));
          } catch (e) {}
          return adjusted;
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        const totalSec = accumulatedSeconds + seg;
        setCurrentElapsed(totalSec);

        // 1-hour automatic stop limit for stopwatch (3600 seconds)
        if (mode === 'STOPWATCH' && totalSec >= 3600) {
          playChimeSound();
          try {
            useAmbientSoundStore.getState().stopAll();
          } catch (e) {}
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('1 сағаттық оқу уақыты аяқталды! ⏰', {
                body: '1 сағат өтті. Оқу сессиясы сәтті аяқталып сақталды.',
                icon: '/favicon.ico',
              });
            } catch (e) {}
          }
          const payload: ReadingSessionRequest = {
            durationSeconds: 3600,
            sessionType: mode,
            bookTitle: (selectedBookTitle || customBookTitle).trim() || undefined,
            groupId: (fixedGroupId || selectedGroupId) || undefined,
            startedAt: new Date(sessionInitialStartTime || now - 3600 * 1000).toISOString(),
            endedAt: new Date(now).toISOString(),
          };
          saveSessionMutation.mutate(payload);
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isPaused, segmentStartTime, accumulatedSeconds]);

  // Determine if full reading tracker is already on current page
  const isParaqtaRoot = location.pathname === '/paraqta' || location.pathname === '/paraqta/';
  const isGroupPage = location.pathname.startsWith('/paraqta/groups/');
  const isTrackerVisibleOnPage = isParaqtaRoot || isGroupPage;

  // Whenever user visits /paraqta or group page, reset dismissed status so it shows next time they leave
  useEffect(() => {
    if (isTrackerVisibleOnPage && isFloatingDismissed) {
      setFloatingDismissed(false);
    }
  }, [isTrackerVisibleOnPage, isFloatingDismissed, setFloatingDismissed]);

  const saveSessionMutation = useMutation({
    mutationFn: paraqtaApi.saveSession,
    onSuccess: () => {
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

  // Drag listeners
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current || !cardRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.startX;
      const deltaY = clientY - dragStartRef.current.startY;

      if (Math.hypot(deltaX, deltaY) > 5) {
        hasMovedSignificantlyRef.current = true;
      }

      const rect = cardRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;

      const newX = Math.min(Math.max(8, dragStartRef.current.initialX + deltaX), maxX);
      const newY = Math.min(Math.max(8, dragStartRef.current.initialY + deltaY), maxY);

      const newPos = { x: newX, y: newY };
      setPosition(newPos);
      latestPosRef.current = newPos;
    };

    const handlePointerUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setIsDragging(false);
        if (hasMovedSignificantlyRef.current && latestPosRef.current) {
          try {
            localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(latestPosRef.current));
          } catch (e) {
            console.error('Failed to save floating tracker position', e);
          }
        }
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, []);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!cardRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = cardRef.current.getBoundingClientRect();
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: rect.left,
      initialY: rect.top,
    };
    hasMovedSignificantlyRef.current = false;
    setIsDragging(true);
  };

  if (!isRunning || isTrackerVisibleOnPage || isFloatingDismissed) {
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

  const handleCardClick = (e: React.MouseEvent) => {
    if (hasMovedSignificantlyRef.current) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const targetGroupId = fixedGroupId || selectedGroupId;
    if (targetGroupId) {
      navigate(`/paraqta/groups/${targetGroupId}`);
    } else {
      navigate('/paraqta');
    }
  };

  const handleCloseDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFloatingDismissed(true);
  };

  const inlineStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        maxWidth: 'calc(100vw - 1rem)',
        touchAction: 'none',
      }
    : {
        maxWidth: 'calc(100vw - 1rem)',
      };

  const defaultPositionClasses = position
    ? ''
    : `fixed ${currentBook ? 'bottom-36 md:bottom-24' : 'bottom-20 md:bottom-6'} right-4 sm:right-6`;

  return (
    <div
      ref={cardRef}
      style={inlineStyle}
      onClick={handleCardClick}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      className={`${defaultPositionClasses} z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white shadow-xl hover:shadow-2xl rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 pr-2.5 border border-slate-200/90 dark:border-slate-800 hover:border-orange-500/50 flex items-center gap-2.5 sm:gap-3.5 cursor-grab active:cursor-grabbing select-none transition-shadow ${
        isDragging ? 'scale-[1.02] shadow-orange-500/20 shadow-2xl opacity-95' : 'animate-slideUp'
      }`}
    >
      {/* Drag Grip Indicator */}
      <div className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center shrink-0 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Icon */}
      <div className="flex items-center justify-center shrink-0">
        {mode === 'TIMER' ? (
          <Timer className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 animate-pulse" />
        ) : (
          <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 animate-pulse" />
        )}
      </div>

      {/* Info & Timer */}
      <div className="min-w-0 pr-1 text-left pointer-events-none">
        <div className="font-mono text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white">
          {displayTime}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[110px] sm:max-w-[160px] flex items-center gap-1">
          <span className="truncate">{displayLabel}</span>
          <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
        </div>
      </div>

      {/* Quick Controls & Close button */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePause();
          }}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-sm ${
            isPaused
              ? 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-600/30'
              : 'hover:bg-amber-500 hover:text-white hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/30'
          }`}
          title={isPaused ? 'Жалғастыру' : 'Үзіліс'}
        >
          {isPaused ? <Play className="w-4 h-4 fill-current ml-0.5" /> : <Pause className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleStopAndSave}
          disabled={saveSessionMutation.isPending}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md hover:shadow-rose-600/30 flex items-center justify-center transition-all shadow-sm active:scale-90 cursor-pointer"
          title="Аяқтау және сақтау"
        >
          <Square className="w-4 h-4 fill-current" />
        </button>

        {/* Close (X) Dismiss button */}
        <button
          type="button"
          onClick={handleCloseDismiss}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 hover:bg-rose-500 text-slate-400 hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white border border-slate-200/90 dark:border-slate-700 hover:border-rose-500 flex items-center justify-center transition-all cursor-pointer ml-0.5 shadow-sm"
          title="Терезені жабу (оқу тоқтатылмайды)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
