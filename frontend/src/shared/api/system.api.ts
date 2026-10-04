import { api } from '../../lib/api';
import { SystemSettings } from '../../types';

const SETTINGS_CACHE_KEY = 'tanda_system_settings';

export const systemApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const { data } = await api.get('/api/v1/system/settings');
    if (typeof window !== 'undefined' && data) {
      try {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
      } catch {}
    }
    return data;
  },

  getCachedSettings: (): SystemSettings | undefined => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return undefined;
  },

  updateSettingsAdmin: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const { data } = await api.put('/api/v1/admin/system/settings', settings);
    if (typeof window !== 'undefined' && data) {
      try {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
      } catch {}
    }
    return data;
  },
};
