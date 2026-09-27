import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Check, 
  Copy, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  X, 
  ArrowRight,
  Headphones,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { usePromoStore } from '../../store/usePromoStore';
import { useToastStore } from '../../store/useToastStore';
import { premiumApi } from '../../shared/api/premium.api';
import { systemApi } from '../../shared/api/system.api';
import { SystemSettings } from '../../types';
import { api } from '../../lib/api';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReason?: string;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  initialReason,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const { activatePromoCode } = usePromoStore();
  const { showToast } = useToastStore();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'1_MONTH' | '3_MONTHS' | '1_YEAR'>('1_MONTH');
  const [phoneOrAccount, setPhoneOrAccount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Load system settings (prices & kaspi details)
  useEffect(() => {
    if (isOpen) {
      systemApi.getSettings()
        .then((res) => setSettings(res))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const plans = [
    {
      id: '1_MONTH' as const,
      name: '1 ай',
      days: 30,
      price: settings?.price1Month || 1490,
      description: 'Ай сайынғы стандартты жазылым',
      badge: null,
    },
    {
      id: '3_MONTHS' as const,
      name: '3 ай',
      days: 90,
      price: settings?.price3Months || 3990,
      description: 'Тоқсандық жазылым (10% үнемдеу)',
      badge: 'ТИІМДІ',
    },
    {
      id: '1_YEAR' as const,
      name: '1 жыл',
      days: 365,
      price: settings?.price1Year || 11990,
      description: 'Жылдық толық қолжетімділік (33% үнемдеу)',
      badge: 'ҮЗДІК ТАҢДАУ ⭐',
    },
  ];

  const currentPlan = plans.find((p) => p.id === selectedPlan) || plans[0];

  const handleCopyPhone = () => {
    const phone = settings?.kaspiPhone || '+7 (777) 000-00-00';
    navigator.clipboard.writeText(phone.replace(/\D/g, ''));
    showToast('Kaspi нөмірі көшірілді: ' + phone, 'success');
  };

  const handleCopyCard = () => {
    if (settings?.kaspiCard) {
      navigator.clipboard.writeText(settings.kaspiCard.replace(/\s+/g, ''));
      showToast('Карта нөмірі көшірілді!', 'success');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showToast('Чек файлының көлемі 15MB-тан аспауы керек', 'error');
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Төлемді тіркеу үшін алдымен сайтқа кіріңіз', 'error');
      return;
    }
    if (!receiptFile) {
      showToast('Өтініш, Kaspi чегін немесе түбіртекті жүктеңіз', 'error');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload receipt image
      const formData = new FormData();
      formData.append('file', receiptFile);
      formData.append('category', 'covers'); // image storage

      let receiptUrl = '';
      try {
        const uploadRes = await api.post('/api/v1/admin/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        receiptUrl = uploadRes.data?.url || uploadRes.data?.key || '';
      } catch {
        // Fallback to base64 preview or client url if upload endpoint requires admin
        receiptUrl = receiptPreview;
      }

      // 2. Submit payment request
      await premiumApi.createSubscriptionRequest({
        planName: currentPlan.id,
        planDays: currentPlan.days,
        amountKzt: currentPlan.price,
        receiptUrl: receiptUrl || 'receipt_attached',
        phoneOrAccount: phoneOrAccount.trim() || user?.email || '',
        notes: `Пайдаланушы: ${user?.name || user?.email}`,
      });

      setIsSubmitted(true);
      showToast('Чек сәтті жіберілді! Админ тексерген соң Премиум бірден қосылады', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Чекті жіберу кезінде қате орын алды';
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;
    if (!isAuthenticated) {
      showToast('Промокодты қолдану үшін алдымен жүйеге кіріңіз', 'error');
      return;
    }

    setIsApplyingPromo(true);
    try {
      const res = await activatePromoCode(promoCodeInput.trim());
      if (res.success) {
        showToast(`Промокод сәтті қолданылды (${res.rewardTitle || 'Премиум'})! 👑`, 'success');
        onClose();
        window.location.reload();
      } else {
        showToast(res.error || 'Промокод жарамсыз немесе мерзімі өткен', 'error');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Промокодты қолдану кезінде қате орын алды';
      showToast(msg, 'error');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />

        <div className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-left align-middle shadow-2xl transition-all z-10 border border-amber-100 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900">Tanda Premium</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  ШЕКСЕУСІЗ
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {initialReason || 'Барлық кітаптарды шектеусіз, жарнамасыз әрі жоғары сапада тыңдаңыз'}
              </p>
            </div>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Толық қолжетімділік</p>
                <p className="text-[11px] text-slate-500">100+ премиум кітап</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">0% Жарнама</p>
                <p className="text-[11px] text-slate-500">Үзіліссіз тыңдау</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Шектеусіз уақыт</p>
                <p className="text-[11px] text-slate-500">15-минуттық лимитсіз</p>
              </div>
            </div>
          </div>

          {isSubmitted ? (
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center my-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-emerald-950 mb-1">Төлем чегіңіз қабылданды!</h3>
              <p className="text-sm text-emerald-800 mb-4">
                Админ тексергеннен кейін (әдетте 5–15 минут ішінде) Премиум жазылым автоматты түрде қосылады. Жеке кабинетіңізге хабарлама келеді.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
              >
                Түсіндім, жабу
              </button>
            </div>
          ) : (
            <>
              {/* Tariff selection */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Тариф жоспарын таңдаңыз:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans.map((p) => {
                    const isSelected = selectedPlan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={`relative p-4 rounded-2xl cursor-pointer transition-all border-2 text-left ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/40 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {p.badge && (
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow">
                            {p.badge}
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-base">{p.name}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-amber-500 text-white' : 'border border-slate-300'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="text-xl font-black text-slate-900 mb-1">
                          {p.price.toLocaleString('kk-KZ')} ₸
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{p.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kaspi payment instructions */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-50/60 to-orange-50/60 border border-red-100 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-red-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    Kaspi аударым бойынша нұсқаулық:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-100/80 px-2.5 py-1 rounded-lg transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Нөмірді көшіру
                  </button>
                </div>

                <div className={`grid grid-cols-1 ${settings?.kaspiCard ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2 text-xs text-slate-700`}>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-red-100/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Kaspi нөмірі:</span>
                      <span className="font-black text-slate-900 text-sm">
                        {settings?.kaspiPhone || '+7 (777) 000-00-00'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      title="Көшіру"
                      className="p-1 rounded-lg hover:bg-red-50 text-red-600 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {settings?.kaspiCard && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-red-100/60 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Kaspi картасы:</span>
                        <span className="font-black text-slate-900 text-sm font-mono">
                          {settings.kaspiCard}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCard}
                        title="Картаны көшіру"
                        className="p-1 rounded-lg hover:bg-red-50 text-red-600 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="bg-white/80 p-2.5 rounded-xl border border-red-100/60">
                    <span className="text-slate-400 block text-[10px]">Алушы (Аты-жөні):</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {settings?.kaspiRecipientName || 'Tanda Platform'}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    Kaspi қосымшасында <strong>{currentPlan.price.toLocaleString('kk-KZ')} ₸</strong> аударып, чегін төменде тіркеңіз.
                  </span>
                </div>
              </div>

              {/* Receipt Upload Form */}
              <form onSubmit={handleSubmitReceipt} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kaspi чегінің суреті / скриншоты: <span className="text-red-500">*</span>
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-amber-50/30 transition">
                    {receiptPreview ? (
                      <div className="flex items-center gap-3">
                        <img src={receiptPreview} alt="Receipt preview" className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-900">{receiptFile?.name}</p>
                          <p className="text-[11px] text-slate-500">Басқа сурет таңдау үшін басыңыз</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <Upload className="w-7 h-7 text-slate-400 mb-1.5" />
                        <p className="text-xs font-bold text-slate-700">Чекті таңдау немесе мында тастау</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, PDF (15MB дейін)</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Байланыс нөміріңіз немесе Kaspi атыңыз (міндетті емес):
                  </label>
                  <input
                    type="text"
                    placeholder="+7 (707) 123-45-67 немесе Асылбек Т."
                    value={phoneOrAccount}
                    onChange={(e) => setPhoneOrAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !receiptFile}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-amber-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <span>Жіберілуде...</span>
                  ) : (
                    <>
                      <span>Чекті растауға жіберу ({currentPlan.price.toLocaleString('kk-KZ')} ₸)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Promo code alternative */}
              <div className="pt-4 border-t border-slate-100">
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Промокод бар ма? (мысалы: TANDA30)"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2.5 text-xs font-mono uppercase tracking-wider rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={isApplyingPromo || !promoCodeInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    {isApplyingPromo ? '...' : 'Қолдану'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
