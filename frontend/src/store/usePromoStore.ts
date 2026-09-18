import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

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
}

interface PromoState {
  batches: PromoBatch[];
  promocodes: PromoCode[];
  generatePromoCodes: (options: GenerateOptions) => { batch: PromoBatch; codes: PromoCode[] };
  activatePromoCode: (
    code: string,
    user: { id: string; name?: string; email: string }
  ) => { success: boolean; rewardTitle?: string; error?: string };
  deletePromoCode: (codeId: string) => void;
  togglePromoCodeStatus: (codeId: string) => void;
  togglePromoIssued: (codeId: string, isIssued?: boolean) => void;
  updatePromoNote: (codeId: string, note: string) => void;
  deleteBatch: (batchId: string) => void;
  toggleBatchStatus: (batchId: string, isActive?: boolean) => void;
  getUserActivatedPromos: (userId: string) => PromoCode[];
}

const DEFAULT_BATCH_ID = 'batch-default-001';

const DEFAULT_BATCHES: PromoBatch[] = [
  {
    id: DEFAULT_BATCH_ID,
    name: '№1 Топтама: Стандартты промокодтар',
    rewardType: 'subscription_1m',
    rewardTitle: '1 айлық тегін жазылым (Премиум)',
    durationDays: 30,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    prefix: 'TANDA',
    totalCodes: 2,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_PROMOCODES: PromoCode[] = [
  {
    id: 'promo-001',
    batchId: DEFAULT_BATCH_ID,
    batchName: '№1 Топтама: Стандартты промокодтар',
    code: 'TANDA2026',
    rewardType: 'subscription_1m',
    rewardTitle: '1 айлық тегін жазылым (Премиум)',
    durationDays: 30,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxUses: 100,
    usedCount: 0,
    usedBy: [],
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'promo-002',
    batchId: DEFAULT_BATCH_ID,
    batchName: '№1 Топтама: Стандартты промокодтар',
    code: 'TANDA-VIP',
    rewardType: 'subscription_3m',
    rewardTitle: '3 айлық тегін подписка',
    durationDays: 14,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    maxUses: 50,
    usedCount: 0,
    usedBy: [],
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

function generateRandomCode(customWord?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const cleanWord = customWord?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanWord) {
    return `${cleanWord}-${randomPart}-TANDA`;
  }
  return `TANDA-${randomPart}`;
}

export const usePromoStore = create<PromoState>()(
  persist(
    (set, get) => ({
      batches: DEFAULT_BATCHES,
      promocodes: DEFAULT_PROMOCODES,

      generatePromoCodes: (options) => {
        const {
          batchName,
          count,
          rewardType = 'subscription_1m',
          rewardTitle,
          durationDays,
          customWord,
          prefix = 'TANDA',
          maxUses = 1,
        } = options;

        const validCount = Math.max(1, Math.min(count, 1000));
        const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const currentBatchesCount = get().batches?.length || 0;
        const effectiveBatchName =
          batchName?.trim() ||
          `№${currentBatchesCount + 1} Топтама (${validCount} промокод) - ${new Date().toLocaleDateString('kk-KZ')}`;

        const cleanWord = customWord?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const effectivePrefix = cleanWord ? cleanWord : prefix.trim().toUpperCase() || 'TANDA';

        const newBatch: PromoBatch = {
          id: batchId,
          name: effectiveBatchName,
          rewardType,
          rewardTitle: rewardTitle || '1 айлық тегін жазылым (Премиум)',
          durationDays,
          expiresAt,
          prefix: effectivePrefix,
          totalCodes: validCount,
          createdAt: now,
        };

        const newCodes: PromoCode[] = [];
        const existingCodes = new Set((get().promocodes || []).map((p) => p.code.toUpperCase()));

        for (let i = 0; i < validCount; i++) {
          let codeCandidate = generateRandomCode(customWord);
          while (existingCodes.has(codeCandidate)) {
            codeCandidate = generateRandomCode(customWord);
          }
          existingCodes.add(codeCandidate);

          const promo: PromoCode = {
            id: `promo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`,
            batchId,
            batchName: effectiveBatchName,
            code: codeCandidate,
            rewardType,
            rewardTitle: rewardTitle || '1 айлық тегін жазылым (Премиум)',
            durationDays,
            expiresAt,
            maxUses,
            usedCount: 0,
            usedBy: [],
            isActive: true,
            createdAt: now,
          };
          newCodes.push(promo);
        }

        set((state) => ({
          batches: [newBatch, ...(state.batches || [])],
          promocodes: [...newCodes, ...(state.promocodes || [])],
        }));

        return { batch: newBatch, codes: newCodes };
      },

      activatePromoCode: (code, user) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) {
          return { success: false, error: 'Промокодты енгізіңіз' };
        }

        const state = get();
        const promoList = state.promocodes || [];
        const promoIndex = promoList.findIndex(
          (p) => p.code.toUpperCase() === cleanCode
        );

        if (promoIndex === -1) {
          return { success: false, error: 'Мұндай промокод табылмады. Қайта тексеріңіз' };
        }

        const promo = promoList[promoIndex];

        if (!promo.isActive) {
          return { success: false, error: 'Бұл промокод жарамсыз немесе өшірілген' };
        }

        const now = new Date();
        const expiresAt = new Date(promo.expiresAt);
        if (now > expiresAt) {
          return { success: false, error: 'Бұл промокодтың жарамдылық мерзімі өтіп кеткен' };
        }

        const alreadyUsedByUser = promo.usedBy.some(
          (record) =>
            record.userId === user.id ||
            record.userEmail.toLowerCase() === user.email.toLowerCase()
        );
        if (alreadyUsedByUser) {
          return { success: false, error: 'Сіз бұл промокодты бұрын белсендіргенсіз' };
        }

        if (promo.usedCount >= promo.maxUses) {
          return { success: false, error: 'Бұл промокод толық пайдаланылған' };
        }

        const updatedPromo: PromoCode = {
          ...promo,
          usedCount: promo.usedCount + 1,
          usedBy: [
            ...promo.usedBy,
            {
              userId: user.id,
              userName: user.name || 'Оқырман',
              userEmail: user.email,
              usedAt: now.toISOString(),
            },
          ],
        };

        const updatedList = [...promoList];
        updatedList[promoIndex] = updatedPromo;

        set({ promocodes: updatedList });

        try {
          const authUser = useAuthStore.getState().user;
          if (authUser && authUser.id === user.id) {
            useAuthStore.setState({
              user: {
                ...authUser,
                createdAt: authUser.createdAt,
              },
            });
          }
        } catch {}

        return {
          success: true,
          rewardTitle: promo.rewardTitle,
        };
      },

      deletePromoCode: (codeId) => {
        set((state) => {
          const currentPromos = state.promocodes || [];
          const codeToDelete = currentPromos.find((p) => p.id === codeId);
          const updatedPromos = currentPromos.filter((p) => p.id !== codeId);
          if (!codeToDelete) return { promocodes: updatedPromos };

          const updatedBatches = (state.batches || []).map((b) => {
            if (b.id === codeToDelete.batchId) {
              const remaining = updatedPromos.filter((p) => p.batchId === b.id).length;
              return { ...b, totalCodes: remaining };
            }
            return b;
          });

          return {
            promocodes: updatedPromos,
            batches: updatedBatches,
          };
        });
      },

      togglePromoCodeStatus: (codeId) => {
        set((state) => ({
          promocodes: (state.promocodes || []).map((p) =>
            p.id === codeId ? { ...p, isActive: !p.isActive } : p
          ),
        }));
      },

      togglePromoIssued: (codeId, isIssued) => {
        set((state) => ({
          promocodes: (state.promocodes || []).map((p) => {
            if (p.id !== codeId) return p;
            const nextIssued = typeof isIssued === 'boolean' ? isIssued : !p.isIssued;
            return { ...p, isIssued: nextIssued };
          }),
        }));
      },

      updatePromoNote: (codeId, note) => {
        set((state) => ({
          promocodes: (state.promocodes || []).map((p) =>
            p.id === codeId ? { ...p, note } : p
          ),
        }));
      },

      deleteBatch: (batchId) => {
        set((state) => ({
          batches: (state.batches || []).filter((b) => b.id !== batchId),
          promocodes: (state.promocodes || []).filter((p) => p.batchId !== batchId),
        }));
      },

      toggleBatchStatus: (batchId, isActive) => {
        set((state) => {
          const batchCodes = (state.promocodes || []).filter((p) => p.batchId === batchId);
          const shouldBeActive =
            typeof isActive === 'boolean'
              ? isActive
              : !batchCodes.some((p) => p.isActive);

          return {
            promocodes: (state.promocodes || []).map((p) =>
              p.batchId === batchId ? { ...p, isActive: shouldBeActive } : p
            ),
          };
        });
      },

      getUserActivatedPromos: (userId) => {
        return (get().promocodes || []).filter((p) =>
          p.usedBy.some((u) => u.userId === userId)
        );
      },
    }),
    {
      name: 'tanda_promocodes_v2',
      version: 2,
    }
  )
);
