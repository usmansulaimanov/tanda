import { apiClient } from './client';

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export const pushApi = {
  getPublicKey: async (): Promise<{ publicKey: string }> => {
    const { data } = await apiClient.get<{ publicKey: string }>('/api/v1/push/public-key');
    return data;
  },

  subscribe: async (payload: PushSubscriptionPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>('/api/v1/push/subscribe', payload);
    return data;
  },

  unsubscribe: async (endpoint: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>('/api/v1/push/unsubscribe', { endpoint });
    return data;
  },
};
