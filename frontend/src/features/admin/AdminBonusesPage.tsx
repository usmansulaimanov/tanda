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
  X
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

  // Query Transactions
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [page, setPage] = useState(0);

  const { data: transactionsData, isLoading: isTransactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['adminBonusTransactions', searchQuery, selectedType, page],
    queryFn: () => bonusApi.getAdminTransactions(searchQuery || undefined, selectedType, page, 20),
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
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('');

  const adjustMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      bonusApi.adjustUserBonus(userId, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBonusSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminBonusTransactions'] });
      showToast('Оқырманның бонустары сәтті түзетілді', 'success');
      setAdjustModalOpen(false);
      setAdjustUserId('');
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
    adjustMutation.mutate({
      userId: adjustUserId.trim(),
      amount: adjustAmount,
      reason: adjustReason.trim(),
    });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SIGNUP':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">🎉 Тіркелу</span>;
      case 'DAILY_LOGIN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">📅 Күндік кіру</span>;
      case 'LISTENING_MILESTONE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">🎧 Тыңдалым (1 сағат)</span>;
      case 'REVIEW':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">✍️ Пікір жазу</span>;
      case 'SUBSCRIPTION_PURCHASE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">👑 Жазылым алу</span>;
      case 'ADMIN_ADJUSTMENT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">⚙️ Әкімші түзетуі</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('kk-KZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (!isAuthInitialized || isSettingsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse flex flex-col gap-6">
          <div className="h-10 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Бонус жүйесі
                {form.bonusSystemEnabled ? (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Қосулы
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Өшірулі
                  </span>
                )}
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          Баптаулар
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Статистика және транзакциялар
        </button>
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Main Master Switch Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Бонус жүйесі</h2>
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

            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Валюта
                </label>
                <input
                  type="text"
                  value={form.bonusCurrencyName}
                  onChange={(e) => setForm({ ...form, bonusCurrencyName: e.target.value })}
                  placeholder="Бонус, Теңге, ₸, Ұпай..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Granular Triggers Configuration */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Бонус беру шарттары мен мөлшерлері</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Signup Bonus */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    Жаңа оқырман тіркелгенде
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Бонус сомасы:</span>
                  <input
                    type="number"
                    min="0"
                    value={form.bonusSignupAmount}
                    onChange={(e) => setForm({ ...form, bonusSignupAmount: parseInt(e.target.value) || 0 })}
                    className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-500">{form.bonusCurrencyName}</span>
                </div>
              </div>

              {/* 2. Daily Login Bonus */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <Calendar className="w-4 h-4" />
                    </div>
                    Күндік бонус
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Бонус сомасы:</span>
                  <input
                    type="number"
                    min="0"
                    value={form.bonusDailyLoginAmount}
                    onChange={(e) => setForm({ ...form, bonusDailyLoginAmount: parseInt(e.target.value) || 0 })}
                    className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-500">{form.bonusCurrencyName}</span>
                </div>
              </div>

              {/* 3. Audio Listening Milestone Bonus */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                      <Headphones className="w-4 h-4" />
                    </div>
                    1 сағат тыңдалымға
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Бонус сомасы:</span>
                  <input
                    type="number"
                    min="0"
                    value={form.bonusListeningAmount}
                    onChange={(e) => setForm({ ...form, bonusListeningAmount: parseInt(e.target.value) || 0 })}
                    className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-500">{form.bonusCurrencyName}</span>
                </div>
              </div>

              {/* 4. Book Review Bonus */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    Рейтинг, пікір
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Бонус сомасы:</span>
                  <input
                    type="number"
                    min="0"
                    value={form.bonusReviewAmount}
                    onChange={(e) => setForm({ ...form, bonusReviewAmount: parseInt(e.target.value) || 0 })}
                    className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-500">{form.bonusCurrencyName}</span>
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

      {/* TAB 2: STATISTICS & TRANSACTIONS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Жалпы берілген</span>
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
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Қолданыстағы белсенді</span>
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

          {/* Transactions Filter & Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filters Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Оқырман аты, Email, ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setPage(0);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-slate-700"
                >
                  <option value="ALL">Барлық транзакциялар</option>
                  <option value="SIGNUP">🎉 Тіркелу</option>
                  <option value="DAILY_LOGIN">📅 Күндік кіру</option>
                  <option value="LISTENING_MILESTONE">🎧 Тыңдалым</option>
                  <option value="REVIEW">✍️ Пікір жазу</option>
                  <option value="SUBSCRIPTION_PURCHASE">👑 Жазылым алу</option>
                  <option value="ADMIN_ADJUSTMENT">⚙️ Әкімші түзетуі</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Оқырман</th>
                    <th className="py-3 px-4">Әрекет түрі</th>
                    <th className="py-3 px-4">Сомасы</th>
                    <th className="py-3 px-4">Сипаттамасы</th>
                    <th className="py-3 px-4 text-right">Уақыты</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isTransactionsLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Жүктелуде...
                      </td>
                    </tr>
                  ) : transactionsData?.content && transactionsData.content.length > 0 ? (
                    transactionsData.content.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {tx.userName || 'Оқырман'}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            {tx.userIdNumber && <span className="font-mono">ID: {tx.userIdNumber}</span>}
                            {tx.userUsername && <span>@{tx.userUsername}</span>}
                            {!tx.userUsername && !tx.userIdNumber && tx.userEmail && <span>{tx.userEmail}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getTypeBadge(tx.type)}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {tx.amount > 0 ? (
                            <span className="text-emerald-600 inline-flex items-center gap-0.5">
                              <ArrowUpRight className="w-3.5 h-3.5" />+{tx.amount} {form.bonusCurrencyName}
                            </span>
                          ) : (
                            <span className="text-purple-600 inline-flex items-center gap-0.5">
                              <ArrowDownLeft className="w-3.5 h-3.5" />{tx.amount} {form.bonusCurrencyName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs max-w-xs truncate" title={tx.description}>
                          {tx.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-slate-400 whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Транзакциялар табылмады
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {transactionsData && transactionsData.totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Барлығы: <strong>{transactionsData.totalElements}</strong> жазба
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 font-medium hover:bg-slate-100 disabled:opacity-40"
                  >
                    Артқа
                  </button>
                  <span>
                    {page + 1} / {transactionsData.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= transactionsData.totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 font-medium hover:bg-slate-100 disabled:opacity-40"
                  >
                    Алға
                  </button>
                </div>
              </div>
            )}
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
                <p className="text-xs text-slate-500">Оқырманға бонус қосу немесе азайту</p>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Оқырманның User ID (немесе Email)
                </label>
                <input
                  type="text"
                  required
                  placeholder="мысалы: user-abc12345"
                  value={adjustUserId}
                  onChange={(e) => setAdjustUserId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Бонус мөлшері (Қосу үшін оң сан, азайту үшін теріс сан: мысалы +50 немесе -50)
                </label>
                <input
                  type="number"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Түзету себебі (Себебі транзакциялар тарихында көрінеді)
                </label>
                <textarea
                  rows={2}
                  placeholder="мысалы: Науқандық сыйлық немесе техникалық қатені өтеу"
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
                  disabled={adjustMutation.isPending}
                  className="px-5 py-2 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {adjustMutation.isPending ? 'Түзетілуде...' : 'Түзетуді сақтау'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
