import { api } from '../../lib/api';
import { SystemSettings } from '../../types';

export const systemApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const { data } = await api.get('/api/v1/system/settings');
    return data;
  },

  updateSettingsAdmin: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const { data } = await api.put('/api/v1/admin/system/settings', settings);
    return data;
  },
};
