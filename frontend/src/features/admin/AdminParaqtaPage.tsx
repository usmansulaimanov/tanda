import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BadgeCheck,
  Search,
  Clock,
  Globe,
  Lock,
  MessageSquare,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { paraqtaApi, ReadingGroup } from '../../shared/api/paraqta.api';
import { useToastStore } from '../../store/useToastStore';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';

type StatusTab = 'PENDING_APPROVAL' | 'ALL' | 'APPROVED' | 'REJECTED';

export const AdminParaqtaPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<StatusTab>('PENDING_APPROVAL');
  const [page, setPage] = useState<number>(0);
  const [pageSize] = useState<number>(20);

  // Modals state
  const [approveModalGroup, setApproveModalGroup] = useState<ReadingGroup | null>(null);
  const [approveWithVerified, setApproveWithVerified] = useState<boolean>(false);

  const [rejectModalGroup, setRejectModalGroup] = useState<ReadingGroup | null>(null);
  const [rejectNote, setRejectNote] = useState<string>('');

  const [warnModalGroup, setWarnModalGroup] = useState<ReadingGroup | null>(null);
  const [warnNote, setWarnNote] = useState<string>('');

  // Fetch pending count for badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['adminGroupPendingCount'],
    queryFn: paraqtaApi.getAdminPendingCount,
    refetchInterval: 30 * 1000,
  });

  // Fetch groups
  const { data: pageData, isLoading, refetch } = useQuery({
    queryKey: ['adminReadingGroups', activeTab, page, pageSize],
    queryFn: () => paraqtaApi.getAdminGroups(activeTab, page, pageSize),
  });

  const groups = pageData?.content || [];
  const totalPages = pageData?.totalPages || 1;
  const totalElements = pageData?.totalElements || 0;

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      paraqtaApi.approveGroup(id, isVerified),
    onSuccess: (data) => {
      showToast(`«${data.name}» тобы сәтті мақұлданды!`, 'success');
      setApproveModalGroup(null);
      setApproveWithVerified(false);
      queryClient.invalidateQueries({ queryKey: ['adminReadingGroups'] });
      queryClient.invalidateQueries({ queryKey: ['adminGroupPendingCount'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Мақұлдау кезінде қате кетті';
      showToast(msg, 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      paraqtaApi.rejectGroup(id, note),
    onSuccess: (data) => {
      showToast(`«${data.name}» тобы қабылданбады`, 'info');
      setRejectModalGroup(null);
      setRejectNote('');
      queryClient.invalidateQueries({ queryKey: ['adminReadingGroups'] });
      queryClient.invalidateQueries({ queryKey: ['adminGroupPendingCount'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Қабылдамау кезінде қате кетті';
      showToast(msg, 'error');
    },
  });

  const warnMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      paraqtaApi.warnGroup(id, note),
    onSuccess: (data) => {
      showToast(`«${data.name}» тобына ескерту жіберілді`, 'success');
      setWarnModalGroup(null);
      setWarnNote('');
      queryClient.invalidateQueries({ queryKey: ['adminReadingGroups'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Ескерту жіберу кезінде қате кетті';
      showToast(msg, 'error');
    },
  });

  const toggleVerifyMutation = useMutation({
    mutationFn: (id: string) => paraqtaApi.toggleGroupVerification(id),
    onSuccess: (data) => {
      showToast(
        data.isVerified
          ? `«${data.name}» тобына расталған көк белгі берілді!`
          : `«${data.name}» тобынан көк белгі алынды`,
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['adminReadingGroups'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Күйді өзгертуде қате кетті';
      showToast(msg, 'error');
    },
  });

  // Date formatter strictly DD.MM.YYYY
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Парақта — Оқу топтары
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 pl-12">
              Ашық топтарды модерациялау, юзернеймдерді тексеру және расталған көк белгіні тағайындау
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Жаңарту</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('PENDING_APPROVAL');
              setPage(0);
            }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'PENDING_APPROVAL'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Күтілуде</span>
            {pendingCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'PENDING_APPROVAL'
                    ? 'bg-white text-orange-600'
                    : 'bg-orange-500 text-white'
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ALL');
              setPage(0);
            }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>Барлығы</span>
            {activeTab === 'ALL' && (
              <span className="text-[11px] opacity-80">({totalElements})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('APPROVED');
              setPage(0);
            }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Мақұлданған</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('REJECTED');
              setPage(0);
            }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Қабылданбаған</span>
          </button>
        </div>

        {/* Groups Content */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mb-3"></div>
            <p className="text-xs text-slate-500">Деректер жүктелуде...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto stroke-[1.5]" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Бұл бөлімде топтар табылмады
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === 'PENDING_APPROVAL'
                ? 'Қазіргі уақытта тексеруді күтіп тұрған жаңа ашық топ өтінімдері жоқ.'
                : 'Тізім бос.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const isPending = group.status === 'PENDING_APPROVAL';
              const isApproved = group.status === 'APPROVED';
              const isRejected = group.status === 'REJECTED';

              return (
                <div
                  key={group.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                >
                  {/* Left Info */}
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Header Row: Title + Badges */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{group.name}</span>
                        {group.isVerified && <VerifiedBadge size="w-4 h-4" title="Расталған топ" />}
                      </h3>

                      {group.username && (
                        <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-lg border border-orange-200 dark:border-orange-900/40">
                          @{group.username}
                        </span>
                      )}

                      {group.isPublic ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                          <Globe className="w-3 h-3" />
                          Ашық топ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" />
                          Жабық топ
                        </span>
                      )}

                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 animate-pulse">
                          <Clock className="w-3 h-3" />
                          Күтілуде
                        </span>
                      )}

                      {isApproved && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Мақұлданған
                        </span>
                      )}

                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-700">
                          <XCircle className="w-3 h-3" />
                          Қабылданбаған
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {group.description && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                        {group.description}
                      </p>
                    )}

                    {/* Metadata & Creator */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Құрушы:
                        </span>
                        <span>{group.creatorName || group.creatorId}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Қатысушылар:
                        </span>
                        <span>
                          {group.memberCount} / {group.maxMembers}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Күні:
                        </span>
                        <span className="font-mono">{formatDate(group.createdAt)}</span>
                      </div>
                    </div>

                    {/* Admin Warning / Note Display */}
                    {group.adminNote && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <span className="font-black">Әкімші ескертуі: </span>
                          <span>{group.adminNote}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 self-stretch lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    {/* Toggle Verified Badge Button */}
                    <button
                      type="button"
                      disabled={toggleVerifyMutation.isPending}
                      onClick={() => toggleVerifyMutation.mutate(group.id)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                        group.isVerified
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 hover:bg-blue-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                      title={group.isVerified ? 'Көк белгіні алып тастау' : 'Расталған көк белгіні беру'}
                    >
                      <BadgeCheck className={`w-3.5 h-3.5 ${group.isVerified ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{group.isVerified ? 'Расталған' : 'Белгі беру'}</span>
                    </button>

                    {/* Warning Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setWarnModalGroup(group);
                        setWarnNote(group.adminNote || '');
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ескерту</span>
                    </button>

                    {/* Reject Button (if pending or approved) */}
                    {!isRejected && (
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalGroup(group);
                          setRejectNote('');
                        }}
                        className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Қабылдамау</span>
                      </button>
                    )}

                    {/* Approve Button (if pending or rejected) */}
                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => {
                          setApproveModalGroup(group);
                          setApproveWithVerified(group.isVerified || false);
                        }}
                        className="px-4 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Қабылдау</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  Барлығы: {totalElements} топ (Бет: {page + 1} / {totalPages})
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    Алдыңғы
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    Келесі
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================== APPROVE MODAL ===================== */}
      {approveModalGroup && (
        <div
          onClick={() => setApproveModalGroup(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative cursor-default space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Топты мақұлдау
                </h3>
                <p className="text-xs text-slate-500">«{approveModalGroup.name}»</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Бұл ашық топ мақұлданған соң сайттың Парақта каталогында көпшілікке жарияланады және іздеу арқылы табылатын болады.
            </p>

            {/* Checkbox: Blue verified badge */}
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center gap-3">
              <input
                type="checkbox"
                id="verifyCheckbox"
                checked={approveWithVerified}
                onChange={(e) => setApproveWithVerified(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="verifyCheckbox"
                className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1.5 select-none"
              >
                <span>Расталған топ белгісін беру</span>
                <VerifiedBadge size="w-3.5 h-3.5" />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApproveModalGroup(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Болдырмау
              </button>
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate({
                    id: approveModalGroup.id,
                    isVerified: approveWithVerified,
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Мақұлдануда...' : 'Қабылдау және жариялау'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== REJECT MODAL ===================== */}
      {rejectModalGroup && (
        <div
          onClick={() => setRejectModalGroup(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative cursor-default space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Өтінімді қабылдамау
                </h3>
                <p className="text-xs text-slate-500">«{rejectModalGroup.name}»</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Қабылдамау себебі / ескерту (міндетті емес):
              </label>
              <textarea
                rows={3}
                placeholder="Мысалы: Сайт ережелеріне сәйкес келмейді немесе юзернейм дұрыс емес..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalGroup(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Болдырмау
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectModalGroup.id,
                    note: rejectNote,
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Қабылданбауда...' : 'Қабылдамау'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== WARN MODAL ===================== */}
      {warnModalGroup && (
        <div
          onClick={() => setWarnModalGroup(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative cursor-default space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Ескерту жіберу
                </h3>
                <p className="text-xs text-slate-500">«{warnModalGroup.name}»</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Авторға көрінетін ескерту мәтіні:
              </label>
              <textarea
                rows={3}
                placeholder="Мысалы: Топтың юзернеймін өзгертіңіз немесе мақсатын толығырақ жазыңыз..."
                value={warnNote}
                onChange={(e) => setWarnNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setWarnModalGroup(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Болдырмау
              </button>
              <button
                type="button"
                disabled={!warnNote.trim() || warnMutation.isPending}
                onClick={() =>
                  warnMutation.mutate({
                    id: warnModalGroup.id,
                    note: warnNote.trim(),
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {warnMutation.isPending ? 'Жіберілуде...' : 'Ескертуді сақтау'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
