import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Gift, 
  Settings, 
  BarChart3, 
  Check, 
  Save, 
  Sparkles, 
  Clock, 
  Headphones, 
  MessageSquare, 
  UserPlus, 
  Calendar, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  Sliders, 
  AlertCircle,
  PlusCircle,
  MinusCircle,
  X,
  ChevronLeft,
  ChevronRight,
  History
} from 'lucide-react';
import { bonusApi, UpdateBonusSettingsPayload } from '../../shared/api/bonus.api';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { hasAdminPermission } from '../../utils/permissions';
import { BonusTransaction } from '../../types';

export const AdminBonusesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, role, isAuthInitialized } = useAuthStore();
  const { showToast } = useToastStore();

  const isAuthor = Boolean(role === 'author' || user?.isAuthor || user?.role === 'author');
  const isAdminOrStaff = Boolean(role === 'admin' || user?.role === 'admin' || user?.isSuperAdmin || Boolean(user?.duty));

  useEffect(() => {
    if (!isAuthInitialized) return;
    if (!user || !isAdminOrStaff || isAuthor) {
      showToast('Бұл бетке кіру үшін әкімші құқығы қажет', 'error');
      navigate('/admin/home', { replace: true });
    }
  }, [isAuthInitialized, user, isAdminOrStaff, isAuthor, navigate, showToast]);

  const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');

  // Query Settings
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['adminBonusSettings'],
    queryFn: bonusApi.getAdminSettings,
  });

  // Query Stats Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['adminBonusSummary'],
    queryFn: bonusApi.getAdminSummary,
  });

  // Query Readers with Bonuses (Statistics Tab)
  const [readersSearch, setReadersSearch] = useState('');
  const [readersSortBy, setReadersSortBy] = useState('bonus_desc');
  const [readersPage, setReadersPage] = useState(1);
  const [readersPageSize, setReadersPageSize] = useState(10);

  const { data: bonusReadersData, isLoading: isBonusReadersLoading } = useQuery({
    queryKey: ['adminBonusReaders', readersSearch, readersSortBy, readersPage, readersPageSize],
    queryFn: () => bonusApi.getBonusReaders(readersSearch || undefined, readersSortBy, readersPage - 1, readersPageSize),
  });

  // Reader Transaction History Modal State
  const [selectedReaderForHistory, setSelectedReaderForHistory] = useState<any>(null);
  const [historyPage, setHistoryPage] = useState(0);

  const { data: readerHistoryData, isLoading: isReaderHistoryLoading } = useQuery({
    queryKey: ['adminReaderBonusHistory', selectedReaderForHistory?.id, historyPage],
    queryFn: () => selectedReaderForHistory ? bonusApi.getReaderTransactions(selectedReaderForHistory.id, historyPage, 20) : null,
    enabled: Boolean(selectedReaderForHistory?.id),
  });


  // Form State for Settings
  const [form, setForm] = useState<UpdateBonusSettingsPayload>({
    bonusSystemEnabled: true,
    bonusCurrencyName: 'Бонус',
    bonusSignupEnabled: true,
    bonusSignupAmount: 100,
    bonusDailyLoginEnabled: true,
    bonusDailyLoginAmount: 10,
    bonusListeningEnabled: true,
    bonusListeningAmount: 60,
    bonusListeningIntervalHours: 1,
    bonusReviewEnabled: true,
    bonusReviewAmount: 5,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        bonusSystemEnabled: settings.bonusSystemEnabled,
        bonusCurrencyName: settings.bonusCurrencyName || 'Бонус',
        bonusSignupEnabled: settings.bonusSignupEnabled,
        bonusSignupAmount: settings.bonusSignupAmount,
        bonusDailyLoginEnabled: settings.bonusDailyLoginEnabled,
        bonusDailyLoginAmount: settings.bonusDailyLoginAmount,
        bonusListeningEnabled: settings.bonusListeningEnabled,
        bonusListeningAmount: settings.bonusListeningAmount,
        bonusListeningIntervalHours: settings.bonusListeningIntervalHours || 1,
        bonusReviewEnabled: settings.bonusReviewEnabled,
        bonusReviewAmount: settings.bonusReviewAmount,
      });
    }
  }, [settings]);

  // Mutation for saving settings
  const saveMutation = useMutation({
    mutationFn: bonusApi.updateAdminSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBonusSettings'] });
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      queryClient.invalidateQueries({ queryKey: ['bonusSettings'] });
      showToast('Бонус жүйесінің баптаулары сәтті сақталды', 'success');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Баптауларды сақтау кезінде қате орын алды', 'error');
    },
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  // Adjust bonus modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustMode, setAdjustMode] = useState<'add' | 'subtract'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Auto format reader ID (e.g. 98700979 -> 9870 0979) or keep username/email
  const handleIdInputChange = (rawVal: string) => {
    let val = rawVal;
    const cleanDigits = rawVal.replace(/\s+/g, '');
    if (/^\d+$/.test(cleanDigits)) {
      if (cleanDigits.length <= 4) {
        val = cleanDigits;
      } else {
        val = `${cleanDigits.slice(0, 4)} ${cleanDigits.slice(4, 8)}`.trim();
      }
    }
    setAdjustUserId(val);
  };

  // Live lookup with debounce
  useEffect(() => {
    const trimmed = adjustUserId.trim();
    if (!trimmed || trimmed.length < 3) {
      setFoundUser(null);
      setLookupError(null);
      setLookupLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLookupLoading(true);
      setLookupError(null);
      try {
        const u = await bonusApi.lookupUser(trimmed);
        setFoundUser(u);
        setLookupError(null);
      } catch (err: any) {
        setFoundUser(null);
        setLookupError('Мұндай ID немесе Email-і бар оқырман табылмады');
      } finally {
        setLookupLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [adjustUserId]);

  const adjustMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      bonusApi.adjustUserBonus(userId, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBonusSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminBonusReaders'] });
      queryClient.invalidateQueries({ queryKey: ['adminReaderBonusHistory'] });
      showToast('Оқырманның бонустары сәтті түзетілді', 'success');
      setAdjustModalOpen(false);
      setAdjustUserId('');
      setFoundUser(null);
      setLookupError(null);
      setAdjustMode('add');
      setAdjustAmount(100);
      setAdjustReason('');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Бонусты түзету кезінде қате орын алды', 'error');
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId.trim()) {
      showToast('Пайдаланушы ID нөмірін енгізіңіз', 'error');
      return;
    }
    if (!foundUser && lookupError) {
      showToast('Түзету үшін алдымен оқырманды дұрыс таңдаңыз', 'error');
      return;
    }
    const finalAmount = adjustMode === 'add' ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    adjustMutation.mutate({
      userId: foundUser ? foundUser.id : adjustUserId.trim(),
      amount: finalAmount,
      reason: adjustReason.trim(),
    });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SIGNUP':
        return <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">🎉 Тіркелу</span>;
      case 'DAILY_LOGIN':
        return <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700">📅 Күндік кіру</span>;
      case 'LISTENING_MILESTONE':
        return <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700">🎧 Тыңдалым</span>;
      case 'REVIEW':
        return <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">✍️ Пікір жазу</span>;
      case 'SUBSCRIPTION_PURCHASE':
        return <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700">👑 Жазылым алу</span>;
      case 'ADMIN_ADJUSTMENT':
        return <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">⚙️ Әкімші түзетуі</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">{type}</span>;
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return iso;
    }
  };

  if (!isAuthInitialized || isSettingsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-10 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Бонус жүйесі
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Оқырмандарды ынталандыру, бонустарды есептеу және бақылау жүйесі
                </p>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAdjustModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Coins className="w-4 h-4" />
              Бонусты қолмен түзету
            </button>
          </div>
        </div>

        {/* Main Tabs Navigation (Segmented Switcher) */}
        <div className="flex justify-start">
          <div className="inline-flex p-1.5 bg-slate-200/80 rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeTab === 'settings'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Баптаулар</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeTab === 'stats'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Статистика және транзакциялар</span>
            </button>
          </div>
        </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Main Master Switch Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Бонус жүйесі</h2>
                <p className="text-xs text-slate-500 mt-0.5">Жүйені жалпы қосу/өшіру және валюта атауын орнату</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.bonusSystemEnabled}
                  onChange={(e) => setForm({ ...form, bonusSystemEnabled: e.target.checked })}
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-semibold text-slate-800 flex-shrink-0">
                Валюта:
              </label>
              <input
                type="text"
                value={form.bonusCurrencyName}
                onChange={(e) => setForm({ ...form, bonusCurrencyName: e.target.value })}
                placeholder="Бонус, Теңге, ₸, Ұпай..."
                className="max-w-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-medium"
              />
            </div>
          </div>

          {/* Granular Triggers Configuration */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">Бонус беру шарттары мен мөлшерлері</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Signup Bonus */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.bonusSignupEnabled}
                        onChange={(e) => setForm({ ...form, bonusSignupEnabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mb-3">
                    Жаңа оқырман тіркелгенде
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{form.bonusCurrencyName || 'Бонус'}:</span>
                  <input
                    type="number"
                    min="0"
                    value={form.bonusSignupAmount}
                    onChange={(e) => setForm({ ...form, bonusSignupAmount: parseInt(e.target.value) || 0 })}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right"
                  />
                </div>
              </div>

              {/* 2. Daily Login Bonus */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.bonusDailyLoginEnabled}
                        onChange={(e) => setForm({ ...form, bonusDailyLoginEnabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mb-3">
                    Күндік бонус
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{form.bonusCurrencyName || 'Бонус'}:</span>
                  <input
                    type="number"
                    min="0"
                    value={form.bonusDailyLoginAmount}
                    onChange={(e) => setForm({ ...form, bonusDailyLoginAmount: parseInt(e.target.value) || 0 })}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right"
                  />
                </div>
              </div>

              {/* 3. Audio Listening Milestone Bonus */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.bonusListeningEnabled}
                        onChange={(e) => setForm({ ...form, bonusListeningEnabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mb-3">
                    1 сағат тыңдалымға
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{form.bonusCurrencyName || 'Бонус'}:</span>
                  <input
                    type="number"
                    min="0"
                    value={form.bonusListeningAmount}
                    onChange={(e) => setForm({ ...form, bonusListeningAmount: parseInt(e.target.value) || 0 })}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right"
                  />
                </div>
              </div>

              {/* 4. Book Review Bonus */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.bonusReviewEnabled}
                        onChange={(e) => setForm({ ...form, bonusReviewEnabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mb-3">
                    Рейтинг, пікір
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{form.bonusCurrencyName || 'Бонус'}:</span>
                  <input
                    type="number"
                    min="0"
                    value={form.bonusReviewAmount}
                    onChange={(e) => setForm({ ...form, bonusReviewAmount: parseInt(e.target.value) || 0 })}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Сақталуда...' : 'Баптауларды сақтау'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: STATISTICS & READERS WITH BONUSES */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Барлық берілген</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">
                  {summary?.totalBonusesEarned?.toLocaleString('kk-KZ') || 0}
                </span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">{form.bonusCurrencyName}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Жазылымға жұмсалған</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">
                  {summary?.totalBonusesSpent?.toLocaleString('kk-KZ') || 0}
                </span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">{form.bonusCurrencyName}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Қазіргі қалдық баланс</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">
                  {summary?.totalActiveBonusesInCirculation?.toLocaleString('kk-KZ') || 0}
                </span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">{form.bonusCurrencyName}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Бонусы бар оқырмандар</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <User className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">
                  {summary?.totalUsersWithBonuses?.toLocaleString('kk-KZ') || 0}
                </span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">оқырман</span>
              </div>
            </div>
          </div>

          {/* Readers with Bonuses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filters Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Оқырман аты, Email, ID, @юзернейм..."
                  value={readersSearch}
                  onChange={(e) => {
                    setReadersSearch(e.target.value);
                    setReadersPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={readersSortBy}
                  onChange={(e) => {
                    setReadersSortBy(e.target.value);
                    setReadersPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-700 cursor-pointer"
                >
                  <option value="bonus_desc">Көп бонус бойынша</option>
                  <option value="bonus_asc">Аз бонус бойынша</option>
                  <option value="newest">Соңғы тіркелгендер</option>
                  <option value="oldest">Алғашқы тіркелгендер</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Оқырман</th>
                    <th className="py-3.5 px-4">ID нөмірі / Юзернейм</th>
                    <th className="py-3.5 px-4">Тіркелген күні</th>
                    <th className="py-3.5 px-4">Бонус балансы</th>
                    <th className="py-3.5 px-4 text-right">Әрекеттер</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isBonusReadersLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Жүктелуде...</span>
                        </div>
                      </td>
                    </tr>
                  ) : bonusReadersData?.content && bonusReadersData.content.length > 0 ? (
                    bonusReadersData.content.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* User info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 font-bold text-xs text-slate-700">
                              {r.avatarUrl ? (
                                <img src={r.avatarUrl} alt={r.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{r.name ? r.name.charAt(0).toUpperCase() : 'О'}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">
                                {r.name || 'Оқырман'}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {r.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* ID / Username */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-xs text-slate-800">
                            {r.idNumber || '—'}
                          </div>
                          {r.username && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              @{r.username.replace(/^@/, '')}
                            </div>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(r.createdAt)}
                        </td>

                        {/* Bonus Balance (Clickable to view history) */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReaderForHistory(r);
                              setHistoryPage(0);
                            }}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 font-bold text-xs transition-all shadow-xs cursor-pointer"
                            title="Оқырманның барлық бонус транзакцияларын көру"
                          >
                            <img src="/bonus-coin.png" alt="Бонус" className="w-4 h-4 object-contain group-hover:scale-110 transition-transform" />
                            <span>{(r.bonusBalance ?? 0).toLocaleString('kk-KZ')}</span>
                            <span className="text-[11px] font-semibold text-amber-700">{form.bonusCurrencyName || 'Бонус'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustUserId(r.idNumber || r.username || r.email || r.id);
                              setAdjustModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-xs"
                            title="Бонусты түзету"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Түзету</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Бонусы бар оқырмандар табылмады
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination matching Screenshot 2 & ReadersPage */}
            {bonusReadersData && (
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                {/* Page size selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Беттегі оқырман саны:
                  </span>
                  <select
                    value={readersPageSize}
                    onChange={(e) => {
                      setReadersPageSize(Number(e.target.value));
                      setReadersPage(1);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs text-slate-400 ml-1">
                    ({bonusReadersData.totalElements === 0 ? 0 : (readersPage - 1) * readersPageSize + 1}-
                    {Math.min(readersPage * readersPageSize, bonusReadersData.totalElements)} / Барлығы {bonusReadersData.totalElements})
                  </span>
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReadersPage((prev) => Math.max(1, prev - 1))}
                    disabled={readersPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-50 text-slate-700"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Алдыңғы
                  </button>

                  {/* Number buttons with ellipsis */}
                  {Array.from({ length: bonusReadersData.totalPages || 1 }, (_, i) => i + 1).map((pageNum) => {
                    const totalPages = bonusReadersData.totalPages || 1;
                    if (
                      totalPages > 7 &&
                      pageNum !== 1 &&
                      pageNum !== totalPages &&
                      Math.abs(pageNum - readersPage) > 1
                    ) {
                      if (pageNum === 2 && readersPage > 3) {
                        return (
                          <span key="dots-start" className="px-1 text-slate-400 text-xs">
                            ...
                          </span>
                        );
                      }
                      if (pageNum === totalPages - 1 && readersPage < totalPages - 2) {
                        return (
                          <span key="dots-end" className="px-1 text-slate-400 text-xs">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    const isActive = readersPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setReadersPage(pageNum)}
                        className={`min-w-[32px] h-[32px] px-2 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center ${
                          isActive
                            ? 'bg-[#025a9e] text-white border border-[#025a9e] shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setReadersPage((prev) => Math.min(bonusReadersData.totalPages || 1, prev + 1))}
                    disabled={readersPage >= (bonusReadersData.totalPages || 1) || bonusReadersData.totalElements === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-50 text-slate-700"
                  >
                    Кейінгі
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* READER BONUS HISTORY MODAL */}
      {selectedReaderForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setSelectedReaderForHistory(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 pr-8">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 font-bold text-amber-800">
                {selectedReaderForHistory.avatarUrl ? (
                  <img src={selectedReaderForHistory.avatarUrl} alt={selectedReaderForHistory.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{selectedReaderForHistory.name ? selectedReaderForHistory.name.charAt(0).toUpperCase() : 'О'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  <span className="truncate">{selectedReaderForHistory.name || 'Оқырман'}</span>
                </h3>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                  {selectedReaderForHistory.idNumber && (
                    <span className="font-mono font-bold text-slate-700">ID: {selectedReaderForHistory.idNumber}</span>
                  )}
                  {selectedReaderForHistory.username && (
                    <span className="text-slate-600">@{selectedReaderForHistory.username.replace(/^@/, '')}</span>
                  )}
                  <span className="text-slate-400">{selectedReaderForHistory.email}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Балансы</div>
                <div className="text-base font-black text-amber-700 flex items-center justify-end gap-1 mt-0.5">
                  <img src="/bonus-coin.png" alt="Бонус" className="w-4 h-4 object-contain" />
                  <span>{(selectedReaderForHistory.bonusBalance ?? 0).toLocaleString('kk-KZ')}</span>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
              {isReaderHistoryLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Жүктелуде...</span>
                  </div>
                </div>
              ) : readerHistoryData?.content && readerHistoryData.content.length > 0 ? (
                <div className="space-y-2.5">
                  {readerHistoryData.content.map((tx) => (
                    <div key={tx.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {getTypeBadge(tx.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {tx.description || 'Бонус операциясы'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatDate(tx.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 font-bold text-sm">
                        {tx.amount > 0 ? (
                          <span className="text-emerald-600 inline-flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />+{tx.amount} {form.bonusCurrencyName || 'Бонус'}
                          </span>
                        ) : (
                          <span className="text-purple-600 inline-flex items-center gap-0.5">
                            <ArrowDownLeft className="w-3.5 h-3.5" />{tx.amount} {form.bonusCurrencyName || 'Бонус'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Бұл оқырманда әлі бонус транзакциялары жоқ
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const userToAdjust = selectedReaderForHistory;
                  setSelectedReaderForHistory(null);
                  setAdjustUserId(userToAdjust.idNumber || userToAdjust.username || userToAdjust.email || userToAdjust.id);
                  setAdjustModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              >
                <Coins className="w-3.5 h-3.5" />
                Осы оқырманның бонусын түзету
              </button>

              <button
                type="button"
                onClick={() => setSelectedReaderForHistory(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Жабу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST BONUS MODAL */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setAdjustModalOpen(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Бонусты қолмен түзету</h3>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID немесе юзернейм
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="0000 0000"
                    value={adjustUserId}
                    onChange={(e) => handleIdInputChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-colors ${
                      lookupError && !lookupLoading
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-300 focus:ring-amber-500/20 focus:border-amber-500'
                    }`}
                  />
                  {lookupLoading && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {lookupError && !lookupLoading && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">
                    Табылмады
                  </p>
                )}
              </div>

              {/* Found User Profile Preview Card */}
              {foundUser && !lookupLoading && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-white border border-emerald-200 flex items-center justify-center flex-shrink-0">
                      {foundUser.avatarUrl ? (
                        <img src={foundUser.avatarUrl} alt={foundUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-xs text-slate-700">
                          {foundUser.name ? foundUser.name.charAt(0).toUpperCase() : 'О'}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {foundUser.name || 'Оқырман'}
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">✓ Табылды</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-slate-700">ID: {foundUser.idNumber || '—'}</span>
                        {foundUser.username && <span className="text-slate-600">@{foundUser.username.replace(/^@/, '')}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] text-slate-500 font-medium">Қазіргі балансы:</div>
                    <div className="text-xs font-black text-amber-700 flex items-center justify-end gap-1">
                      <img src="/bonus-coin.png" alt="Бонус" className="w-3.5 h-3.5 object-contain" />
                      {(foundUser.bonusBalance ?? 0).toLocaleString('kk-KZ')} {form.bonusCurrencyName || 'Бонус'}
                    </div>
                  </div>
                </div>
              )}

              {/* +/- Operation Mode Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Әрекет түрі
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAdjustMode('add')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      adjustMode === 'add'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Бонус қосу
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode('subtract')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      adjustMode === 'subtract'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    Бонусты азайту
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {form.bonusCurrencyName || 'Бонус'} мөлшері
                  </label>
                  {foundUser && (
                    <span className="text-[11px] text-slate-500">
                      Нәтижесі: <strong className={adjustMode === 'add' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                        {Math.max(0, (foundUser.bonusBalance ?? 0) + (adjustMode === 'add' ? (adjustAmount || 0) : -(adjustAmount || 0))).toLocaleString('kk-KZ')}
                      </strong> {form.bonusCurrencyName || 'Бонус'}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount || ''}
                  onChange={(e) => setAdjustAmount(Math.max(1, Math.abs(parseInt(e.target.value) || 0)))}
                  placeholder="100"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Түзету себебі:
                </label>
                <textarea
                  rows={2}
                  placeholder="Техникалық ақау"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Болдырмау
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending || (lookupError !== null && !foundUser)}
                  className="px-5 py-2 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {adjustMutation.isPending ? 'Түзетілуде...' : 'Түзетуді сақтау'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
