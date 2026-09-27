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
import tandaPremiumBlack from '../../assets/tanda-premium-black.png';

const KAZAKHSTAN_BANKS = [
  'Kaspi Bank',
  'Halyk Bank',
  'ForteBank',
  'Банк ЦентрКредит (BCC)',
  'Freedom Bank',
  'Jusan Bank',
  'Bereke Bank',
  'Еуразиялық Банк (Eurasian Bank)',
  'Bank RBK',
  'Home Credit Bank',
  'Алтын Банк (Altyn Bank)',
  'Нұрбанк (Nurbank)',
  'Shinhan Bank Kazakhstan',
  'ВТБ Банк (Қазақстан)',
  'Zaman Bank (Ислам банкі)',
];

export const AdminSystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    premiumEnabled: true,
    openAccessMode: false,
    audioAdEnabled: false,
    audioAdUrl: '',
    audioAdTitle: 'Tanda Premium — Жарнамасыз тыңдаңыз',
    bankName: 'Kaspi Bank',
    kaspiPhone: '+7 (777) 000-00-00',
    kaspiCard: '',
    kaspiRecipientName: 'Tanda Platform',
    price1Month: 1490,
    price3Months: 3990,
    price1Year: 11990,
    plan1MonthEnabled: true,
    plan3MonthsEnabled: true,
    plan1YearEnabled: true,
    kaspiPhoneEnabled: true,
    kaspiCardEnabled: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAdAudio, setIsUploadingAdAudio] = useState(false);

  const { showToast } = useToastStore();

  const formatKaspiPhone = (input: string): string => {
    if (!input) return '';
    const trimmed = input.trim();
    if (trimmed === '+' || trimmed === '+7' || trimmed === '7' || trimmed === '8') {
      return '';
    }

    let digits = input.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
      digits = digits.slice(1);
    } else if (digits.startsWith('7') && (input.includes('+7') || digits.length > 10)) {
      digits = digits.slice(1);
    } else if (digits.startsWith('8') && input.startsWith('8')) {
      digits = digits.slice(1);
    }

    digits = digits.slice(0, 10);
    if (!digits) return '';

    let formatted = '+7';
    if (digits.length > 0) {
      formatted += ' ' + digits.slice(0, 3);
    }
    if (digits.length > 3) {
      formatted += ' ' + digits.slice(3, 6);
    }
    if (digits.length > 6) {
      formatted += ' ' + digits.slice(6, 10);
    }
    return formatted;
  };

  const formatKaspiCard = (input: string): string => {
    if (!input) return '';
    const digits = input.replace(/\D/g, '').slice(0, 16);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join(' ');
  };

  useEffect(() => {
    systemApi.getSettings()
      .then((res) => {
        setSettings({
          ...res,
          kaspiPhone: formatKaspiPhone(res.kaspiPhone || ''),
          kaspiCard: formatKaspiCard(res.kaspiCard || ''),
          kaspiPhoneEnabled: res.kaspiPhoneEnabled !== false,
          kaspiCardEnabled: Boolean(res.kaspiCardEnabled),
        });
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
      const payload = {
        ...settings,
        kaspiPhone: formatKaspiPhone(settings.kaspiPhone),
        kaspiCard: formatKaspiCard(settings.kaspiCard || ''),
        kaspiPhoneEnabled: settings.kaspiPhoneEnabled !== false,
        kaspiCardEnabled: Boolean(settings.kaspiCardEnabled),
      };
      const updated = await systemApi.updateSettingsAdmin(payload);
      setSettings({
        ...updated,
        kaspiPhone: formatKaspiPhone(updated.kaspiPhone || ''),
        kaspiCard: formatKaspiCard(updated.kaspiCard || ''),
        kaspiPhoneEnabled: updated.kaspiPhoneEnabled !== false,
        kaspiCardEnabled: Boolean(updated.kaspiCardEnabled),
      });
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
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F08000] hover:bg-[#c06800] text-white font-bold text-sm shadow-md shadow-orange-500/20 transition disabled:opacity-50"
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
              <img src={tandaPremiumBlack} alt="Tanda Emblem" className="w-6 h-6 object-contain shrink-0" />
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
              <h3 className="text-base font-bold text-slate-900">Аудио-Жарнама</h3>
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

        {/* 3. Payment & Pricing */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Төлем Реквизиттері және Бағалар</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Банк:
              </label>
              <select
                value={settings.bankName || 'Kaspi Bank'}
                onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F08000]/20 focus:border-[#F08000] font-bold bg-white text-slate-900 cursor-pointer"
              >
                {KAZAKHSTAN_BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5 cursor-pointer select-none">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={settings.kaspiPhoneEnabled !== false}
                    onChange={(e) => setSettings({ ...settings, kaspiPhoneEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 text-[#F08000] rounded border-slate-300 focus:ring-[#F08000] cursor-pointer"
                  />
                  <span>Телефон нөмірі:</span>
                </span>
                {settings.kaspiPhoneEnabled === false && (
                  <span className="text-[10px] text-slate-400 font-normal">Сайтта жасырулы</span>
                )}
              </label>
              <input
                type="text"
                placeholder="+7 777 000 0000"
                value={settings.kaspiPhone}
                onChange={(e) => setSettings({ ...settings, kaspiPhone: formatKaspiPhone(e.target.value) })}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F08000]/20 focus:border-[#F08000] font-mono ${
                  settings.kaspiPhoneEnabled === false ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5 cursor-pointer select-none">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={settings.kaspiCardEnabled !== false}
                    onChange={(e) => setSettings({ ...settings, kaspiCardEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 text-[#F08000] rounded border-slate-300 focus:ring-[#F08000] cursor-pointer"
                  />
                  <span>Карта нөмірі:</span>
                </span>
                {settings.kaspiCardEnabled === false && (
                  <span className="text-[10px] text-slate-400 font-normal">Сайтта жасырулы</span>
                )}
              </label>
              <input
                type="text"
                placeholder="0000 0000 0000 0000"
                value={settings.kaspiCard || ''}
                onChange={(e) => setSettings({ ...settings, kaspiCard: formatKaspiCard(e.target.value) })}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F08000]/20 focus:border-[#F08000] font-mono ${
                  settings.kaspiCardEnabled === false ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Аты-жөні:
              </label>
              <input
                type="text"
                value={settings.kaspiRecipientName}
                onChange={(e) => setSettings({ ...settings, kaspiRecipientName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F08000]/20 focus:border-[#F08000]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {/* 1 Month */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              settings.plan1MonthEnabled !== false ? 'bg-orange-50/40 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.plan1MonthEnabled !== false}
                    onChange={(e) => setSettings({ ...settings, plan1MonthEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#F08000] rounded border-slate-300 focus:ring-[#F08000] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">1 айлық жазылым (₸):</span>
                </label>
              </div>
              <input
                type="number"
                disabled={settings.plan1MonthEnabled === false}
                value={settings.price1Month}
                onChange={(e) => setSettings({ ...settings, price1Month: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {/* 3 Months */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              settings.plan3MonthsEnabled !== false ? 'bg-orange-50/40 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.plan3MonthsEnabled !== false}
                    onChange={(e) => setSettings({ ...settings, plan3MonthsEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#F08000] rounded border-slate-300 focus:ring-[#F08000] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">3 айлық жазылым (₸):</span>
                </label>
              </div>
              <input
                type="number"
                disabled={settings.plan3MonthsEnabled === false}
                value={settings.price3Months}
                onChange={(e) => setSettings({ ...settings, price3Months: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {/* 1 Year */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              settings.plan1YearEnabled !== false ? 'bg-orange-50/40 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.plan1YearEnabled !== false}
                    onChange={(e) => setSettings({ ...settings, plan1YearEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#F08000] rounded border-slate-300 focus:ring-[#F08000] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">1 жылдық жазылым (₸):</span>
                </label>
              </div>
              <input
                type="number"
                disabled={settings.plan1YearEnabled === false}
                value={settings.price1Year}
                onChange={(e) => setSettings({ ...settings, price1Year: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
