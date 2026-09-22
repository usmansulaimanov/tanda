import { create } from 'zustand';
import { api } from '../lib/api';
import { User, Book } from '../types';

export interface BookListeningStat {
  bookId: string;
  totalSeconds: number;
  totalMinutes: number;
  uniqueListeners: number;
  lastListenedAt: string;
  dailySeconds?: Record<string, number>;
}

export interface AuthorEarningDetail {
  authorId: string;
  authorName: string;
  assignedBookIds: string[];
  totalMinutes: number;
  totalEarned: number;
  status: 'calculated' | 'paid';
}

export interface RoyaltyPeriod {
  id: string; // e.g. "2026-09"
  month: string;
  monthLabel: string;
  totalSubscribers: number;
  subscriptionPrice: number;
  totalRevenue: number;
  adminExpense: number;
  netDistributablePool: number;
  companyShare: number;
  authorRoyaltyPool: number;
  totalMinutesListened: number;
  ratePerMinute: number;
  authorEarnings: AuthorEarningDetail[];
  isFinalized: boolean;
  finalizedAt?: string;
  adminNote?: string;
}

export interface PayoutRecord {
  id: string;
  authorId: string;
  authorName: string;
  amount: number;
  date: string;
  method: string;
  cardOrAccount?: string;
  status: 'completed' | 'processing' | 'requested' | 'rejected';
  rejectionReason?: string;
}

export interface AuthorDailyStat {
  date: string;
  label: string;
  shortLabel: string;
  seconds: number;
  minutes: number;
  isToday: boolean;
  isPeak: boolean;
}

export interface PeakDayInfo {
  date: string;
  label: string;
  seconds: number;
  minutes: number;
}

export interface AuthorStatsData {
  authorId: string;
  authorName: string;
  month: string;
  authorBooks: any[];
  totalMinutes: number;
  totalSeconds: number;
  estimatedEarned: number;
  ratePerMinute: number;
  currentBalance: number;
  periodStatus: 'calculated' | 'paid' | 'estimated';
  dailyList: AuthorDailyStat[];
  peakDay: PeakDayInfo | null;
  peakMinutes: number;
  peakSeconds: number;
  totalListenedDays: number;
  averageMinutes: number;
  lastListenedAt: string | null;
}

interface RoyaltyState {
  periods: Record<string, RoyaltyPeriod>;
  activeMonth: string;
  listeningStats: Record<string, BookListeningStat>;
  authorBalances: Record<string, number>;
  payoutHistory: PayoutRecord[];
  authorStatsCache: Record<string, AuthorStatsData>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPeriods: () => Promise<RoyaltyPeriod[]>;
  fetchPeriod: (monthKey: string) => Promise<RoyaltyPeriod | null>;
  calculateRoyalty: (
    monthKey: string,
    params: { totalRevenue: number; adminExpense: number; adminNote?: string },
    authors?: User[],
    books?: Book[]
  ) => Promise<RoyaltyPeriod | null>;
  finalizeRoyaltyPeriod: (monthKey: string) => Promise<{ success: boolean; error?: string }>;
  fetchAuthorStats: (authorId?: string, monthKey?: string) => Promise<AuthorStatsData | null>;
  fetchAuthorPayouts: () => Promise<PayoutRecord[]>;
  requestPayout: (
    authorId: string,
    authorName: string,
    amount: number,
    method: string,
    cardOrAccount?: string
  ) => Promise<{ success: boolean; error?: string }>;
  fetchAllAdminPayouts: () => Promise<PayoutRecord[]>;
  approvePayout: (id: string) => Promise<{ success: boolean; error?: string }>;
  rejectPayout: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  getAuthorStats: (
    author: User,
    books: Book[],
    monthKey?: string
  ) => {
    authorBooks: Book[];
    totalMinutes: number;
    totalSeconds: number;
    estimatedEarned: number;
    ratePerMinute: number;
    currentBalance: number;
    periodStatus?: 'calculated' | 'paid' | 'estimated';
  };
  recordListeningTime: (bookId: string, seconds: number) => void;
  resetAllStatsToZero: () => void;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Қаңтар',
  '02': 'Ақпан',
  '03': 'Наурыз',
  '04': 'Сәуір',
  '05': 'Мамыр',
  '06': 'Маусым',
  '07': 'Шілде',
  '08': 'Тамыз',
  '09': 'Қыркүйек',
  '10': 'Қазан',
  '11': 'Қараша',
  '12': 'Желтоқсан',
};

export const getMonthLabel = (monthKey: string): string => {
  const parts = monthKey.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const month = parts[1];
    return `${MONTH_NAMES[month] || month} ${year}`;
  }
  return monthKey;
};

const mapBackendPeriod = (dto: any): RoyaltyPeriod => {
  const isFinal = dto.status === 'FINALIZED';
  return {
    id: dto.month || dto.id,
    month: dto.month,
    monthLabel: dto.monthLabel || getMonthLabel(dto.month || dto.id),
    totalSubscribers: dto.totalRevenue ? Math.round(dto.totalRevenue / 2000) : 0,
    subscriptionPrice: 2000,
    totalRevenue: Number(dto.totalRevenue) || 0,
    adminExpense: Number(dto.adminExpense) || 0,
    netDistributablePool: Number(dto.netPool) || 0,
    companyShare: Number(dto.companyShare) || 0,
    authorRoyaltyPool: Number(dto.royaltyPool) || 0,
    totalMinutesListened: Number(dto.totalMinutes) || 0,
    ratePerMinute: Number(dto.ratePerMinute) || 0,
    authorEarnings: (dto.authorEarnings || []).map((ae: any) => ({
      authorId: ae.authorId,
      authorName: ae.authorName,
      assignedBookIds: ae.assignedBookIds || [],
      totalMinutes: Number(ae.totalMinutes) || 0,
      totalEarned: Number(ae.totalEarned) || 0,
      status: ae.status === 'paid' ? 'paid' : 'calculated',
    })),
    isFinalized: isFinal,
    finalizedAt: dto.finalizedAt,
    adminNote: dto.adminNote || '',
  };
};

const currentMonthKey = '2026-09';

// Clean up legacy localStorage keys
try {
  localStorage.removeItem('tanda_royalty_store_v3');
  localStorage.removeItem('tanda_royalty_store_v2');
  localStorage.removeItem('tanda_royalty_store');
} catch {}

export const useRoyaltyStore = create<RoyaltyState>((set, get) => ({
  periods: {},
  activeMonth: currentMonthKey,
  listeningStats: {},
  authorBalances: {},
  payoutHistory: [],
  authorStatsCache: {},
  isLoading: false,
  error: null,

  resetAllStatsToZero: () => {
    set({
      periods: {},
      listeningStats: {},
      authorBalances: {},
      payoutHistory: [],
      authorStatsCache: {},
    });
  },

  recordListeningTime: () => {
    // Handled by backend AudioSessionService
  },

  fetchPeriods: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/v1/admin/royalty/periods');
      const periodsMap: Record<string, RoyaltyPeriod> = {};
      (res.data || []).forEach((item: any) => {
        const mapped = mapBackendPeriod(item);
        periodsMap[mapped.id] = mapped;
      });
      set({ periods: periodsMap, isLoading: false });
      return Object.values(periodsMap);
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return [];
    }
  },

  fetchPeriod: async (monthKey: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/api/v1/admin/royalty/periods/${monthKey}`);
      const period = mapBackendPeriod(res.data);
      set((state) => ({
        periods: {
          ...state.periods,
          [monthKey]: period,
        },
        isLoading: false,
      }));
      return period;
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return null;
    }
  },

  calculateRoyalty: async (monthKey, params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/v1/admin/royalty/periods/${monthKey}/calculate`, {
        totalRevenue: params.totalRevenue,
        adminExpense: params.adminExpense,
        adminNote: params.adminNote,
      });
      const period = mapBackendPeriod(res.data);
      set((state) => ({
        periods: {
          ...state.periods,
          [monthKey]: period,
        },
        isLoading: false,
      }));
      return period;
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.message || err.message });
      return null;
    }
  },

  finalizeRoyaltyPeriod: async (monthKey: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/v1/admin/royalty/periods/${monthKey}/finalize`);
      const period = mapBackendPeriod(res.data);

      const newBalances = { ...get().authorBalances };
      period.authorEarnings.forEach((ae) => {
        newBalances[ae.authorId] = (newBalances[ae.authorId] || 0) + ae.totalEarned;
      });

      set((state) => ({
        periods: {
          ...state.periods,
          [monthKey]: period,
        },
        authorBalances: newBalances,
        isLoading: false,
      }));
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Бекіту сәтсіз аяқталды';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  fetchAuthorStats: async (authorId?: string, monthKey?: string) => {
    try {
      const targetMonth = monthKey || get().activeMonth || currentMonthKey;
      const params: Record<string, string> = { month: targetMonth };
      if (authorId) {
        params.authorId = authorId;
      }
      const res = await api.get('/api/v1/authors/me/stats', { params });
      const data = res.data;
      const statsObj: AuthorStatsData = {
        authorId: data.authorId,
        authorName: data.authorName,
        month: data.month,
        authorBooks: data.authorBooks || [],
        totalMinutes: Number(data.totalMinutes) || 0,
        totalSeconds: Number(data.totalSeconds) || 0,
        estimatedEarned: Number(data.estimatedEarned) || 0,
        ratePerMinute: Number(data.ratePerMinute) || 0,
        currentBalance: Number(data.currentBalance) || 0,
        periodStatus: data.periodStatus || 'estimated',
        dailyList: data.dailyList || [],
        peakDay: data.peakDay || null,
        peakMinutes: Number(data.peakMinutes) || 0,
        peakSeconds: Number(data.peakSeconds) || 0,
        totalListenedDays: Number(data.totalListenedDays) || 0,
        averageMinutes: Number(data.averageMinutes) || 0,
        lastListenedAt: data.lastListenedAt || null,
      };

      const cacheKey = `${data.authorId}_${targetMonth}`;
      set((state) => ({
        authorStatsCache: {
          ...state.authorStatsCache,
          [cacheKey]: statsObj,
        },
        authorBalances: {
          ...state.authorBalances,
          [data.authorId]: statsObj.currentBalance,
        },
      }));
      return statsObj;
    } catch (err) {
      return null;
    }
  },

  fetchAuthorPayouts: async () => {
    try {
      const res = await api.get('/api/v1/authors/me/payouts');
      const records: PayoutRecord[] = (res.data || []).map((p: any) => ({
        id: p.id,
        authorId: p.authorId,
        authorName: p.authorName,
        amount: Number(p.amount) || 0,
        date: p.requestedAt ? p.requestedAt.split('T')[0] : '',
        method: p.method || 'Kaspi Gold',
        cardOrAccount: p.cardOrAccount,
        status: (p.status || 'requested').toLowerCase() as any,
        rejectionReason: p.rejectionReason,
      }));
      set({ payoutHistory: records });
      return records;
    } catch (err) {
      return [];
    }
  },

  requestPayout: async (authorId, authorName, amount, method, cardOrAccount) => {
    try {
      const res = await api.post('/api/v1/authors/me/payouts', {
        amount,
        method,
        cardOrAccount,
      });
      const p = res.data;
      const newRecord: PayoutRecord = {
        id: p.id,
        authorId: p.authorId,
        authorName: p.authorName || authorName,
        amount: Number(p.amount) || amount,
        date: p.requestedAt ? p.requestedAt.split('T')[0] : new Date().toISOString().split('T')[0],
        method: p.method || method,
        cardOrAccount: p.cardOrAccount || cardOrAccount,
        status: (p.status || 'requested').toLowerCase() as any,
      };

      const currentBalance = get().authorBalances[authorId] || 0;
      set((state) => ({
        authorBalances: {
          ...state.authorBalances,
          [authorId]: Math.max(0, currentBalance - amount),
        },
        payoutHistory: [newRecord, ...state.payoutHistory],
      }));

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || err.message || 'Шығару сәтсіз аяқталды',
      };
    }
  },

  fetchAllAdminPayouts: async () => {
    try {
      const res = await api.get('/api/v1/admin/payouts');
      return (res.data || []).map((p: any) => ({
        id: p.id,
        authorId: p.authorId,
        authorName: p.authorName,
        amount: Number(p.amount) || 0,
        date: p.requestedAt ? p.requestedAt.split('T')[0] : '',
        method: p.method,
        cardOrAccount: p.cardOrAccount,
        status: (p.status || 'requested').toLowerCase() as any,
        rejectionReason: p.rejectionReason,
      }));
    } catch (err) {
      return [];
    }
  },

  approvePayout: async (id: string) => {
    try {
      await api.patch(`/api/v1/admin/payouts/${id}/approve`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  rejectPayout: async (id: string, reason?: string) => {
    try {
      await api.patch(`/api/v1/admin/payouts/${id}/reject`, { reason });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  getAuthorStats: (author, books, monthKey) => {
    const state = get();
    const targetMonth = monthKey || state.activeMonth || currentMonthKey;
    const cacheKey = `${author.id}_${targetMonth}`;
    const cached = state.authorStatsCache[cacheKey];

    if (cached) {
      return {
        authorBooks: books.filter((b) => cached.authorBooks.some((ab: any) => ab.id === b.id)),
        totalMinutes: cached.totalMinutes,
        totalSeconds: cached.totalSeconds,
        estimatedEarned: cached.estimatedEarned,
        ratePerMinute: cached.ratePerMinute,
        currentBalance: cached.currentBalance,
        periodStatus: cached.periodStatus,
      };
    }

    const period = state.periods[targetMonth];
    const matchName = (author.assignedAuthorName || author.name).toLowerCase().trim();
    const assignedIds = new Set(author.assignedBookIds || []);

    const authorBooks = books.filter((b) => {
      if (assignedIds.has(b.id)) return true;
      if (!b.author) return false;
      const bAuthor = b.author.toLowerCase().trim();
      return bAuthor === matchName || bAuthor.includes(matchName);
    });

    return {
      authorBooks,
      totalMinutes: 0,
      totalSeconds: 0,
      estimatedEarned: 0,
      ratePerMinute: period?.ratePerMinute || 0,
      currentBalance: state.authorBalances[author.id] || 0,
      periodStatus: period?.isFinalized ? 'paid' : 'estimated',
    };
  },
}));
