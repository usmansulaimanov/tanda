import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  Radio,
  Megaphone,
  Pencil
} from 'lucide-react';
import { systemApi } from '../../shared/api/system.api';
import { SystemSettings } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { api } from '../../lib/api';
import tandaPremiumBlack from '../../assets/tanda-premium-black.png';

export interface HeaderBannerPreset {
  id: string;
  title: string;
  text: string;
  buttonText: string;
}

const DEFAULT_BANNER_PRESETS: HeaderBannerPreset[] = [
  {
    id: 'default',
    title: '1-нұсқа: Негізгі',
    text: 'Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!',
    buttonText: 'Премиумға жазылу →',
  },
  {
    id: 'discount',
    title: '2-нұсқа: Жеңілдік',
    text: 'Арнайы жеңілдік: Премиум жазылымды тиімді бағамен алып үлгеріңіз!',
    buttonText: 'Жеңілдікпен алу →',
  },
  {
    id: 'books',
    title: '3-нұсқа: Жаңа кітаптар',
    text: 'Қорда 100+ жаңа аудиокітап бар: Шектеусіз тыңдауды дәл қазір бастаңыз!',
    buttonText: 'Толығырақ білу →',
  },
  {
    id: 'daily',
    title: '4-нұсқа: Тиімді баға',
    text: 'Күніне бар болғаны 30 теңге: Премиуммен барлық кітаптарды шектеусіз тыңдаңыз!',
    buttonText: 'Қосылу →',
  },
];

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
    oldPrice1Month: null,
    oldPrice3Months: null,
    oldPrice1Year: null,
    plan1MonthEnabled: true,
    plan3MonthsEnabled: true,
    plan1YearEnabled: true,
    kaspiPhoneEnabled: true,
    kaspiCardEnabled: true,
    headerBannerEnabled: true,
    headerBannerText: 'Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!',
    headerBannerButtonText: 'Премиумға жазылу →',
    paymentNotice: '',
  });

  const [presets, setPresets] = useState<HeaderBannerPreset[]>(DEFAULT_BANNER_PRESETS);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetEditForm, setPresetEditForm] = useState<HeaderBannerPreset>({
    id: '',
    title: '',
    text: '',
    buttonText: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAdAudio, setIsUploadingAdAudio] = useState(false);

  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

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
        let loadedPresets = DEFAULT_BANNER_PRESETS;
        if (res.headerBannerPresets) {
          try {
            const parsed = JSON.parse(res.headerBannerPresets);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedPresets = parsed;
            }
          } catch (e) {
            // fallback
          }
        }
        setPresets(loadedPresets);

        setSettings({
          ...res,
          kaspiPhone: formatKaspiPhone(res.kaspiPhone || ''),
          kaspiCard: formatKaspiCard(res.kaspiCard || ''),
          kaspiPhoneEnabled: res.kaspiPhoneEnabled !== false,
          kaspiCardEnabled: Boolean(res.kaspiCardEnabled),
          headerBannerEnabled: res.headerBannerEnabled !== false,
          headerBannerText: res.headerBannerText || 'Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!',
          headerBannerButtonText: res.headerBannerButtonText ?? 'Премиумға жазылу →',
          headerBannerPresets: res.headerBannerPresets || '',
          paymentNotice: res.paymentNotice || '',
        });
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const handleStartEditPreset = (e: React.MouseEvent, preset: HeaderBannerPreset) => {
    e.stopPropagation();
    setEditingPresetId(preset.id);
    setPresetEditForm({ ...preset });
  };

  const handleCancelEditPreset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPresetId(null);
    setPresetEditForm({ id: '', title: '', text: '', buttonText: '' });
  };

  const handleSavePresetEdit = (e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    if (!presetEditForm.title.trim() || !presetEditForm.text.trim()) {
      showToast('Нұсқаның атауы мен мәтінін толтырыңыз', 'error');
      return;
    }
    const updatedPresets = presets.map((p) =>
      p.id === presetId ? { ...presetEditForm } : p
    );
    setPresets(updatedPresets);

    // If this preset was currently active in settings, update settings live preview too
    const currentActivePreset = presets.find((p) => p.id === presetId);
    if (currentActivePreset && settings.headerBannerText === currentActivePreset.text) {
      setSettings((prev) => ({
        ...prev,
        headerBannerText: presetEditForm.text,
        headerBannerButtonText: presetEditForm.buttonText,
      }));
    }

    setEditingPresetId(null);
    showToast(`«${presetEditForm.title}» нұсқасы жаңартылды`, 'success');
  };

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
        headerBannerEnabled: settings.headerBannerEnabled !== false,
        headerBannerText: settings.headerBannerText?.trim() || '',
        headerBannerButtonText: settings.headerBannerButtonText?.trim() || '',
        headerBannerPresets: JSON.stringify(presets),
        paymentNotice: settings.paymentNotice?.trim() || '',
      };
      const updated = await systemApi.updateSettingsAdmin(payload);
      
      let loadedPresets = DEFAULT_BANNER_PRESETS;
      if (updated.headerBannerPresets) {
        try {
          const parsed = JSON.parse(updated.headerBannerPresets);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedPresets = parsed;
          }
        } catch (e) {}
      }
      setPresets(loadedPresets);

      setSettings({
        ...updated,
        kaspiPhone: formatKaspiPhone(updated.kaspiPhone || ''),
        kaspiCard: formatKaspiCard(updated.kaspiCard || ''),
        kaspiPhoneEnabled: updated.kaspiPhoneEnabled !== false,
        kaspiCardEnabled: Boolean(updated.kaspiCardEnabled),
        headerBannerEnabled: updated.headerBannerEnabled !== false,
        headerBannerText: updated.headerBannerText || 'Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!',
        headerBannerButtonText: updated.headerBannerButtonText ?? 'Премиумға жазылу →',
        headerBannerPresets: updated.headerBannerPresets || '',
        paymentNotice: updated.paymentNotice || '',
      });
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
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

        {/* 2. Header Promo Banner Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#F08000] flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Жоғарғы жарнамалық баннер</h3>
                <p className="text-xs text-slate-500">Сайттың жоғарғы жағында оқырмандарға көрінетін сарғыш баннер</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.headerBannerEnabled !== false}
                onChange={(e) => setSettings({ ...settings, headerBannerEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
            </label>
          </div>

          {/* Live Preview */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Сайтта көріну үлгісі:
            </label>
            <div className="rounded-2xl overflow-hidden border border-orange-200/60 shadow-inner">
              <div className="bg-gradient-to-r from-[#F08000] via-orange-500 to-[#F08000] text-white text-xs font-bold py-2.5 px-4 flex items-center justify-center">
                <div className="flex items-center justify-center gap-2 text-center flex-wrap">
                  <Crown className="w-3.5 h-3.5 text-orange-100 shrink-0" />
                  <span>
                    {settings.headerBannerText || 'Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!'}
                  </span>
                  {settings.headerBannerButtonText && (
                    <span className="underline decoration-orange-200 font-black ml-1 text-white">
                      {settings.headerBannerButtonText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Presets Selection */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Дайын нұсқалар:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {HEADER_BANNER_PRESETS.map((preset) => {
                const isSelected = settings.headerBannerText === preset.text;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSettings((prev) => ({
                        ...prev,
                        headerBannerText: preset.text,
                        headerBannerButtonText: preset.buttonText,
                      }));
                      showToast(`«${preset.title}» мәтіні таңдалды`, 'info');
                    }}
                    className={`p-3 rounded-2xl text-left border transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'border-[#F08000] bg-orange-50/60 ring-2 ring-[#F08000]/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 mb-0.5">{preset.title}</div>
                      <div className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{preset.text}</div>
                    </div>
                    {isSelected && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-[#F08000] text-white flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Edit Inputs */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Баннердің негізгі мәтіні:
              </label>
              <textarea
                rows={2}
                value={settings.headerBannerText || ''}
                onChange={(e) => setSettings({ ...settings, headerBannerText: e.target.value })}
                placeholder="Мысалы: Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F08000]/20 focus:border-[#F08000] text-slate-900 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Оң жақтағы батырма / сілтеме мәтіні:
              </label>
              <input
                type="text"
                value={settings.headerBannerButtonText || ''}
                onChange={(e) => setSettings({ ...settings, headerBannerButtonText: e.target.value })}
                placeholder="Премиумға жазылу →"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F08000]/20 focus:border-[#F08000] text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* 3. Audio Pre-Roll Ad Configuration */}
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
                type="text"
                inputMode="numeric"
                placeholder="1490"
                disabled={settings.plan1MonthEnabled === false}
                value={settings.price1Month === 0 ? '' : (settings.price1Month ?? '')}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setSettings({ ...settings, price1Month: digits ? parseInt(digits, 10) : 0 });
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />
              <div className="mt-2.5 pt-2 border-t border-orange-200/50">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Бұрынғы бағасы (сызылып тұрады):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Мысалы: 2990"
                  disabled={settings.plan1MonthEnabled === false}
                  value={settings.oldPrice1Month === null || settings.oldPrice1Month === 0 ? '' : settings.oldPrice1Month}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setSettings({ ...settings, oldPrice1Month: digits ? parseInt(digits, 10) : null });
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
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
                type="text"
                inputMode="numeric"
                placeholder="3990"
                disabled={settings.plan3MonthsEnabled === false}
                value={settings.price3Months === 0 ? '' : (settings.price3Months ?? '')}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setSettings({ ...settings, price3Months: digits ? parseInt(digits, 10) : 0 });
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />
              <div className="mt-2.5 pt-2 border-t border-orange-200/50">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Бұрынғы бағасы (сызылып тұрады):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Мысалы: 5990"
                  disabled={settings.plan3MonthsEnabled === false}
                  value={settings.oldPrice3Months === null || settings.oldPrice3Months === 0 ? '' : settings.oldPrice3Months}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setSettings({ ...settings, oldPrice3Months: digits ? parseInt(digits, 10) : null });
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
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
                type="text"
                inputMode="numeric"
                placeholder="11990"
                disabled={settings.plan1YearEnabled === false}
                value={settings.price1Year === 0 ? '' : (settings.price1Year ?? '')}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setSettings({ ...settings, price1Year: digits ? parseInt(digits, 10) : 0 });
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />
              <div className="mt-2.5 pt-2 border-t border-orange-200/50">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Бұрынғы бағасы (сызылып тұрады):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Мысалы: 17990"
                  disabled={settings.plan1YearEnabled === false}
                  value={settings.oldPrice1Year === null || settings.oldPrice1Year === 0 ? '' : settings.oldPrice1Year}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setSettings({ ...settings, oldPrice1Year: digits ? parseInt(digits, 10) : null });
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Payment Notice Block */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Ескерту хабарламасы (Премиум терезесінде тарифтер мен банктің ортасында көрінеді):</span>
              </label>
            </div>
            <textarea
              rows={3}
              placeholder="Мысалы: Төлем жасаған соң чекті міндетті түрде төменде тіркеңіз немесе басқа қосымша ескерту..."
              value={settings.paymentNotice || ''}
              onChange={(e) => setSettings({ ...settings, paymentNotice: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F08000]/20 focus:border-[#F08000] text-slate-900 placeholder:text-slate-400 leading-relaxed"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              💡 Егер бұл өріс бос қалса, оқырмандарда премиум терезесінде ескерту блогы көрсетілмейді.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
