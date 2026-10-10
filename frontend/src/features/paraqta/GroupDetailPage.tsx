import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  Users,
  UserPlus,
  LogOut,
  Trash2,
  Share2,
  Calendar,
  Sparkles,
  ArrowLeft,
  Timer,
  CheckCircle2,
  Shield,
  UserMinus,
  Crown,
  Search,
  Camera,
  Loader2,
  Clock,
  Flame,
} from 'lucide-react';
import { paraqtaApi, ReadingGroupDetail, ReadingGroupMember, UserSearchResult } from '../../shared/api/paraqta.api';
import { formatDurationHuman } from './ParaqtaPage';
import { useAuthStore } from '../../store/useAuthStore';
import { Skeleton } from '../../shared/ui';
import { resizeAndCompressImage } from '../../utils/imageUtils';
import { ReadingTrackerWidget } from './ReadingTrackerWidget';
import { AmbientSoundWidget } from './components/AmbientSoundWidget';
const KAZAKH_MONTHS = [
  'Қаңтар',
  'Ақпан',
  'Наурыз',
  'Сәуір',
  'Мамыр',
  'Маусым',
  'Шілде',
  'Тамыз',
  'Қыркүйек',
  'Қазан',
  'Қараша',
  'Желтоқсан',
];

export const GroupDetailPage: React.FC = () => {
  const currentMonthName = KAZAKH_MONTHS[new Date().getMonth()];
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'archive'>('leaderboard');
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; type: 'success' | 'error' } | null>(null);

  const [memberToKick, setMemberToKick] = useState<ReadingGroupMember | null>(null);
  const [kickConfirmationText, setKickConfirmationText] = useState('');

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveConfirmationText, setLeaveConfirmationText] = useState('');

  const showToast = (title: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const { data: detail, isLoading, error } = useQuery<ReadingGroupDetail>({
    queryKey: ['readingGroupDetail', id],
    queryFn: () => paraqtaApi.getGroupDetail(id!),
    enabled: Boolean(id),
  });

  const sendInviteMutation = useMutation({
    mutationFn: (email: string) => paraqtaApi.sendInvitation(id!, email),
    onSuccess: () => {
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteError('');
      showToast('Шақыру хаты сәтті жіберілді!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('тіркелмеген') || err?.response?.status === 404) {
        setInviteError('Бұл email-мен оқырман тіркелмеген');
      } else if (
        msg.toLowerCase().includes('email') ||
        msg.toLowerCase().includes('format') ||
        msg.toLowerCase().includes('invalid')
      ) {
        setInviteError('Электронды пошта форматы дұрыс емес');
      } else {
        setInviteError(msg || 'Шақыру мүмкін болмады');
      }
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: () => paraqtaApi.leaveGroup(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReadingGroups'] });
      showToast('Сіз топтан шықтыңыз');
      navigate('/paraqta');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Қате орын алды', 'error');
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => paraqtaApi.deleteGroup(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReadingGroups'] });
      showToast('Топ өшірілді');
      navigate('/paraqta');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Қате орын алды', 'error');
    },
  });

  const kickMemberMutation = useMutation({
    mutationFn: (targetUserId: string) => paraqtaApi.kickMember(id!, targetUserId),
    onSuccess: () => {
      setMemberToKick(null);
      setKickConfirmationText('');
      queryClient.invalidateQueries({ queryKey: ['readingGroupDetail', id] });
      showToast('Мүше топтан шығарылды');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Шығару мүмкін болмады', 'error');
    },
  });

  const updateCoverMutation = useMutation({
    mutationFn: (coverImageUrl: string) => paraqtaApi.updateGroup(id!, { coverImageUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingGroupDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['myReadingGroups'] });
      queryClient.invalidateQueries({ queryKey: ['publicReadingGroups'] });
      showToast('Топ суреті сәтті жаңартылды!');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Суретті жүктеу мүмкін болмады', 'error');
    },
  });

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingCover(true);
    try {
      const dataUrl = await resizeAndCompressImage(file, 400, 0.85);
      await updateCoverMutation.mutateAsync(dataUrl);
    } catch (error: any) {
      showToast(error.message || 'Суретті өңдеу қатесі', 'error');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/paraqta/groups/${id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    showToast('Топтың сілтемесі көшірілді!');
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-10 space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Топ табылмады</h3>
        <p className="text-sm text-slate-500 mt-2 mb-6">Бұл топ өшірілген немесе сізде кіру құқығы жоқ.</p>
        <Link to="/paraqta" className="px-5 py-2.5 bg-[#F08000] text-white font-bold text-sm rounded-xl">
          Парақта бөліміне қайту
        </Link>
      </div>
    );
  }

  const { group, members, archives } = detail;
  const isCreator = user?.id === group.creatorId;
  const isAdmin = group.myRole === 'ADMIN' || isCreator;
  const myMember = members.find((m) => m.userId === user?.id);

  const handleSendInvite = () => {
    const clean = inviteEmail.trim().toLowerCase();
    if (!clean) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setInviteError('Электронды пошта форматы дұрыс емес');
      return;
    }
    sendInviteMutation.mutate(clean);
  };

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
          <span>{toastMessage.title}</span>
        </div>
      )}

      {/* Back button */}
      <Link
        to="/paraqta"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#F08000] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Топтар тізіміне қайту
      </Link>

      {/* Group Header Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-8 shadow-sm w-full max-w-full bg-gradient-to-br from-amber-500/15 via-orange-500/15 to-amber-600/10 border border-orange-500/30 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg shadow-orange-500/30 overflow-hidden">
                {group.coverImageUrl ? (
                  <img
                    src={group.coverImageUrl}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  group.name.charAt(0).toUpperCase()
                )}
              </div>
              {isAdmin && (
                <>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleCoverImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingCover}
                    title="Топ суретін өзгерту"
                    aria-label="Топ суретін өзгерту"
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-800 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md hover:bg-[#F08000] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingCover ? (
                      <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </button>
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {group.name}
                </h1>
                {group.isPublic && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 shrink-0">
                    Ашық топ
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl line-clamp-2 sm:line-clamp-none">
                  {group.description}
                </p>
              )}
              <div className="flex items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2 text-xs font-semibold text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 shrink-0">
                  <Users className="w-3.5 h-3.5 text-orange-500" /> {group.memberCount} мүше
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="truncate">Құрушы: <strong className="text-slate-800 dark:text-slate-200">{group.creatorName}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {isAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" /> Шақыру
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleCopyInviteLink}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" /> {copiedLink ? 'Көшірілді!' : 'Сілтеме'}
              </button>
            )}

            {isCreator ? (
              <button
                onClick={() => {
                  if (confirm('Топты өшіргіңіз келетініне сенімдісіз бе? Барлық мүшелер топтан шығарылады.')) {
                    deleteGroupMutation.mutate();
                  }
                }}
                className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-xs font-bold transition-colors cursor-pointer"
                title="Топты өшіру"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowLeaveModal(true);
                  setLeaveConfirmationText('');
                }}
                className="text-rose-500 hover:text-rose-600 hover:underline text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer py-1 px-1.5"
                title="Топтан шығу"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Шығу</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tracker & Stats Section for this Group */}
      {group.isMember && (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-2.5 sm:gap-4 lg:gap-6 items-start mb-8 animate-fadeIn">
          {/* 1. 2x2 Stats Grid (Desktop Left Top, Mobile 1st) */}
          <div className="w-full lg:col-span-5 lg:col-start-1 lg:row-start-1 order-1 lg:order-none">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col justify-between min-h-[60px] sm:min-h-[84px]">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500" /> Бүгін
                </div>
                <div>
                  <div className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                    {Math.floor((group.myTodaySeconds || 0) / 60)} мин
                  </div>
                  <div className="text-[9px] sm:text-[11px] text-slate-400 font-bold">
                    {(group.myTodaySeconds || 0) % 60} сек
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col justify-between min-h-[60px] sm:min-h-[84px]">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 flex items-center gap-1.5">
                  <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500" /> Топтағы орныңыз
                </div>
                <div className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {myMember?.rank ? (
                    myMember.rank === 1 ? (
                      <span className="text-amber-500">🥇 1-орын</span>
                    ) : myMember.rank === 2 ? (
                      <span className="text-slate-400">🥈 2-орын</span>
                    ) : myMember.rank === 3 ? (
                      <span className="text-amber-700">🥉 3-орын</span>
                    ) : (
                      `#${myMember.rank} орын`
                    )
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col justify-between min-h-[60px] sm:min-h-[84px]">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" /> Осы айда
                </div>
                <div className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {formatDurationHuman(group.myMonthlySeconds || 0)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm bg-gradient-to-br from-orange-500/5 to-amber-500/10 flex flex-col justify-between min-h-[60px] sm:min-h-[84px]">
                <div className="text-[10px] sm:text-xs font-semibold text-[#F08000] mb-0.5 sm:mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F08000]" /> Жалпы оқыған
                </div>
                <div className="text-base sm:text-xl font-extrabold text-[#F08000] leading-tight">
                  {formatDurationHuman(group.myTotalSeconds || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Main Stopwatch / Timer Card (Mobile 2nd, Desktop Right Col 6-12) */}
          <div className="w-full lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2 order-2 lg:order-none">
            <ReadingTrackerWidget
              fixedGroupId={group.id}
              fixedGroupName={group.name}
              onSessionSaved={() => {
                queryClient.invalidateQueries({ queryKey: ['readingGroupDetail', id] });
                queryClient.invalidateQueries({ queryKey: ['readingStats'] });
              }}
            />
          </div>

          {/* 3. Ambient Background Sounds Widget (Mobile 3rd, Desktop Left Bottom Col 1-5 Row 2) */}
          <div className="w-full lg:col-span-5 lg:col-start-1 lg:row-start-2 order-3 lg:order-none">
            <AmbientSoundWidget />
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl mb-6">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" /> {currentMonthName}
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'archive'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> Өткен ай
        </button>
      </div>

      {/* ================= LEADERBOARD TAB ================= */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((member, index) => {
                const isCurrentUser = member.userId === user?.id;
                const isTop1 = index === 0;
                const isTop2 = index === 1;
                const isTop3 = index === 2;

                return (
                  <div
                    key={member.id}
                    className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                      isCurrentUser ? 'bg-orange-500/5 dark:bg-orange-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Rank Badge */}
                      <div className="w-7 sm:w-8 flex items-center justify-center font-black text-sm shrink-0">
                        {isTop1 ? (
                          <span className="text-xl sm:text-2xl" title="1-орын">🥇</span>
                        ) : isTop2 ? (
                          <span className="text-xl sm:text-2xl" title="2-орын">🥈</span>
                        ) : isTop3 ? (
                          <span className="text-xl sm:text-2xl" title="3-орын">🥉</span>
                        ) : (
                          <span className="text-slate-400 font-mono">#{index + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm sm:text-base">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Name & Role */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {member.name}
                          </span>
                          {isCurrentUser && (
                            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-[#F08000] text-white shrink-0">
                              Сіз
                            </span>
                          )}
                          {member.role === 'CREATOR' && (
                            <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 flex items-center gap-0.5 shrink-0">
                              <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Админ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 sm:gap-1.5 flex-wrap">
                          {member.email && (
                            <>
                              <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[120px] sm:max-w-none">{member.email}</span>
                              <span className="sm:hidden text-slate-300 dark:text-slate-700">•</span>
                            </>
                          )}
                          <span className="sm:hidden font-medium text-slate-600 dark:text-slate-300">
                            Бүгін: {formatDurationHuman(member.todayReadingSeconds || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Today (desktop) & Monthly Score & Admin Actions */}
                    <div className="flex items-center gap-2 sm:gap-6 shrink-0">
                      <div className="hidden sm:block text-right min-w-[75px]">
                        <div className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDurationHuman(member.todayReadingSeconds || 0)}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Бүгін</div>
                      </div>

                      <div className="text-right min-w-[55px] sm:min-w-[85px]">
                        <div className="text-sm sm:text-lg font-black text-[#F08000] whitespace-nowrap">
                          {formatDurationHuman(member.monthlyReadingSeconds)}
                        </div>
                        <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Осы айда</div>
                      </div>

                      {isAdmin && (
                        <div className="w-6 sm:w-7 flex items-center justify-center shrink-0">
                          {member.role !== 'CREATOR' && !isCurrentUser && (
                            <button
                              type="button"
                              onClick={() => {
                                setMemberToKick(member);
                                setKickConfirmationText('');
                              }}
                              className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Топтан шығару"
                            >
                              <UserMinus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= ARCHIVE TAB (ONLY PREVIOUS MONTH) ================= */}
      {activeTab === 'archive' && (
        <div className="space-y-4 animate-fadeIn">
          {archives.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white">Өткен ай нәтижесі әлі жоқ</h3>
              <p className="text-xs text-slate-500 mt-1">Ай аяқталған соң өткен айдың жеңімпазы осында жазылады.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm max-w-xl mx-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl shrink-0 shadow-sm">
                    🏆
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Өткен ай ({archives[0].yearMonth}) жеңімпазы
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {archives[0].winnerName || 'Анықталмаған'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-amber-500">
                    {formatDurationHuman(archives[0].winnerReadingSeconds || 0)}
                  </div>
                  <div className="text-[10px] text-slate-400">Нәтижесі</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= INVITE MODAL ================= */}
      {showInviteModal && (
        <div
          onClick={() => setShowInviteModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl cursor-default"
          >
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">Оқырманды топқа шақыру</h3>
            <p className="text-xs text-slate-500 mb-4">Оқырманның тіркелген почтасын жазыңыз:</p>

            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Мысалы: asylkhan@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteError) setInviteError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inviteEmail.trim() && !sendInviteMutation.isPending) {
                      e.preventDefault();
                      handleSendInvite();
                    }
                  }}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:ring-2 focus:ring-[#F08000] focus:outline-none ${
                    inviteError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {inviteError && (
                  <p className="text-xs text-rose-500 font-semibold mt-1.5 animate-fadeIn">
                    {inviteError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Болдырмау
                </button>
                <button
                  type="button"
                  disabled={!inviteEmail.trim() || sendInviteMutation.isPending}
                  onClick={handleSendInvite}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {sendInviteMutation.isPending ? 'Жіберілуде...' : 'Шақыру хатын жіберу'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kick Member Confirmation Modal */}
      {memberToKick && (
        <div
          onClick={() => {
            setMemberToKick(null);
            setKickConfirmationText('');
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-scaleUp cursor-default"
          >
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Оқырманды топтан шығару
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Әрекетті растау қажет
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>«{memberToKick.name}»</strong> оқырманын топтан шығарғыңыз келетінін растау үшін төмендегі өріске <strong>«шығару»</strong> деп жазыңыз:
            </p>

            <div>
              <input
                type="text"
                autoFocus
                placeholder="шығару"
                value={kickConfirmationText}
                onChange={(e) => setKickConfirmationText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    kickConfirmationText.trim().toLowerCase() === 'шығару' &&
                    !kickMemberMutation.isPending
                  ) {
                    e.preventDefault();
                    kickMemberMutation.mutate(memberToKick.userId);
                  }
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMemberToKick(null);
                  setKickConfirmationText('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Болдырмау
              </button>
              <button
                type="button"
                disabled={
                  kickConfirmationText.trim().toLowerCase() !== 'шығару' ||
                  kickMemberMutation.isPending
                }
                onClick={() => {
                  if (kickConfirmationText.trim().toLowerCase() === 'шығару') {
                    kickMemberMutation.mutate(memberToKick.userId);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {kickMemberMutation.isPending ? 'Шығарылуда...' : 'Шығару'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation Modal */}
      {showLeaveModal && (
        <div
          onClick={() => {
            setShowLeaveModal(false);
            setLeaveConfirmationText('');
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-scaleUp cursor-default"
          >
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Топтан шығу
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Әрекетті растау қажет
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>«{group.name}»</strong> тобынан шыққыңыз келетінін растау үшін төмендегі өріске <strong>«шығамын»</strong> деп жазыңыз:
            </p>

            <div>
              <input
                type="text"
                autoFocus
                placeholder="шығамын"
                value={leaveConfirmationText}
                onChange={(e) => setLeaveConfirmationText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    leaveConfirmationText.trim().toLowerCase() === 'шығамын' &&
                    !leaveGroupMutation.isPending
                  ) {
                    e.preventDefault();
                    leaveGroupMutation.mutate();
                  }
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveConfirmationText('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Болдырмау
              </button>
              <button
                type="button"
                disabled={
                  leaveConfirmationText.trim().toLowerCase() !== 'шығамын' ||
                  leaveGroupMutation.isPending
                }
                onClick={() => {
                  if (leaveConfirmationText.trim().toLowerCase() === 'шығамын') {
                    leaveGroupMutation.mutate();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {leaveGroupMutation.isPending ? 'Шығуда...' : 'Шығу'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
