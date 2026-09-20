import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Book } from '../types';

export interface BookListeningStat {
  bookId: string;
  totalSeconds: number;
  totalMinutes: number;
  uniqueListeners: number;
  lastListenedAt: string;
  dailySeconds?: Record<string, number>; // "YYYY-MM-DD" -> seconds
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
  monthLabel: string; // e.g. "Қыркүйек 2026"
  totalSubscribers: number;
  subscriptionPrice: number;
  totalRevenue: number;
  adminExpense: number;
  netDistributablePool: number; // totalRevenue - adminExpense
  companyShare: number; // 50% of netDistributablePool
  authorRoyaltyPool: number; // 50% of netDistributablePool
  totalMinutesListened: number;
  ratePerMinute: number; // authorRoyaltyPool / totalMinutesListened (0 if 0 min)
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
  status: 'completed' | 'processing';
}

interface RoyaltyState {
  periods: Record<string, RoyaltyPeriod>;
  activeMonth: string;
  listeningStats: Record<string, BookListeningStat>;
  authorBalances: Record<string, number>; // authorId -> payable balance (₸)
  payoutHistory: PayoutRecord[];

  // Actions
  recordListeningTime: (bookId: string, seconds: number) => void;
  calculateRoyalty: (
    monthKey: string,
    params: { totalRevenue: number; adminExpense: number; adminNote?: string },
    authors: User[],
    books: Book[]
  ) => RoyaltyPeriod;
  finalizeRoyaltyPeriod: (monthKey: string) => { success: boolean; error?: string };
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
  requestPayout: (
    authorId: string,
    authorName: string,
    amount: number,
    method: string,
    cardOrAccount?: string
  ) => { success: boolean; error?: string };
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

const currentMonthKey = '2026-09';

export const useRoyaltyStore = create<RoyaltyState>()(
  persist(
    (set, get) => ({
      periods: {},
      activeMonth: currentMonthKey,
      listeningStats: {},
      authorBalances: {},
      payoutHistory: [],

      resetAllStatsToZero: () => {
        set({
          periods: {},
          listeningStats: {},
          authorBalances: {},
          payoutHistory: [],
        });
      },

      recordListeningTime: (bookId: string, seconds: number) => {
        if (!bookId || seconds <= 0) return;
        const today = new Date().toISOString().split('T')[0];
        set((state) => {
          const current = state.listeningStats[bookId] || {
            bookId,
            totalSeconds: 0,
            totalMinutes: 0,
            uniqueListeners: 1,
            dailySeconds: {},
            lastListenedAt: new Date().toISOString(),
          };

          const newSeconds = current.totalSeconds + seconds;
          const newMinutes = Math.floor(newSeconds / 60);
          const currentDaily = current.dailySeconds || {};
          const newDailySec = (currentDaily[today] || 0) + seconds;

          return {
            listeningStats: {
              ...state.listeningStats,
              [bookId]: {
                ...current,
                totalSeconds: newSeconds,
                totalMinutes: newMinutes,
                dailySeconds: {
                  ...currentDaily,
                  [today]: newDailySec,
                },
                lastListenedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      calculateRoyalty: (monthKey, params, authors, books) => {
        const state = get();
        const totalRevenue = Math.max(0, params.totalRevenue || 0);
        const adminExpense = Math.max(0, params.adminExpense || 0);
        const netPool = Math.max(0, totalRevenue - adminExpense);
        
        // 50 / 50 Rule
        const companyShare = Math.round(netPool * 0.5);
        const authorRoyaltyPool = netPool - companyShare;

        // Calculate REAL minutes per author based on their assigned books and real listeningStats only
        let totalPlatformMinutes = 0;
        const authorEarnings: AuthorEarningDetail[] = [];

        authors.forEach((author) => {
          const matchName = (author.assignedAuthorName || author.name).toLowerCase().trim();
          const assignedIds = new Set(author.assignedBookIds || []);

          const authorBooks = books.filter((b) => {
            if (assignedIds.has(b.id)) return true;
            if (!b.author) return false;
            const bAuthor = b.author.toLowerCase().trim();
            return bAuthor === matchName || bAuthor.includes(matchName);
          });

          const bookIds = authorBooks.map((b) => b.id);

          // Strictly real tracked minutes (0 if not yet listened)
          let authorMinutes = 0;
          authorBooks.forEach((b) => {
            const recorded = state.listeningStats[b.id]?.totalMinutes;
            if (recorded && recorded > 0) {
              authorMinutes += recorded;
            }
          });

          totalPlatformMinutes += authorMinutes;

          authorEarnings.push({
            authorId: author.id,
            authorName: author.name,
            assignedBookIds: bookIds,
            totalMinutes: authorMinutes,
            totalEarned: 0,
            status: 'calculated',
          });
        });

        const ratePerMinute = totalPlatformMinutes > 0
          ? Number((authorRoyaltyPool / totalPlatformMinutes).toFixed(4))
          : 0;

        authorEarnings.forEach((ae) => {
          ae.totalEarned = totalPlatformMinutes > 0 ? Math.round(ae.totalMinutes * ratePerMinute) : 0;
        });

        const newPeriod: RoyaltyPeriod = {
          id: monthKey,
          monthLabel: getMonthLabel(monthKey),
          totalSubscribers: totalRevenue > 0 ? Math.round(totalRevenue / 2000) : 0,
          subscriptionPrice: 2000,
          totalRevenue,
          adminExpense,
          netDistributablePool: netPool,
          companyShare,
          authorRoyaltyPool,
          totalMinutesListened: totalPlatformMinutes,
          ratePerMinute,
          authorEarnings,
          isFinalized: false,
          adminNote: params.adminNote || '',
        };

        set({
          periods: {
            ...state.periods,
            [monthKey]: newPeriod,
          },
        });

        return newPeriod;
      },

      finalizeRoyaltyPeriod: (monthKey: string) => {
        const state = get();
        const period = state.periods[monthKey];
        if (!period) {
          return { success: false, error: 'Кезең табылмады' };
        }
        if (period.isFinalized) {
          return { success: false, error: 'Бұл кезең бұрыннан бекітілген' };
        }

        const newBalances = { ...state.authorBalances };
        period.authorEarnings.forEach((ae) => {
          newBalances[ae.authorId] = (newBalances[ae.authorId] || 0) + ae.totalEarned;
          ae.status = 'paid';
        });

        const updatedPeriod: RoyaltyPeriod = {
          ...period,
          isFinalized: true,
          finalizedAt: new Date().toISOString(),
        };

        set({
          periods: {
            ...state.periods,
            [monthKey]: updatedPeriod,
          },
          authorBalances: newBalances,
        });

        return { success: true };
      },

      getAuthorStats: (author, books, monthKey) => {
        const state = get();
        const targetMonth = monthKey || state.activeMonth || currentMonthKey;
        const period = state.periods[targetMonth];

        const matchName = (author.assignedAuthorName || author.name).toLowerCase().trim();
        const assignedIds = new Set(author.assignedBookIds || []);

        const authorBooks = books.filter((b) => {
          if (assignedIds.has(b.id)) return true;
          if (!b.author) return false;
          const bAuthor = b.author.toLowerCase().trim();
          return bAuthor === matchName || bAuthor.includes(matchName);
        });

        // Strictly real tracked seconds & minutes
        let totalMinutes = 0;
        let totalSeconds = 0;
        authorBooks.forEach((b) => {
          const stat = state.listeningStats[b.id];
          if (stat) {
            totalSeconds += Math.floor(stat.totalSeconds || 0);
            totalMinutes += stat.totalMinutes || 0;
          }
        });

        const ratePerMinute = period?.ratePerMinute || 0;
        const estimatedEarned = Math.round(totalMinutes * ratePerMinute);
        const currentBalance = state.authorBalances[author.id] || 0;

        return {
          authorBooks,
          totalMinutes,
          totalSeconds,
          estimatedEarned,
          ratePerMinute,
          currentBalance,
          periodStatus: period?.isFinalized ? 'paid' : 'estimated',
        };
      },

      requestPayout: (authorId, authorName, amount, method, cardOrAccount) => {
        const state = get();
        const balance = state.authorBalances[authorId] || 0;
        if (amount <= 0 || amount > balance) {
          return { success: false, error: 'Шығару сомасы баланстан аспауы тиіс' };
        }

        const newRecord: PayoutRecord = {
          id: `PO-${Date.now()}`,
          authorId,
          authorName,
          amount,
          date: new Date().toISOString().split('T')[0],
          method,
          cardOrAccount,
          status: 'completed',
        };

        set({
          authorBalances: {
            ...state.authorBalances,
            [authorId]: balance - amount,
          },
          payoutHistory: [newRecord, ...state.payoutHistory],
        });

        return { success: true };
      },
    }),
    {
      name: 'tanda_royalty_store_v3', // v3: All mock data removed, fresh zero state
    }
  )
);
