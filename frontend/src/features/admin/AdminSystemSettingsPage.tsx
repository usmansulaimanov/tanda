import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Volume2, 
  Crown, 
  Upload, 
  Check, 
  Save, 
  Sparkles, 
  AlertTriangle,
  CreditCard,
  Radio
} from 'lucide-react';
import { systemApi } from '../../shared/api/system.api';
import { SystemSettings } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { api } from '../../lib/api';
import tandaPremiumWhite from '../../assets/tanda-premium-white.png';

export const AdminSystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    premiumEnabled: true,
    openAccessMode: false,
    audioAdEnabled: false,
    audioAdUrl: '',
    audioAdTitle: 'Tanda Premium — Жарнамасыз тыңдаңыз',
    kaspiPhone: '+7 (777) 000-00-00',
    kaspiCard: '',
    kaspiRecipientName: 'Tanda Platform',
    price1Month: 1490,
    price3Months: 3990,
    price1Year: 11990,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAdAudio, setIsUploadingAdAudio] = useState(false);

  const { showToast } = useToastStore();

  useEffect(() => {
    systemApi.getSettings()
      .then((res) => {
        setSettings(res);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await systemApi.updateSettingsAdmin(settings);
      setSettings(updated);
      showToast('Жүйелік баптаулар сәтті сақталды!', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Баптауларды сақтау кезінде қате орын алды', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadAdAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast('Аудио-жарнама файлы 20MB-тан аспауы керек', 'error');
      return;
    }

    setIsUploadingAdAudio(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'audio');

      const res = await api.post('/api/v1/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = res.data?.url || res.data?.key || '';
      setSettings((prev) => ({ ...prev, audioAdUrl: url, audioAdEnabled: true }));
      showToast('Аудио-жарнама файлы сәтті жүктелді!', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Аудио жүктеу кезінде қате орын алды', 'error');
    } finally {
      setIsUploadingAdAudio(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Баптаулар жүктелуде...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Жүйелік Баптаулар және Премиум</h1>
        </div>

        <button
          onClick={() => handleSave()}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Сақталуда...' : 'Барлығын сақтау'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Tanda Premium System Toggle */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center p-1.5 shadow-sm">
                <img src={tandaPremiumWhite} alt="Tanda Crown" className="w-full h-full object-contain" />
              </div>
              <span className="text-base font-black text-slate-900">
                Tanda Premium жүйесін іске қосу
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.premiumEnabled}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setSettings({ 
                    ...settings, 
                    premiumEnabled: isChecked,
                    openAccessMode: !isChecked 
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-black" />
            </label>
          </div>
        </div>

        {/* 2. Audio Pre-Roll Ad Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">15-секундтық Аудио-Жарнама (Pre-Roll Ad)</h3>
                <p className="text-xs text-slate-500">Стандартты оқырмандар тыңдауды бастағанда ойнайтын жарнама</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.audioAdEnabled}
                onChange={(e) => setSettings({ ...settings, audioAdEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Жарнамалық аудио файл:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="/uploads/audio/... немесе сыртқы URL"
                  value={settings.audioAdUrl}
                  onChange={(e) => setSettings({ ...settings, audioAdUrl: e.target.value })}
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <label className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingAdAudio ? 'Жүктелуде...' : 'Файлды жүктеу'}</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleUploadAdAudio}
                    className="hidden"
                  />
                </label>
              </div>
              {settings.audioAdUrl && (
                <div className="mt-2">
                  <audio src={settings.audioAdUrl} controls className="w-full h-8" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Жарнама тақырыбы / Хабарламасы:
              </label>
              <input
                type="text"
                value={settings.audioAdTitle}
                onChange={(e) => setSettings({ ...settings, audioAdTitle: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Kaspi Payment & Pricing */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Kaspi Төлем Реквизиттері және Бағалар</h3>
              <p className="text-xs text-slate-500">Чек жіберу терезесінде көрінетін нөмір мен тариф құндары</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kaspi телефон нөмірі:
              </label>
              <input
                type="text"
                value={settings.kaspiPhone}
                onChange={(e) => setSettings({ ...settings, kaspiPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kaspi карта нөмірі:
              </label>
              <input
                type="text"
                placeholder="4400 4301 **** ****"
                value={settings.kaspiCard || ''}
                onChange={(e) => setSettings({ ...settings, kaspiCard: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Алушының аты-жөні (Kaspi-дегі аты):
              </label>
              <input
                type="text"
                value={settings.kaspiRecipientName}
                onChange={(e) => setSettings({ ...settings, kaspiRecipientName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1 айлық жазылым (₸):
              </label>
              <input
                type="number"
                value={settings.price1Month}
                onChange={(e) => setSettings({ ...settings, price1Month: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                3 айлық жазылым (₸):
              </label>
              <input
                type="number"
                value={settings.price3Months}
                onChange={(e) => setSettings({ ...settings, price3Months: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1 жылдық жазылым (₸):
              </label>
              <input
                type="number"
                value={settings.price1Year}
                onChange={(e) => setSettings({ ...settings, price1Year: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
