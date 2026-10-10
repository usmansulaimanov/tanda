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
  Bell,
  Sparkles,
  Mail,
  X,
} from 'lucide-react';
import { paraqtaApi, ReadingGroup, ReadingGroupInvitation, UserReadingStats, UserSearchResult } from '../../shared/api/paraqta.api';
import { useAuthStore } from '../../store/useAuthStore';
import { premiumApi } from '../../shared/api/premium.api';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { useBookStore } from '../../store/useBookStore';
import { Skeleton } from '../../shared/ui';
import { ReadingTrackerWidget } from './ReadingTrackerWidget';
import { AmbientSoundWidget } from './components/AmbientSoundWidget';

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
      <div className={`text-base sm:text-xl font-extrabold leading-tight ${isAccent ? 'text-[#F08000]' : 'text-slate-900 dark:text-white'}`}>
        {mainText}
      </div>
      <div className={`text-[9px] sm:text-[11px] font-bold ${isAccent ? 'text-orange-500/80' : 'text-slate-400 dark:text-slate-500'}`}>
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

  const [toastMessage, setToastMessage] = useState<{ title: string; type: 'success' | 'error' } | null>(null);

  // Group creation modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [groupDesc, setGroupDesc] = useState<string>('');
  const [groupIsPublic, setGroupIsPublic] = useState<boolean>(false);
  const [inviteEmailInput, setInviteEmailInput] = useState<string>('');
  const [inviteEmailError, setInviteEmailError] = useState<string>('');
  const [isVerifyingInvitee, setIsVerifyingInvitee] = useState<boolean>(false);
  const [selectedInvitees, setSelectedInvitees] = useState<UserSearchResult[]>([]);

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

  // Handle adding invitee by verified email
  const handleAddInvitee = async () => {
    const rawEmail = inviteEmailInput.trim().toLowerCase();
    if (!rawEmail) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      setInviteEmailError('Почтаны толық әрі дұрыс жазыңыз');
      return;
    }

    if (user?.email && rawEmail === user.email.toLowerCase()) {
      setInviteEmailError('Өзіңіздің почтаңызды шақыра алмайсыз');
      return;
    }

    if (selectedInvitees.some((u) => u.email.toLowerCase() === rawEmail)) {
      setInviteEmailError('Бұл оқырман тізімге қосылған');
      return;
    }

    const maxAllowed = isPremium ? 50 : 5;
    if (selectedInvitees.length >= maxAllowed) {
      setInviteEmailError(`Тариф бойынша ең көп дегенде ${maxAllowed} адам шақыра аласыз`);
      return;
    }

    setIsVerifyingInvitee(true);
    setInviteEmailError('');

    try {
      const results = await paraqtaApi.searchUsers(rawEmail);
      const found = results.find((u) => u.email.toLowerCase() === rawEmail);

      if (!found) {
        setInviteEmailError('Оқырман табылмады');
      } else if (!found.allowGroupInvites) {
        setInviteEmailError('Бұл оқырман топтық шақыртуларды жапқан');
      } else {
        setSelectedInvitees((prev) => [...prev, found]);
        setInviteEmailInput('');
        setInviteEmailError('');
      }
    } catch (err) {
      setInviteEmailError('Тексеру кезінде қате кетті');
    } finally {
      setIsVerifyingInvitee(false);
    }
  };

  // Mutations
  const saveSessionMutation = useMutation({
    mutationFn: paraqtaApi.saveSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingStats'] });
      queryClient.invalidateQueries({ queryKey: ['myReadingGroups'] });
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
      setInviteEmailInput('');
      setInviteEmailError('');
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
      setShowInvitationsModal(false);
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

  return (
    <div className="max-w-7xl mx-auto my-4 sm:my-8 px-3 sm:px-6 w-full min-w-0 max-w-full overflow-hidden pb-24 animate-fadeIn">
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

      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Парақта
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'tracker' ? (
            <button
              onClick={() => setShowInvitationsModal(true)}
              className="px-3.5 sm:px-4 h-8 sm:h-9 rounded-xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Шақыртулар</span>
              {invitations.length > 0 && (
                <span className="px-1.5 py-0.5 bg-white text-[#F08000] text-[10px] font-black rounded-full leading-none shadow-sm animate-pulse">
                  {invitations.length}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 sm:px-4 h-8 sm:h-9 rounded-xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Топ қосу</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl mb-4 sm:mb-5 border border-slate-200 dark:border-slate-700/60">
        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'tracker'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-md shadow-black/5 dark:shadow-black/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Timer className="w-4 h-4" /> Оқу таймері
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'groups'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-md shadow-black/5 dark:shadow-black/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Менің топтарым
        </button>

        <button
          onClick={() => setActiveTab('explore')}
          className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
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
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-2.5 sm:gap-4 lg:gap-6 items-start animate-fadeIn">
          {/* 1. 2x2 Stats Grid (Desktop Left Top, Mobile 1st) */}
          <div className="w-full lg:col-span-5 lg:col-start-1 lg:row-start-1 order-1 lg:order-none">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col justify-between min-h-[60px] sm:min-h-[84px]">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" /> Бүгін
                </div>
                {renderDurationWithSubSeconds(stats?.todayReadingSeconds || 0)}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col justify-between min-h-[60px] sm:min-h-[84px]">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 flex items-center gap-1.5">
                  <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500" /> Осы аптада
                </div>
                <div className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {formatDurationHuman(stats?.weekReadingSeconds || 0)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col justify-between min-h-[60px] sm:min-h-[84px]">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500" /> Осы айда
                </div>
                <div className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {formatDurationHuman(stats?.monthReadingSeconds || 0)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm bg-gradient-to-br from-orange-500/5 to-amber-500/10 flex flex-col justify-between min-h-[60px] sm:min-h-[84px]">
                <div className="text-[10px] sm:text-xs font-semibold text-[#F08000] mb-0.5 sm:mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F08000]" /> Жалпы оқыған
                </div>
                <div className="text-base sm:text-xl font-extrabold text-[#F08000] leading-tight">
                  {formatDurationHuman(stats?.totalReadingSeconds || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Main Stopwatch / Timer Card (Mobile 2nd, Desktop Right Col 6-12) */}
          <div className="w-full lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2 order-2 lg:order-none">
            <ReadingTrackerWidget />
          </div>

          {/* 3. Ambient Reading Sounds (Mobile 3rd, Desktop Left Bottom Col 1-5 Row 2) */}
          <div className="w-full lg:col-span-5 lg:col-start-1 lg:row-start-2 order-3 lg:order-none">
            <AmbientSoundWidget />
          </div>
        </div>
      )}

      {/* ===================== TAB 2: MY GROUPS ===================== */}
      {activeTab === 'groups' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Privacy Toggle */}
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Шақыртуларды қабылдау
              </span>
            </div>

            <div className="flex items-center shrink-0">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myGroups.map((group) => (
                <Link
                  to={`/paraqta/groups/${group.id}`}
                  key={group.id}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-orange-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/20 shrink-0 overflow-hidden">
                        {group.coverImageUrl ? (
                          <img src={group.coverImageUrl} alt={group.name} className="w-full h-full object-cover" />
                        ) : (
                          group.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {group.memberCount} мүше
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicGroupsData?.content?.map((group) => (
              <div
                key={group.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0 overflow-hidden">
                      {group.coverImageUrl ? (
                        <img src={group.coverImageUrl} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        group.name.charAt(0).toUpperCase()
                      )}
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
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
          >
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6">Жаңа оқу тобын құру</h3>

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
                  Ашық топ
                </label>
              </div>

              {/* Add User Invitation by Email */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Оқырмандарды шақыру:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Мысалы: asylkhan@gmail.com"
                    value={inviteEmailInput}
                    onChange={(e) => {
                      setInviteEmailInput(e.target.value);
                      if (inviteEmailError) setInviteEmailError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInvitee();
                      }
                    }}
                    className={`flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:ring-2 focus:ring-[#F08000] focus:outline-none ${
                      inviteEmailError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={!inviteEmailInput.trim() || isVerifyingInvitee}
                    onClick={handleAddInvitee}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 shrink-0"
                  >
                    {isVerifyingInvitee ? 'Тексерілуде...' : 'Қосу'}
                  </button>
                </div>

                {inviteEmailError && (
                  <p className="text-xs text-rose-500 font-semibold mt-1.5 animate-fadeIn">
                    {inviteEmailError}
                  </p>
                )}

                {/* Selected Invitees Badges */}
                {selectedInvitees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedInvitees.map((u) => (
                      <span
                        key={u.id}
                        className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-[#F08000] rounded-full text-xs font-bold flex items-center gap-1.5"
                      >
                        <span>{u.name || u.email}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedInvitees(selectedInvitees.filter((i) => i.id !== u.id))}
                          className="hover:text-rose-600 font-bold ml-1 text-sm leading-none"
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

      {/* Invitations Modal */}
      {showInvitationsModal && (
        <div
          onClick={() => setShowInvitationsModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-scaleUp cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#F08000] flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Топтық шақыртулар
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Сізге келген барлық топтық шақырулар
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvitationsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {invitations.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Сізде әзірге жаңа шақырту жоқ
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Басқа оқырмандар сізді топтарына шақырғанда, осы жерде көрінеді.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        «{inv.groupName}»
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {inv.inviterName ? (
                          <>
                            Шақырған: <strong className="text-slate-800 dark:text-slate-200">{inv.inviterName}</strong>
                          </>
                        ) : (
                          'Топтық жарысқа шақыру'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => acceptInviteMutation.mutate(inv.token)}
                        disabled={acceptInviteMutation.isPending}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {acceptInviteMutation.isPending ? 'Қосылуда...' : 'Қабылдау'}
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectInviteMutation.mutate(inv.token)}
                        disabled={rejectInviteMutation.isPending}
                        className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        Бас тарту
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInvitationsModal(false)}
                className="px-5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Жабу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
