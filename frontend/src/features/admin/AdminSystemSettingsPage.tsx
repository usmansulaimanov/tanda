import React, { useState, useEffect, useRef } from 'react';
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
  Pencil,
  Bot,
  ShieldCheck,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlertCircle
} from 'lucide-react';
import { systemApi } from '../../shared/api/system.api';
import { SystemSettings } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { api } from '../../lib/api';
import { FormattedNoticeText } from '../../components/ui/FormattedNoticeText';
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
    plan1MonthDesc: '',
    plan3MonthsDesc: '10% үнемдейсіз',
    plan1YearDesc: '30% үнемдейсіз',
    plan1MonthBadge: '',
    plan3MonthsBadge: 'ТИІМДІ',
    plan1YearBadge: 'ҮЗДІК ТАҢДАУ ⭐',
    kaspiPhoneEnabled: true,
    kaspiCardEnabled: true,
    headerBannerEnabled: true,
    headerBannerText: 'Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!',
    headerBannerButtonText: 'Премиумға жазылу →',
    aiReceiptVerificationEnabled: true,
    paymentNotice: '',
    paymentNoticeAlign: 'left',
  });

  const editorRef = useRef<HTMLDivElement>(null);

  const normalizeToHtml = (text: string) => {
    if (!text) return '';
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return text;
    }
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  const handleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand('bold', false);
    if (editorRef.current) {
      setSettings((prev) => ({ ...prev, paymentNotice: editorRef.current?.innerHTML || '' }));
    }
  };

  const handleItalic = (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand('italic', false);
    if (editorRef.current) {
      setSettings((prev) => ({ ...prev, paymentNotice: editorRef.current?.innerHTML || '' }));
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setSettings((prev) => ({ ...prev, paymentNotice: html }));
    }
  };

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

        const rawNotice = res.paymentNotice || '';
        const htmlNotice = normalizeToHtml(rawNotice);
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlNotice;
        }

        setSettings({
          ...res,
          plan1MonthDesc: res.plan1MonthDesc !== undefined ? res.plan1MonthDesc : '',
          plan3MonthsDesc: res.plan3MonthsDesc !== undefined ? res.plan3MonthsDesc : '10% үнемдейсіз',
          plan1YearDesc: res.plan1YearDesc !== undefined ? res.plan1YearDesc : '30% үнемдейсіз',
          plan1MonthBadge: res.plan1MonthBadge !== undefined ? res.plan1MonthBadge : '',
          plan3MonthsBadge: res.plan3MonthsBadge !== undefined ? res.plan3MonthsBadge : 'ТИІМДІ',
          plan1YearBadge: res.plan1YearBadge !== undefined ? res.plan1YearBadge : 'ҮЗДІК ТАҢДАУ ⭐',
          kaspiPhone: formatKaspiPhone(res.kaspiPhone || ''),
          kaspiCard: formatKaspiCard(res.kaspiCard || ''),
          kaspiPhoneEnabled: res.kaspiPhoneEnabled !== false,
          kaspiCardEnabled: Boolean(res.kaspiCardEnabled),
          headerBannerEnabled: res.headerBannerEnabled !== false,
          headerBannerText: res.headerBannerText || 'Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!',
          headerBannerButtonText: res.headerBannerButtonText ?? 'Премиумға жазылу →',
          headerBannerPresets: res.headerBannerPresets || '',
          aiReceiptVerificationEnabled: res.aiReceiptVerificationEnabled !== false,
          paymentNotice: htmlNotice,
          paymentNoticeAlign: (res.paymentNoticeAlign as 'left' | 'center' | 'right') || 'left',
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
      const cleanNotice =
        settings.paymentNotice === '<br>' ||
        settings.paymentNotice === '<div><br></div>' ||
        settings.paymentNotice === '<p><br></p>'
          ? ''
          : settings.paymentNotice?.trim() || '';

      const payload = {
        ...settings,
        plan1MonthDesc: settings.plan1MonthDesc ?? '',
        plan3MonthsDesc: settings.plan3MonthsDesc ?? '',
        plan1YearDesc: settings.plan1YearDesc ?? '',
        plan1MonthBadge: settings.plan1MonthBadge ?? '',
        plan3MonthsBadge: settings.plan3MonthsBadge ?? '',
        plan1YearBadge: settings.plan1YearBadge ?? '',
        kaspiPhone: formatKaspiPhone(settings.kaspiPhone),
        kaspiCard: formatKaspiCard(settings.kaspiCard || ''),
        kaspiPhoneEnabled: settings.kaspiPhoneEnabled !== false,
        kaspiCardEnabled: Boolean(settings.kaspiCardEnabled),
        aiReceiptVerificationEnabled: settings.aiReceiptVerificationEnabled !== false,
        headerBannerEnabled: settings.headerBannerEnabled !== false,
        headerBannerText: settings.headerBannerText?.trim() || '',
        headerBannerButtonText: settings.headerBannerButtonText?.trim() || '',
        headerBannerPresets: JSON.stringify(presets),
        paymentNotice: cleanNotice,
        paymentNoticeAlign: settings.paymentNoticeAlign || 'left',
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

      const updatedHtml = normalizeToHtml(updated.paymentNotice || '');
      if (editorRef.current && editorRef.current.innerHTML !== updatedHtml) {
        editorRef.current.innerHTML = updatedHtml;
      }

      setSettings({
        ...updated,
        plan1MonthDesc: updated.plan1MonthDesc !== undefined ? updated.plan1MonthDesc : '',
        plan3MonthsDesc: updated.plan3MonthsDesc !== undefined ? updated.plan3MonthsDesc : '10% үнемдейсіз',
        plan1YearDesc: updated.plan1YearDesc !== undefined ? updated.plan1YearDesc : '30% үнемдейсіз',
        plan1MonthBadge: updated.plan1MonthBadge !== undefined ? updated.plan1MonthBadge : '',
        plan3MonthsBadge: updated.plan3MonthsBadge !== undefined ? updated.plan3MonthsBadge : 'ТИІМДІ',
        plan1YearBadge: updated.plan1YearBadge !== undefined ? updated.plan1YearBadge : 'ҮЗДІК ТАҢДАУ ⭐',
        kaspiPhone: formatKaspiPhone(updated.kaspiPhone || ''),
        kaspiCard: formatKaspiCard(updated.kaspiCard || ''),
        kaspiPhoneEnabled: updated.kaspiPhoneEnabled !== false,
        kaspiCardEnabled: Boolean(updated.kaspiCardEnabled),
        headerBannerEnabled: updated.headerBannerEnabled !== false,
        headerBannerText: updated.headerBannerText || 'Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!',
        headerBannerButtonText: updated.headerBannerButtonText ?? 'Премиумға жазылу →',
        headerBannerPresets: updated.headerBannerPresets || '',
        paymentNotice: updatedHtml,
        paymentNoticeAlign: (updated.paymentNoticeAlign as 'left' | 'center' | 'right') || 'left',
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

          {/* Quick Presets Selection & Individual Editing */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Дайын нұсқалар:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const isEditing = editingPresetId === preset.id;
                const isSelected = settings.headerBannerText === preset.text;

                if (isEditing) {
                  return (
                    <div
                      key={preset.id}
                      className="p-3.5 rounded-2xl border-2 border-[#F08000] bg-orange-50/40 space-y-2.5 shadow-sm"
                    >
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Нұсқа атауы:
                        </label>
                        <input
                          type="text"
                          value={presetEditForm.title}
                          onChange={(e) => setPresetEditForm({ ...presetEditForm, title: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#F08000] bg-white text-slate-900"
                          placeholder="Мысалы: 1-нұсқа: Негізгі"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Баннер мәтіні:
                        </label>
                        <textarea
                          rows={2}
                          value={presetEditForm.text}
                          onChange={(e) => setPresetEditForm({ ...presetEditForm, text: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#F08000] bg-white text-slate-900 leading-relaxed"
                          placeholder="Баннердің негізгі мәтіні..."
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Батырма мәтіні:
                        </label>
                        <input
                          type="text"
                          value={presetEditForm.buttonText}
                          onChange={(e) => setPresetEditForm({ ...presetEditForm, buttonText: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#F08000] bg-white text-slate-900"
                          placeholder="Мысалы: Премиумға жазылу →"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => handleCancelEditPreset(e)}
                          className="px-3 py-1 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                        >
                          Болдырмау
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSavePresetEdit(e, preset.id)}
                          className="px-3 py-1 text-xs font-bold text-white bg-[#F08000] hover:bg-[#c06800] rounded-lg shadow-sm transition"
                        >
                          Дайын
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setSettings((prev) => ({
                        ...prev,
                        headerBannerText: preset.text,
                        headerBannerButtonText: preset.buttonText,
                      }));
                      showToast(`«${preset.title}» мәтіні таңдалды`, 'info');
                    }}
                    className={`group relative p-3.5 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#F08000] bg-orange-50/60 ring-2 ring-[#F08000]/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-slate-900">{preset.title}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Өңдеу"
                            onClick={(e) => handleStartEditPreset(e, preset)}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-500 hover:text-[#F08000] hover:bg-orange-100/70 border border-slate-200 hover:border-orange-300 transition flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Өңдеу</span>
                          </button>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#F08000] text-white flex items-center justify-center text-[10px] shrink-0">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-1.5">
                        {preset.text}
                      </p>
                    </div>

                    {preset.buttonText && (
                      <div className="text-[10px] font-medium text-slate-400 truncate mt-1">
                        Батырма: <span className="font-semibold text-slate-600">{preset.buttonText}</span>
                      </div>
                    )}
                  </div>
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
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Төлем Реквизиттері және Бағалар</h3>
            </div>

            {/* AI Receipt Verification Mode Toggle */}
            <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                settings.aiReceiptVerificationEnabled !== false
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 select-none">
                ЖИ Тексеру
              </span>
              <label className="relative inline-flex items-center cursor-pointer ml-1">
                <input
                  type="checkbox"
                  checked={settings.aiReceiptVerificationEnabled !== false}
                  onChange={(e) => setSettings({ ...settings, aiReceiptVerificationEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
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
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              settings.plan1MonthEnabled !== false ? 'bg-orange-50/40 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.plan1MonthEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, plan1MonthEnabled: e.target.checked })}
                      className="w-4 h-4 text-[#F08000] rounded border-slate-300 focus:ring-[#F08000] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900">1 айлық тариф:</span>
                  </label>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Бағасы (₸):</label>
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#F08000] font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Жоғарғы бейдж:</label>
                    <input
                      type="text"
                      placeholder="Бос қалдыруға болады"
                      disabled={settings.plan1MonthEnabled === false}
                      value={settings.plan1MonthBadge || ''}
                      onChange={(e) => setSettings({ ...settings, plan1MonthBadge: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#F08000] bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Төменгі сипаттама:</label>
                    <input
                      type="text"
                      placeholder="Бос қалдыруға болады"
                      disabled={settings.plan1MonthEnabled === false}
                      value={settings.plan1MonthDesc || ''}
                      onChange={(e) => setSettings({ ...settings, plan1MonthDesc: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#F08000] bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Months */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              settings.plan3MonthsEnabled !== false ? 'bg-orange-50/40 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.plan3MonthsEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, plan3MonthsEnabled: e.target.checked })}
                      className="w-4 h-4 text-[#F08000] rounded border-slate-300 focus:ring-[#F08000] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900">3 айлық тариф:</span>
                  </label>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Бағасы (₸):</label>
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#F08000] font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Жоғарғы бейдж:</label>
                    <input
                      type="text"
                      placeholder="ТИІМДІ"
                      disabled={settings.plan3MonthsEnabled === false}
                      value={settings.plan3MonthsBadge || ''}
                      onChange={(e) => setSettings({ ...settings, plan3MonthsBadge: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#F08000] bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Төменгі сипаттама:</label>
                    <input
                      type="text"
                      placeholder="10% үнемдейсіз"
                      disabled={settings.plan3MonthsEnabled === false}
                      value={settings.plan3MonthsDesc || ''}
                      onChange={(e) => setSettings({ ...settings, plan3MonthsDesc: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#F08000] bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 1 Year */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              settings.plan1YearEnabled !== false ? 'bg-orange-50/40 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.plan1YearEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, plan1YearEnabled: e.target.checked })}
                      className="w-4 h-4 text-[#F08000] rounded border-slate-300 focus:ring-[#F08000] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900">1 жылдық тариф:</span>
                  </label>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Бағасы (₸):</label>
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#F08000] font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Жоғарғы бейдж:</label>
                    <input
                      type="text"
                      placeholder="ҮЗДІК ТАҢДАУ ⭐"
                      disabled={settings.plan1YearEnabled === false}
                      value={settings.plan1YearBadge || ''}
                      onChange={(e) => setSettings({ ...settings, plan1YearBadge: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#F08000] bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Төменгі сипаттама:</label>
                    <input
                      type="text"
                      placeholder="30% үнемдейсіз"
                      disabled={settings.plan1YearEnabled === false}
                      value={settings.plan1YearDesc || ''}
                      onChange={(e) => setSettings({ ...settings, plan1YearDesc: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#F08000] bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Notice Block */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Ескерту хабарламасы:</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.paymentNoticeEnabled !== false}
                  onChange={(e) => setSettings({ ...settings, paymentNoticeEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F08000]" />
              </label>
            </div>

            {/* Formatting Toolbar */}
            <div className={`flex items-center justify-between gap-2 mb-1.5 p-1.5 rounded-xl bg-slate-100 border border-slate-200/80 flex-wrap transition ${
              settings.paymentNoticeEnabled === false ? 'opacity-40 pointer-events-none' : ''
            }`}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={handleBold}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-sm transition cursor-pointer flex items-center justify-center"
                  title="Қалың қаріп (Bold)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={handleItalic}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-sm transition cursor-pointer flex items-center justify-center"
                  title="Көлбеу қаріп (Italic)"
                >
                  <Italic className="w-4 h-4" />
                </button>
              </div>

              {/* Alignment Buttons */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paymentNoticeAlign: 'left' })}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    (settings.paymentNoticeAlign || 'left') === 'left'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Сол жаққа туралау"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paymentNoticeAlign: 'center' })}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    settings.paymentNoticeAlign === 'center'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Ортаға туралау"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paymentNoticeAlign: 'right' })}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    settings.paymentNoticeAlign === 'right'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Оң жаққа туралау"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* WYSIWYG Editable Area */}
            <div
              ref={editorRef}
              contentEditable={settings.paymentNoticeEnabled !== false}
              onInput={handleEditorInput}
              onBlur={handleEditorInput}
              suppressContentEditableWarning
              data-placeholder="Мысалы: ЕСКЕРТУ! Төлем жасаған соң чек жіберіңіз..."
              className={`w-full min-h-[95px] px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F08000]/20 focus:border-[#F08000] text-slate-900 leading-relaxed transition ${
                (settings.paymentNoticeAlign || 'left') === 'center'
                  ? 'text-center'
                  : (settings.paymentNoticeAlign || 'left') === 'right'
                  ? 'text-right'
                  : 'text-left'
              } ${
                settings.paymentNoticeEnabled === false ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' : 'bg-white'
              }`}
              style={{ wordBreak: 'break-word' }}
            />

            {/* Live Preview */}
            {settings.paymentNoticeEnabled !== false && settings.paymentNotice && settings.paymentNotice.trim() && (
              <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                  Алдын ала көру (Оқырмандарда осылай көрінеді):
                </p>
                <div className="p-3 rounded-xl bg-white border border-slate-200/60 shadow-xs">
                  <FormattedNoticeText
                    text={settings.paymentNotice}
                    align={settings.paymentNoticeAlign || 'left'}
                    className="text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
