import { create } from 'zustand';
import { api } from '../lib/api';

export interface PromoUsageRecord {
  userId: string;
  userName: string;
  userEmail: string;
  usedAt: string;
}

export interface PromoCode {
  id: string;
  batchId: string;
  batchName?: string;
  code: string;
  rewardType: 'subscription_1m' | 'subscription_3m' | 'subscription_6m' | 'subscription_1y' | 'discount_50' | 'premium_access' | 'custom';
  rewardTitle: string;
  description?: string;
  durationDays: number; // Duration in days to claim/activate before code expires
  expiresAt: string; // ISO date when unclaimed promo expires
  maxUses: number;
  usedCount: number;
  usedBy: PromoUsageRecord[];
  isActive: boolean;
  isIssued?: boolean; // Whether admin marked code as given/sent
  note?: string; // Admin note (e.g. whom it was given to)
  createdAt: string;
}

export function getPromoAccessDurationDays(promo: { rewardTitle?: string; rewardType?: string }): number | 'infinite' {
  const title = (promo.rewardTitle || '').toLowerCase();
  const type = promo.rewardType || '';

  if (title.includes('мәңгі') || title.includes('шектеусіз') || title.includes('вечный') || title.includes('бессрочн')) {
    return 'infinite';
  }
  if (title.includes('12 ай') || title.includes('1 жыл') || title.includes('жылдық') || type === 'subscription_1y') {
    return 365;
  }
  if (title.includes('6 ай') || type === 'subscription_6m') {
    return 180;
  }
  if (title.includes('3 ай') || type === 'subscription_3m') {
    return 90;
  }
  if (title.includes('1 ай') || title.includes('айлық') || type === 'subscription_1m') {
    return 30;
  }

  // Check for explicit "X күн" in title
  const daysMatch = title.match(/(\d+)\s*(?:күн|day|дней|дня)/i);
  if (daysMatch) {
    return parseInt(daysMatch[1], 10);
  }

  // Fallback defaults based on type
  if (type === 'subscription_3m') return 90;
  if (type === 'subscription_6m') return 180;
  if (type === 'subscription_1y') return 365;
  if (type === 'subscription_1m') return 30;

  return 30;
}

export function getPromoRemainingDays(
  promo: PromoCode,
  userId?: string
): { isInfinite: boolean; daysRemaining: number; isActive: boolean; statusText: string } {
  const accessDuration = getPromoAccessDurationDays(promo);
  if (accessDuration === 'infinite') {
    return {
      isInfinite: true,
      daysRemaining: Infinity,
      isActive: true,
      statusText: 'Белсенді (Мәңгі)',
    };
  }

  const usage = userId ? promo.usedBy?.find((u) => u.userId === userId) : promo.usedBy?.[0];
  const usedAtMs = usage?.usedAt
    ? new Date(usage.usedAt).getTime()
    : (promo.createdAt ? new Date(promo.createdAt).getTime() : Date.now());
  const expiryMs = usedAtMs + accessDuration * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diffMs = expiryMs - now;
  const daysRemaining = diffMs > 0 ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) : 0;
  const isActive = daysRemaining > 0;

  return {
    isInfinite: false,
    daysRemaining,
    isActive,
    statusText: isActive ? `Белсенді (${daysRemaining} күн қалды)` : 'Мерзімі аяқталды',
  };
}

export interface PromoBatch {
  id: string;
  name: string;
  rewardType: PromoCode['rewardType'];
  rewardTitle: string;
  durationDays: number;
  expiresAt: string;
  prefix: string;
  totalCodes: number;
  createdAt: string;
}

interface GenerateOptions {
  batchName?: string;
  count: number;
  rewardType?: PromoCode['rewardType'];
  rewardTitle: string;
  durationDays: number;
  customWord?: string;
  prefix?: string;
  maxUses?: number;
  discountPercent?: number;
}

interface PromoState {
  batches: PromoBatch[];
  promocodes: PromoCode[];
  userPromos: PromoCode[];
  isLoading: boolean;

  fetchBatches: () => Promise<void>;
  fetchPromoCodes: () => Promise<void>;
  fetchUserActivatedPromos: () => Promise<void>;

  generatePromoCodes: (options: GenerateOptions) => Promise<{ batch: PromoBatch; codes: PromoCode[] }>;
  validatePromoCode: (code: string) => Promise<{ valid: boolean; message?: string; rewardTitle?: string }>;
  activatePromoCode: (
    code: string,
    user?: { id: string; name?: string; email: string }
  ) => Promise<{ success: boolean; rewardTitle?: string; error?: string }>;

  deletePromoCode: (codeId: string) => Promise<void>;
  togglePromoCodeStatus: (codeId: string) => Promise<void>;
  togglePromoIssued: (codeId: string, isIssued?: boolean) => Promise<void>;
  updatePromoNote: (codeId: string, note: string) => Promise<void>;

  deleteBatch: (batchId: string) => Promise<void>;
  toggleBatchStatus: (batchId: string, isActive?: boolean) => Promise<void>;
  getUserActivatedPromos: (userId: string) => PromoCode[];
}

export const usePromoStore = create<PromoState>((set, get) => ({
  batches: [],
  promocodes: [],
  userPromos: [],
  isLoading: false,

  fetchBatches: async () => {
    try {
      const res = await api.get<PromoBatch[]>('/api/v1/admin/promo-codes/batches');
      set({ batches: res.data || [] });
    } catch (err) {
      console.error('Failed to fetch promo batches:', err);
    }
  },

  fetchPromoCodes: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get<PromoCode[]>('/api/v1/admin/promo-codes');
      set({ promocodes: res.data || [], isLoading: false });
    } catch (err) {
      console.error('Failed to fetch promo codes:', err);
      set({ isLoading: false });
    }
  },

  fetchUserActivatedPromos: async () => {
    try {
      const res = await api.get<PromoCode[]>('/api/v1/me/promo-codes');
      set({ userPromos: res.data || [] });
    } catch (err) {
      console.error('Failed to fetch user promos:', err);
    }
  },

  generatePromoCodes: async (options) => {
    try {
      const res = await api.post<{ batch: PromoBatch; codes: PromoCode[] }>(
        '/api/v1/admin/promo-codes',
        options
      );
      const { batch, codes } = res.data;
      set((state) => ({
        batches: [batch, ...state.batches],
        promocodes: [...codes, ...state.promocodes],
      }));
      return { batch, codes };
    } catch (err: any) {
      console.error('Failed to generate promo codes:', err);
      throw err;
    }
  },

  validatePromoCode: async (code) => {
    try {
      const res = await api.post<{
        valid: boolean;
        message?: string;
        rewardTitle?: string;
        rewardType?: string;
      }>('/api/v1/promo-codes/validate', { code });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Тексеру сәтсіз аяқталды';
      return { valid: false, message: msg };
    }
  },

  activatePromoCode: async (code) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Промокодты енгізіңіз' };
    }

    try {
      const res = await api.post<{
        success: boolean;
        rewardTitle?: string;
        rewardType?: string;
        message?: string;
      }>('/api/v1/promo-codes/apply', { code: cleanCode });

      // Refresh user activated promos
      get().fetchUserActivatedPromos();

      return {
        success: true,
        rewardTitle: res.data.rewardTitle || 'Сыйлық',
      };
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Промокодты белсендіру сәтсіз аяқталды';
      return { success: false, error: msg };
    }
  },

  deletePromoCode: async (codeId) => {
    try {
      await api.delete(`/api/v1/admin/promo-codes/${codeId}`);
      set((state) => {
        const updatedCodes = state.promocodes.filter((c) => c.id !== codeId);
        return { promocodes: updatedCodes };
      });
      // Optionally refresh batches for total count
      get().fetchBatches();
    } catch (err) {
      console.error('Failed to delete promo code:', err);
    }
  },

  togglePromoCodeStatus: async (codeId) => {
    const code = get().promocodes.find((c) => c.id === codeId);
    if (!code) return;
    try {
      const nextActive = !code.isActive;
      await api.patch(`/api/v1/admin/promo-codes/${codeId}`, { isActive: nextActive });
      set((state) => ({
        promocodes: state.promocodes.map((c) =>
          c.id === codeId ? { ...c, isActive: nextActive } : c
        ),
      }));
    } catch (err) {
      console.error('Failed to toggle promo code status:', err);
    }
  },

  togglePromoIssued: async (codeId, isIssued) => {
    const code = get().promocodes.find((c) => c.id === codeId);
    if (!code) return;
    const nextIssued = typeof isIssued === 'boolean' ? isIssued : !code.isIssued;
    try {
      await api.patch(`/api/v1/admin/promo-codes/${codeId}`, { isIssued: nextIssued });
      set((state) => ({
        promocodes: state.promocodes.map((c) =>
          c.id === codeId ? { ...c, isIssued: nextIssued } : c
        ),
      }));
    } catch (err) {
      console.error('Failed to toggle promo issued:', err);
    }
  },

  updatePromoNote: async (codeId, note) => {
    try {
      await api.patch(`/api/v1/admin/promo-codes/${codeId}`, { note });
      set((state) => ({
        promocodes: state.promocodes.map((c) =>
          c.id === codeId ? { ...c, note } : c
        ),
      }));
    } catch (err) {
      console.error('Failed to update promo note:', err);
    }
  },

  deleteBatch: async (batchId) => {
    try {
      await api.delete(`/api/v1/admin/promo-codes/batches/${batchId}`);
      set((state) => ({
        batches: state.batches.filter((b) => b.id !== batchId),
        promocodes: state.promocodes.filter((c) => c.batchId !== batchId),
      }));
    } catch (err) {
      console.error('Failed to delete promo batch:', err);
    }
  },

  toggleBatchStatus: async (batchId, isActive) => {
    try {
      const url =
        typeof isActive === 'boolean'
          ? `/api/v1/admin/promo-codes/batches/${batchId}/toggle-status?isActive=${isActive}`
          : `/api/v1/admin/promo-codes/batches/${batchId}/toggle-status`;
      await api.patch(url);
      await get().fetchPromoCodes();
    } catch (err) {
      console.error('Failed to toggle batch status:', err);
    }
  },

  getUserActivatedPromos: (userId) => {
    const userPromos = get().userPromos;
    if (userPromos && userPromos.length > 0) {
      return userPromos;
    }
    return (get().promocodes || []).filter((p) =>
      p.usedBy?.some((u) => u.userId === userId)
    );
  },
}));
