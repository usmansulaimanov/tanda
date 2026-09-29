import { api } from '../../lib/api';
import { SubscriptionPaymentRequest } from '../../types';

export interface CreateSubscriptionPaymentRequestPayload {
  planName: string;
  planDays: number;
  amountKzt: number;
  receiptUrl: string;
  phoneOrAccount?: string;
  notes?: string;
}

export interface PremiumStatusDto {
  isPremium: boolean;
  startsAt?: string | null;
  expiresAt: string | null;
  source: string | null;
  daysRemaining: number;
}

export const premiumApi = {
  getPremiumStatus: async (): Promise<PremiumStatusDto> => {
    const { data } = await api.get('/api/v1/premium/status');
    return data;
  },

  createSubscriptionRequest: async (
    payload: CreateSubscriptionPaymentRequestPayload
  ): Promise<SubscriptionPaymentRequest> => {
    const { data } = await api.post('/api/v1/premium/subscription-requests', payload);
    return data;
  },

  getMySubscriptionRequests: async (): Promise<SubscriptionPaymentRequest[]> => {
    const { data } = await api.get('/api/v1/premium/subscription-requests/my');
    return data;
  },

  getAllSubscriptionRequestsAdmin: async (
    status?: string
  ): Promise<SubscriptionPaymentRequest[]> => {
    const { data } = await api.get('/api/v1/admin/premium/subscription-requests', {
      params: status ? { status } : {},
    });
    return data;
  },

  approveSubscriptionRequestAdmin: async (
    id: string
  ): Promise<SubscriptionPaymentRequest> => {
    const { data } = await api.post(`/api/v1/admin/premium/subscription-requests/${id}/approve`);
    return data;
  },

  rejectSubscriptionRequestAdmin: async (
    id: string,
    rejectionReason?: string
  ): Promise<SubscriptionPaymentRequest> => {
    const { data } = await api.post(`/api/v1/admin/premium/subscription-requests/${id}/reject`, {
      rejectionReason,
    });
    return data;
  },

  revokeSubscriptionRequestAdmin: async (
    id: string,
    rejectionReason?: string
  ): Promise<SubscriptionPaymentRequest> => {
    const { data } = await api.post(`/api/v1/admin/premium/subscription-requests/${id}/revoke`, {
      rejectionReason,
    });
    return data;
  },


  uploadReceiptImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'receipts');
    const { data } = await api.post('/api/v1/premium/receipts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data?.url || data?.key || '';
  },

  grantPremiumAdmin: async (
    userId: string,
    days: number,
    source?: string
  ): Promise<any> => {
    const { data } = await api.post('/api/v1/admin/premium/grant', {
      userId,
      days,
      source: source || 'MANUAL_ADMIN',
    });
    return data;
  },
};
