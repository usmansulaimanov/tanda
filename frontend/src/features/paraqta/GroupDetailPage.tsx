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
} from 'lucide-react';
import { paraqtaApi, ReadingGroupDetail, UserSearchResult } from '../../shared/api/paraqta.api';
import { formatDurationHuman } from './ParaqtaPage';
import { useAuthStore } from '../../store/useAuthStore';
import { Skeleton } from '../../shared/ui';
import { resizeAndCompressImage } from '../../utils/imageUtils';
import { ReadingTrackerWidget } from './ReadingTrackerWidget';
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
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 mb-6 sm:mb-8 shadow-lg w-full max-w-full bg-gradient-to-br from-amber-500/15 via-orange-500/15 to-amber-600/10 border border-orange-500/30 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-500/30 overflow-hidden">
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
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {group.name}
                </h1>
                {group.isPublic && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                    Ашық топ
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                  {group.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-orange-500" /> {group.memberCount} мүше
                </span>
                <span>Құрушы: <strong className="text-slate-800 dark:text-slate-200">{group.creatorName}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 hover:scale-105 transition-transform"
              >
                <UserPlus className="w-3.5 h-3.5" /> Шақыру
              </button>
            )}

            <button
              onClick={handleCopyInviteLink}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50"
            >
              <Share2 className="w-3.5 h-3.5" /> {copiedLink ? 'Көшірілді!' : 'Сілтеме'}
            </button>

            {isCreator ? (
              <button
                onClick={() => {
                  if (confirm('Топты өшіргіңіз келетініне сенімдісіз бе? Барлық мүшелер топтан шығарылады.')) {
                    deleteGroupMutation.mutate();
                  }
                }}
                className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-xs font-bold transition-colors"
                title="Топты өшіру"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm('Топтан шыққыңыз келе ме? Рейтингтегі минуттарыңыз 0-ге түседі.')) {
                    leaveGroupMutation.mutate();
                  }
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 text-xs font-bold transition-colors"
                title="Топтан шығу"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tracker / Stopwatch Widget for this Group */}
      {group.isMember && (
        <div className="mb-8 animate-fadeIn">
          <ReadingTrackerWidget
            fixedGroupId={group.id}
            fixedGroupName={group.name}
            onSessionSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['readingGroupDetail', id] });
              queryClient.invalidateQueries({ queryKey: ['readingStats'] });
            }}
          />
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
          <Trophy className="w-4 h-4" /> Айлық рейтинг (Осы ай)
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'archive'
              ? 'bg-white dark:bg-slate-900 text-[#F08000] shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> Өткен айлардың жеңімпаздары {archives.length > 0 && `(${archives.length})`}
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
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Rank Badge */}
                      <div className="w-8 flex items-center justify-center font-black text-sm">
                        {isTop1 ? (
                          <span className="text-2xl" title="1-орын">🥇</span>
                        ) : isTop2 ? (
                          <span className="text-2xl" title="2-орын">🥈</span>
                        ) : isTop3 ? (
                          <span className="text-2xl" title="3-орын">🥉</span>
                        ) : (
                          <span className="text-slate-400 font-mono">#{index + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Name & Role */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {member.name}
                          </span>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F08000] text-white">
                              Сіз
                            </span>
                          )}
                          {member.role === 'CREATOR' && (
                            <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                              <Crown className="w-3 h-3" /> Админ
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Жалпы: {formatDurationHuman(member.totalReadingSeconds)}
                        </div>
                      </div>
                    </div>

                    {/* Monthly Score & Admin Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-black text-[#F08000]">
                          {formatDurationHuman(member.monthlyReadingSeconds)}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Осы айда</div>
                      </div>

                      {isAdmin && member.role !== 'CREATOR' && !isCurrentUser && (
                        <button
                          onClick={() => {
                            if (confirm(`«${member.name}» оқырманын топтан шығарғыңыз келе ме?`)) {
                              kickMemberMutation.mutate(member.userId);
                            }
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          title="Топтан шығару (Kick)"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= ARCHIVE TAB ================= */}
      {activeTab === 'archive' && (
        <div className="space-y-4 animate-fadeIn">
          {archives.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white">Өткен айлар тарихы әлі жоқ</h3>
              <p className="text-xs text-slate-500 mt-1">Ай аяқталған соң жеңімпаз осында жазылады.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {archives.map((arch) => (
                <div
                  key={arch.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase">{arch.yearMonth} жеңімпазы</div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">{arch.winnerName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-amber-500">
                      {formatDurationHuman(arch.winnerReadingSeconds)}
                    </div>
                    <div className="text-[10px] text-slate-400">Нәтижесі</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= INVITE MODAL ================= */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
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
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Болдырмау
                </button>
                <button
                  type="button"
                  disabled={!inviteEmail.trim() || sendInviteMutation.isPending}
                  onClick={handleSendInvite}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {sendInviteMutation.isPending ? 'Жіберілуде...' : 'Шақыру хатын жіберу'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
