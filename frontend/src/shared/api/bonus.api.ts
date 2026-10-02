import { api } from '../../lib/api';
import { BonusSettings, BonusStatsSummary, BonusTransaction } from '../../types';

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface UpdateBonusSettingsPayload {
  bonusSystemEnabled?: boolean;
  bonusCurrencyName?: string;
  bonusSignupEnabled?: boolean;
  bonusSignupAmount?: number;
  bonusDailyLoginEnabled?: boolean;
  bonusDailyLoginAmount?: number;
  bonusListeningEnabled?: boolean;
  bonusListeningAmount?: number;
  bonusListeningIntervalHours?: number;
  bonusReviewEnabled?: boolean;
  bonusReviewAmount?: number;
}

export interface RedeemSubscriptionPayload {
  planName: string;
  planDays: number;
  amount: number;
}

export const bonusApi = {
  // Public / Reader endpoints
  getSettings: async (): Promise<BonusSettings> => {
    const { data } = await api.get('/api/v1/bonus/settings');
    return data;
  },

  getUserTransactions: async (page = 0, size = 20): Promise<PageResponse<BonusTransaction>> => {
    const { data } = await api.get('/api/v1/bonus/transactions', {
      params: { page, size },
    });
    return data;
  },

  redeemSubscription: async (payload: RedeemSubscriptionPayload): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post('/api/v1/bonus/redeem-subscription', payload);
    return data;
  },

  dailyCheckin: async (): Promise<{ awarded: boolean; bonusBalance: number }> => {
    const { data } = await api.post('/api/v1/bonus/daily-checkin');
    return data;
  },

  // Admin endpoints
  getAdminSettings: async (): Promise<BonusSettings> => {
    const { data } = await api.get('/api/v1/admin/bonus/settings');
    return data;
  },

  updateAdminSettings: async (payload: UpdateBonusSettingsPayload): Promise<BonusSettings> => {
    const { data } = await api.put('/api/v1/admin/bonus/settings', payload);
    return data;
  },

  getAdminTransactions: async (
    search?: string,
    type?: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<BonusTransaction>> => {
    const { data } = await api.get('/api/v1/admin/bonus/transactions', {
      params: { search, type, page, size },
    });
    return data;
  },

  getAdminSummary: async (): Promise<BonusStatsSummary> => {
    const { data } = await api.get('/api/v1/admin/bonus/summary');
    return data;
  },

  lookupUser: async (query: string): Promise<any> => {
    const { data } = await api.get('/api/v1/admin/bonus/lookup-user', {
      params: { query },
    });
    return data;
  },

  getBonusReaders: async (
    search?: string,
    sortBy = 'bonus_desc',
    page = 0,
    size = 10
  ): Promise<PageResponse<any>> => {
    const { data } = await api.get('/api/v1/admin/bonus/readers', {
      params: { search, sortBy, page, size },
    });
    return data;
  },

  getReaderTransactions: async (
    userId: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<BonusTransaction>> => {
    const { data } = await api.get(`/api/v1/admin/bonus/readers/${userId}/transactions`, {
      params: { page, size },
    });
    return data;
  },

  adjustUserBonus: async (
    userId: string,
    amount: number,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/api/v1/admin/bonus/adjust/${userId}`, {
      amount,
      reason,
    });
    return data;
  },
};

