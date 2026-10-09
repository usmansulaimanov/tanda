import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Square,
  Timer,
  Clock,
  Users,
  Plus,
  Compass,
  Trophy,
  Flame,
  Volume2,
  VolumeX,
  Share2,
  CheckCircle2,
  XCircle,
  Settings2,
  BookOpen,
  ArrowRight,
  Search,
  Crown,
  Bell,
  Sparkles,
} from 'lucide-react';
import { paraqtaApi, ReadingGroup, ReadingGroupInvitation, UserReadingStats, UserSearchResult } from '../../shared/api/paraqta.api';
import { useAuthStore } from '../../store/useAuthStore';
import { premiumApi } from '../../shared/api/premium.api';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { useBookStore } from '../../store/useBookStore';
import { Skeleton } from '../../shared/ui';

// Utility to format seconds to "X сағ Y мин Z сек" or "00:00:00"
export const formatDurationHMS = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatDurationHuman = (totalSeconds: number): string => {
  if (totalSeconds < 60) return `${totalSeconds} сек`;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m} мин`;
  return `${h} сағ ${m} мин`;
};

export const renderDurationWithSubSeconds = (totalSeconds: number, isAccent = false) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  let mainText = '0 мин';
  if (h > 0) {
    mainText = `${h} сағ ${m} мин`;
  } else if (m > 0) {
    mainText = `${m} мин`;
  }

  return (
    <div>
      <div className={`text-xl sm:text-2xl font-extrabold leading-tight ${isAccent ? 'text-[#F08000]' : 'text-slate-900 dark:text-white'}`}>
        {mainText}
      </div>
      <div className={`text-xs font-bold mt-0.5 ${isAccent ? 'text-orange-500/80' : 'text-slate-400 dark:text-slate-500'}`}>
        {s} сек
      </div>
    </div>
  );
};

// Play pleasant web audio chime
const playChimeSound = () => {
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

export const ParaqtaPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { currentShelf } = useMyBooksStore();
  const { books: catalogBooks } = useBookStore();
  const myShelfBooks = Object.values(currentShelf);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'tracker' | 'groups' | 'explore'>('tracker');

  // --- Tracker State ---
  const [mode, setMode] = useState<'STOPWATCH' | 'TIMER'>('STOPWATCH');
  const [timerDuration, setTimerDuration] = useState<number>(30 * 60); // 30 mins
  const [customMinutes, setCustomMinutes] = useState<string>('30');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30 * 60);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [selectedBookTitle, setSelectedBookTitle] = useState<string>('');
  const [customBookTitle, setCustomBookTitle] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; type: 'success' | 'error' } | null>(null);

  // Group creation modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [groupDesc, setGroupDesc] = useState<string>('');
  const [groupIsPublic, setGroupIsPublic] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedInvitees, setSelectedInvitees] = useState<UserSearchResult[]>([]);

  // Request browser notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Restore active session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tanda_active_reading_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startTime && parsed.isRunning) {
          const now = Date.now();
          const runningElapsed = Math.floor((now - parsed.startTime) / 1000);
          setMode(parsed.mode || 'STOPWATCH');
          setSelectedBookTitle(parsed.bookTitle || '');
          setSelectedGroupId(parsed.groupId || '');
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
  }, []);

  // Save session state to localStorage
  useEffect(() => {
    if (isRunning && sessionStartTime) {
      localStorage.setItem(
        'tanda_active_reading_session',
        JSON.stringify({
          startTime: sessionStartTime,
          mode,
          timerDuration,
          bookTitle: selectedBookTitle || customBookTitle,
          groupId: selectedGroupId,
          isRunning: true,
        })
      );
    } else {
      localStorage.removeItem('tanda_active_reading_session');
    }
  }, [isRunning, sessionStartTime, mode, timerDuration, selectedBookTitle, customBookTitle, selectedGroupId]);

  // Main Timer / Stopwatch Ticker
  useEffect(() => {
    let interval: any = null;

    if (isRunning && !isPaused && sessionStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const totalSec = Math.floor((now - sessionStartTime) / 1000);

        if (mode === 'STOPWATCH') {
          setElapsedSeconds(totalSec);

          // 30 minute periodic reminder
          if (totalSec > 0 && totalSec % 1800 === 0) {
            triggerNotification('Оқуды жалғастырасыз ба?', '30 минут өтті. Өте керемет нәтиже! Жалғастырамыз ба?');
            setShowReminderModal(true);
          }
        } else {
          // TIMER Mode
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

  const triggerNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.error('Notification error', e);
      }
    }
  };

  const showToast = (title: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: stats, refetch: refetchStats } = useQuery<UserReadingStats>({
    queryKey: ['readingStats'],
    queryFn: paraqtaApi.getStats,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const { data: premiumStatus } = useQuery({
    queryKey: ['myPremiumStatus'],
    queryFn: () => premiumApi.getPremiumStatus(),
    enabled: isAuthenticated,
  });
  const isPremium = Boolean(premiumStatus?.isPremium);

  const { data: myGroups = [], refetch: refetchMyGroups } = useQuery<ReadingGroup[]>({
    queryKey: ['myReadingGroups'],
    queryFn: paraqtaApi.getMyGroups,
    enabled: isAuthenticated,
  });

  const { data: invitations = [], refetch: refetchInvitations } = useQuery<ReadingGroupInvitation[]>({
    queryKey: ['myGroupInvitations'],
    queryFn: paraqtaApi.getMyInvitations,
    enabled: isAuthenticated,
  });

  const [exploreQuery, setExploreQuery] = useState('');
  const { data: publicGroupsData } = useQuery({
    queryKey: ['publicGroups', exploreQuery],
    queryFn: () => paraqtaApi.getPublicGroups(exploreQuery),
    enabled: activeTab === 'explore',
  });

  // User search query for group invites
  const { data: searchResults = [] } = useQuery({
    queryKey: ['searchUsersForGroup', userSearchQuery],
    queryFn: () => paraqtaApi.searchUsers(userSearchQuery),
    enabled: userSearchQuery.trim().length >= 2,
  });

  // Mutations
  const saveSessionMutation = useMutation({
    mutationFn: paraqtaApi.saveSession,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['readingStats'] });
      queryClient.invalidateQueries({ queryKey: ['myReadingGroups'] });
      showToast(`+${Math.round(res.durationSeconds / 60)} минут оқу уақытыңызға қосылды! 🎉`);
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Сессияны сақтау кезінде қате кетті', 'error');
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: paraqtaApi.createGroup,
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['myReadingGroups'] });
      setShowCreateModal(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedInvitees([]);
      showToast(`"${newGroup.name}" тобы сәтті құрылды!`);
      navigate(`/paraqta/groups/${newGroup.id}`);
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Топ құру мүмкін болмады', 'error');
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: paraqtaApi.acceptInvitation,
    onSuccess: (group) => {
      refetchInvitations();
      refetchMyGroups();
      showToast(`Сіз "${group.name}" тобына қосылдыңыз!`);
      navigate(`/paraqta/groups/${group.id}`);
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Шақыруды қабылдау мүмкін болмады', 'error');
    },
  });

  const rejectInviteMutation = useMutation({
    mutationFn: paraqtaApi.rejectInvitation,
    onSuccess: () => {
      refetchInvitations();
      showToast('Шақырудан бас тартылды');
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: paraqtaApi.joinGroup,
    onSuccess: (group) => {
      refetchMyGroups();
      showToast(`"${group.name}" тобына қосылдыңыз!`);
      navigate(`/paraqta/groups/${group.id}`);
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Қосылу сәтсіз аяқталды', 'error');
    },
  });

  const toggleInviteSettingMutation = useMutation({
    mutationFn: (val: boolean) => paraqtaApi.updateInviteSetting(val),
    onSuccess: (res) => {
      refetchStats();
      showToast(res.allowGroupInvites ? 'Топтық шақырулар қосылды' : 'Топтық шақырулар өшірілді');
    },
  });

  // Start / Pause / Stop Handlers
  const handleStartSession = () => {
    const now = Date.now();
    setSessionStartTime(now);
    setIsRunning(true);
    setIsPaused(false);
    if (mode === 'TIMER') {
      const dur = parseInt(customMinutes, 10) * 60 || 1800;
      setTimerDuration(dur);
      setRemainingSeconds(dur);
    }
  };

  const handlePauseSession = () => {
    setIsPaused(!isPaused);
  };

  const handleStopSession = (overrideDuration?: number) => {
    if (!sessionStartTime) return;
    const now = Date.now();
    const finalDuration = overrideDuration !== undefined ? overrideDuration : elapsedSeconds;

    if (finalDuration >= 10) {
      const startedAt = new Date(sessionStartTime).toISOString();
      const endedAt = new Date(now).toISOString();

      saveSessionMutation.mutate({
        groupId: selectedGroupId || undefined,
        bookTitle: selectedBookTitle || customBookTitle || 'Кітап оқу',
        sessionType: mode,
        durationSeconds: finalDuration,
        startedAt,
        endedAt,
      });
    } else {
      showToast('10 секундтан аз сессиялар есепке алынбайды', 'error');
    }

    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setSessionStartTime(null);
    localStorage.removeItem('tanda_active_reading_session');
  };

  const displayTime = mode === 'STOPWATCH' ? formatDurationHMS(elapsedSeconds) : formatDurationHMS(remainingSeconds);

  return (
    <div className="min-h-screen pb-24 max-w-5xl mx-auto px-4 sm:px-6 pt-6 animate-fadeIn">
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

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-amber-600/10 border border-orange-500/20 rounded-3xl p-6 md:p-8 mb-8 backdrop-blur-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-[#F08000] text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Парақта &bull; Оқу кеңістігі
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Оқу уақытын қадағалаңыз & Достармен жарысыңыз
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base mt-2 max-w-2xl">
              Қағаз, электронды немесе аудиокітап оқу уақытын тіркеңіз. Топ құрып, достарыңызбен бірге кітап оқу әдетін қалыптастырыңыз!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Топ ашу
            </button>
          </div>
        </div>
      </div>

      {/* Pending Invitations Banner */}
      {invitations.length > 0 && (
        <div className="mb-8 p-5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-orange-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-orange-500/30 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                Сізге {invitations.length} топтық шақырту келді!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                «{invitations[0].groupName}» тобына шақырту жіберілді
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => acceptInviteMutation.mutate(invitations[0].token)}
              disabled={acceptInviteMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Қабылдау
            </button>
            <button
              onClick={() => rejectInviteMutation.mutate(invitations[0].token)}
              disabled={rejectInviteMutation.isPending}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Бас тарту
            </button>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl mb-8 border border-slate-200 dark:border-slate-700/60">
        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'tracker'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-md shadow-black/5 dark:shadow-black/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Timer className="w-4 h-4" /> Оқу таймері
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'groups'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-md shadow-black/5 dark:shadow-black/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Менің топтарым {myGroups.length > 0 && `(${myGroups.length})`}
        </button>

        <button
          onClick={() => setActiveTab('explore')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'explore'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-md shadow-black/5 dark:shadow-black/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Compass className="w-4 h-4" /> Ашық топтар
        </button>
      </div>

      {/* ===================== TAB 1: TRACKER ===================== */}
      {activeTab === 'tracker' && (
        <div className="space-y-8 animate-fadeIn">
          {/* User Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Бүгін
              </div>
              {renderDurationWithSubSeconds(stats?.todayReadingSeconds || 0)}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" /> Осы аптада
              </div>
              {renderDurationWithSubSeconds(stats?.weekReadingSeconds || 0)}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-yellow-500" /> Осы айда
              </div>
              {renderDurationWithSubSeconds(stats?.monthReadingSeconds || 0)}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm bg-gradient-to-br from-orange-500/5 to-amber-500/10">
              <div className="text-xs font-semibold text-[#F08000] mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F08000]" /> Жалпы оқыған
              </div>
              {renderDurationWithSubSeconds(stats?.totalReadingSeconds || 0, true)}
            </div>
          </div>

          {/* Main Stopwatch / Timer Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden flex flex-col items-center text-center">
            {/* Mode Switcher */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8">
              <button
                disabled={isRunning}
                onClick={() => setMode('STOPWATCH')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === 'STOPWATCH'
                    ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Секундомер
              </button>
              <button
                disabled={isRunning}
                onClick={() => setMode('TIMER')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === 'TIMER'
                    ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Таймер
              </button>
            </div>

            {/* Timer Presets */}
            {mode === 'TIMER' && !isRunning && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8 animate-fadeIn">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setCustomMinutes(String(mins));
                      setTimerDuration(mins * 60);
                      setRemainingSeconds(mins * 60);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      parseInt(customMinutes, 10) === mins
                        ? 'border-[#F08000] bg-orange-500/10 text-[#F08000]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-500/50'
                    }`}
                  >
                    {mins} мин
                  </button>
                ))}
              </div>
            )}

            {/* Big Digital Clock Display */}
            <div className="my-4 relative">
              <div className="text-6xl sm:text-8xl font-mono font-black tracking-wider text-slate-900 dark:text-white select-none">
                {displayTime}
              </div>
              <div className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
                {mode === 'STOPWATCH' ? 'Өткен уақыт' : 'Қалған уақыт'}
              </div>
            </div>

            {/* Book & Group Selector Config */}
            <div className="w-full max-w-md my-6 space-y-3 text-left">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Оқып жатқан кітабыңыз (міндетті емес):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled={isRunning}
                    placeholder="Мысалы: Абай жолы, 1-том немесе Қағаз кітап"
                    value={customBookTitle}
                    onChange={(e) => {
                      setCustomBookTitle(e.target.value);
                      setSelectedBookTitle('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F08000]"
                  />
                  {myShelfBooks && myShelfBooks.length > 0 && (
                    <select
                      disabled={isRunning}
                      value={selectedBookTitle}
                      onChange={(e) => {
                        setSelectedBookTitle(e.target.value);
                        setCustomBookTitle(e.target.value);
                      }}
                      className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F08000]"
                    >
                      <option value="">Сөреден таңдау...</option>
                      {myShelfBooks.map((b: any) => (
                        <option key={b.id} value={b.title}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {myGroups.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Топтық жарысқа қосу (міндетті емес):
                  </label>
                  <select
                    disabled={isRunning}
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F08000]"
                  >
                    <option value="">Жеке оқу (Топсыз)</option>
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
            <div className="flex items-center gap-4 mt-4">
              {!isRunning ? (
                <button
                  onClick={handleStartSession}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
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
                    <Square className="w-4 h-4 fill-current" /> Аяқтау & Сақтау
                  </button>
                </>
              )}

              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Дыбысты өшіру' : 'Дыбысты қосу'}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-[#F08000]" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: MY GROUPS ===================== */}
      {activeTab === 'groups' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Privacy Toggle & Limit info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-orange-500" /> Топтық шақырулар баптауы
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Басқа оқырмандар сізді жаңа топтарға шақыра ала ма?
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={stats?.allowGroupInvites ?? true}
                  onChange={(e) => toggleInviteSettingMutation.mutate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F08000]"></div>
              </label>
            </div>
          </div>

          {/* Groups List */}
          {myGroups.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
              <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-[#F08000] flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Сізде әлі оқу топтары жоқ</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 mb-6">
                Достарыңызбен жарысу үшін жаңа топ құрыңыз немесе «Ашық топтар» бөлімінен қауымдастыққа қосылыңыз!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-sm shadow-md"
              >
                + Жаңа топ құру
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myGroups.map((group) => (
                <Link
                  to={`/paraqta/groups/${group.id}`}
                  key={group.id}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-orange-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/20 shrink-0">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {group.memberCount} / {group.maxMembers} адам
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#F08000] transition-colors">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                    <div className="text-slate-500 dark:text-slate-400">
                      Осы айдағы нәтижеңіз: <span className="text-[#F08000] font-bold">{formatDurationHuman(group.myMonthlySeconds)}</span>
                    </div>
                    <div className="text-orange-500 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                      Толығырақ <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: EXPLORE PUBLIC GROUPS ===================== */}
      {activeTab === 'explore' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ашық топтарды іздеу..."
              value={exploreQuery}
              onChange={(e) => setExploreQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F08000]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publicGroupsData?.content?.map((group) => (
              <div
                key={group.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600">
                      Ашық &bull; {group.memberCount} мүше
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{group.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {group.description || 'Жалпы оқырмандарға арналған ашық клуб.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Құрушы: {group.creatorName || 'Оқырман'}</span>
                  {group.isMember ? (
                    <Link
                      to={`/paraqta/groups/${group.id}`}
                      className="px-4 py-2 rounded-xl bg-orange-500/10 text-[#F08000] font-bold text-xs hover:bg-orange-500/20 transition-colors"
                    >
                      Кіру &rarr;
                    </Link>
                  ) : (
                    <button
                      onClick={() => joinGroupMutation.mutate(group.id)}
                      disabled={joinGroupMutation.isPending}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      Қосылу
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== CREATE GROUP MODAL ===================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Жаңа оқу тобын құру</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {isPremium
                ? '⭐ Премиум тариф: 10 топқа дейін, әр топқа 50 адам шақыра аласыз.'
                : '🔹 Қарапайым тариф: 3 топқа дейін, әр топқа 5 адам шақыра аласыз.'}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!groupName.trim()) return;
                createGroupMutation.mutate({
                  name: groupName,
                  description: groupDesc,
                  isPublic: groupIsPublic,
                  inviteeEmails: selectedInvitees.map((u) => u.email),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Топтың атауы *</label>
                <input
                  type="text"
                  required
                  placeholder="Мысалы: «Абай жолын оқушылар»"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#F08000] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Сипаттамасы</label>
                <textarea
                  rows={2}
                  placeholder="Бұл топтың мақсаты мен оқу ережелері..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#F08000] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="publicGroup"
                  checked={groupIsPublic}
                  onChange={(e) => setGroupIsPublic(e.target.checked)}
                  className="w-4 h-4 text-[#F08000] rounded focus:ring-orange-500"
                />
                <label htmlFor="publicGroup" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Барлық оқырмандарға ашық топ (Каталогта көрінеді)
                </label>
              </div>

              {/* Autocomplete User Invitation */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Оқырмандарды шақыру (Почтасы немесе атымен іздеу):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Мысалы: asylkhan@gmail.com"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#F08000] focus:outline-none"
                  />
                  {searchResults.length > 0 && userSearchQuery.trim().length >= 2 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                      {searchResults.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            if (!selectedInvitees.find((item) => item.id === u.id)) {
                              setSelectedInvitees([...selectedInvitees, u]);
                            }
                            setUserSearchQuery('');
                          }}
                          className="px-4 py-2 hover:bg-orange-500/10 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>{' '}
                            <span className="text-slate-400">({u.email})</span>
                          </div>
                          {!u.allowGroupInvites && <span className="text-rose-500 text-[10px]">Шақыру жабық</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Invitees Badges */}
                {selectedInvitees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedInvitees.map((u) => (
                      <span
                        key={u.id}
                        className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-[#F08000] rounded-full text-xs font-bold flex items-center gap-1.5"
                      >
                        {u.name}
                        <button
                          type="button"
                          onClick={() => setSelectedInvitees(selectedInvitees.filter((i) => i.id !== u.id))}
                          className="hover:text-rose-600"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Болдырмау
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs shadow-md"
                >
                  {createGroupMutation.isPending ? 'Құрылуда...' : 'Топты құру'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== 30-MIN REMINDER MODAL ===================== */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-[#F08000] flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">30 минут оқыдыңыз! 👏</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-6">
              Өте жақсы қарқын! Оқу сессиясын ары қарай жалғастырасыз ба?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  handleStopSession();
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Тоқтату
              </button>
              <button
                onClick={() => setShowReminderModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#F08000] text-white font-bold text-xs shadow-md"
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
