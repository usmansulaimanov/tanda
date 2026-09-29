import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  FileText,
  Tag
} from 'lucide-react';
import tandaPremiumWhite from '../../assets/tanda-premium-white.png';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { usePromoStore } from '../../store/usePromoStore';
import { useToastStore } from '../../store/useToastStore';
import { premiumApi } from '../../shared/api/premium.api';
import { systemApi } from '../../shared/api/system.api';
import { SystemSettings } from '../../types';
import { api } from '../../lib/api';
import { FormattedNoticeText } from '../../components/ui/FormattedNoticeText';

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
  const { activatePromoCode, validatePromoCode } = usePromoStore();
  const { showToast } = useToastStore();

  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: systemApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const [selectedPlan, setSelectedPlan] = useState<'1_MONTH' | '3_MONTHS' | '1_YEAR'>('1_MONTH');
  const [phoneOrAccount, setPhoneOrAccount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
    rewardTitle: string;
  } | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const allPlans = useMemo(() => [
    {
      id: '1_MONTH' as const,
      name: '1 ай',
      days: 30,
      basePrice: settings?.price1Month || 1490,
      price: appliedPromo?.discountPercent
        ? Math.max(1, Math.round((settings?.price1Month || 1490) * (1 - appliedPromo.discountPercent / 100)))
        : settings?.price1Month || 1490,
      oldPrice: appliedPromo?.discountPercent
        ? settings?.price1Month || 1490
        : settings?.oldPrice1Month || null,
      description: settings?.plan1MonthDesc !== undefined ? settings.plan1MonthDesc : '',
      badge: appliedPromo?.discountPercent
        ? `-${appliedPromo.discountPercent}% ЖЕҢІЛДІК`
        : settings?.plan1MonthBadge ? settings.plan1MonthBadge.trim() : null,
      enabled: settings?.plan1MonthEnabled !== false,
    },
    {
      id: '3_MONTHS' as const,
      name: '3 ай',
      days: 90,
      basePrice: settings?.price3Months || 3990,
      price: appliedPromo?.discountPercent
        ? Math.max(1, Math.round((settings?.price3Months || 3990) * (1 - appliedPromo.discountPercent / 100)))
        : settings?.price3Months || 3990,
      oldPrice: appliedPromo?.discountPercent
        ? settings?.price3Months || 3990
        : settings?.oldPrice3Months || null,
      description: settings?.plan3MonthsDesc !== undefined ? settings.plan3MonthsDesc : '10% үнемдейсіз',
      badge: appliedPromo?.discountPercent
        ? `-${appliedPromo.discountPercent}% ЖЕҢІЛДІК`
        : settings?.plan3MonthsBadge !== undefined ? (settings.plan3MonthsBadge.trim() || null) : 'ТИІМДІ',
      enabled: settings?.plan3MonthsEnabled !== false,
    },
    {
      id: '1_YEAR' as const,
      name: '1 жыл',
      days: 365,
      basePrice: settings?.price1Year || 11990,
      price: appliedPromo?.discountPercent
        ? Math.max(1, Math.round((settings?.price1Year || 11990) * (1 - appliedPromo.discountPercent / 100)))
        : settings?.price1Year || 11990,
      oldPrice: appliedPromo?.discountPercent
        ? settings?.price1Year || 11990
        : settings?.oldPrice1Year || null,
      description: settings?.plan1YearDesc !== undefined ? settings.plan1YearDesc : '30% үнемдейсіз',
      badge: appliedPromo?.discountPercent
        ? `-${appliedPromo.discountPercent}% ЖЕҢІЛДІК`
        : settings?.plan1YearBadge !== undefined ? (settings.plan1YearBadge.trim() || null) : 'ҮЗДІК ТАҢДАУ ⭐',
      enabled: settings?.plan1YearEnabled !== false,
    },
  ], [settings, appliedPromo]);

  const plans = useMemo(() => allPlans.filter((p) => p.enabled), [allPlans]);
  const currentPlan = plans.find((p) => p.id === selectedPlan) || plans[0] || allPlans[0];

  useEffect(() => {
    if (plans.length > 0 && !plans.some((p) => p.id === selectedPlan)) {
      setSelectedPlan(plans[0].id);
    }
  }, [plans, selectedPlan]);

  const formatKaspiPhone = (input?: string): string => {
    if (!input) return '+7 777 000 0000';
    const trimmed = input.trim();
    if (trimmed === '+' || trimmed === '+7' || trimmed === '7' || trimmed === '8' || !trimmed) {
      return '+7 777 000 0000';
    }

    let digits = input.replace(/\D/g, '');
    if (!digits) return '+7 777 000 0000';

    if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
      digits = digits.slice(1);
    } else if (digits.startsWith('7') && (input.includes('+7') || digits.length > 10)) {
      digits = digits.slice(1);
    } else if (digits.startsWith('8') && input.startsWith('8')) {
      digits = digits.slice(1);
    }

    digits = digits.slice(0, 10);
    if (!digits) return '+7 777 000 0000';

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

  const formatKaspiCard = (input?: string): string => {
    if (!input) return '0000 0000 0000 0000';
    const digits = input.replace(/\D/g, '').slice(0, 16);
    if (!digits) return '0000 0000 0000 0000';
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join(' ');
  };

  const handleCopyPhone = () => {
    const rawPhone = settings?.kaspiPhone || '+7 777 000 0000';
    const displayPhone = formatKaspiPhone(rawPhone);
    navigator.clipboard.writeText(rawPhone.replace(/\D/g, '') || '77770000000');
    showToast(`${settings?.bankName || 'Kaspi'} нөмірі көшірілді: ` + displayPhone, 'success');
  };

  const handleCopyCard = () => {
    const rawCard = settings?.kaspiCard || '0000 0000 0000 0000';
    const displayCard = formatKaspiCard(rawCard);
    navigator.clipboard.writeText(rawCard.replace(/\s+/g, '') || '0000000000000000');
    showToast('Карта нөмірі көшірілді: ' + displayCard, 'success');
  };

  const compressImageFile = async (file: File, maxDimension = 1280, quality = 0.82): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showToast('Чек файлының көлемі 15MB-тан аспауы керек', 'error');
      return;
    }
    setVerificationError(null);
    setReceiptFile(file);
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setReceiptPreview('pdf');
    } else {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Төлемді тіркеу үшін алдымен сайтқа кіріңіз', 'error');
      return;
    }
    if (!receiptFile) {
      showToast('Өтініш, төлем чегін немесе түбіртекті жүктеңіз', 'error');
      return;
    }

    setVerificationError(null);
    setIsUploading(true);
    try {
      // 1. Instant client-side compression (< 150KB)
      const compressedFile = await compressImageFile(receiptFile);

      // 2. Upload receipt image to fast authenticated endpoint
      let receiptUrl = '';
      try {
        receiptUrl = await premiumApi.uploadReceiptImage(compressedFile);
      } catch (uploadErr) {
        console.warn('Direct receipt upload failed, fallback', uploadErr);
        receiptUrl = receiptPreview || 'receipt_attached';
      }

      // 3. Submit payment request (triggers instant AI verification)
      const userNotes = [
        `Пайдаланушы: ${user?.name || user?.email}`,
        appliedPromo ? `[Қолданылған промокод: ${appliedPromo.code} (-${appliedPromo.discountPercent}% жеңілдік)]` : null,
      ].filter(Boolean).join(' | ');

      const result = await premiumApi.createSubscriptionRequest({
        planName: currentPlan.id,
        planDays: currentPlan.days,
        amountKzt: currentPlan.price,
        receiptUrl: receiptUrl || 'receipt_attached',
        phoneOrAccount: phoneOrAccount.trim() || undefined,
        notes: userNotes,
      });

      setVerificationResult(result);

      if (result.status === 'APPROVED') {
        setIsSubmitted(true);
        showToast('Tanda Premium сәтті белсендірілді! 👑', 'success');
      } else if (result.status === 'PENDING') {
        setIsSubmitted(true);
        showToast('Төлем чегі сәтті қабылданды! ⏳ Модератор тексерген соң премиум іске қосылады.', 'info');
      } else {
        const errorReason = result.rejectionReason || 'Төлем чегі тексеруден өтпеді. Деректерді тексеріп, қайта жүктеңіз.';
        setVerificationError(errorReason);
        showToast(errorReason, 'error');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Чекті тексеру кезінде қате орын алды';
      setVerificationError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyPromo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promoCodeInput.trim()) return;
    if (!isAuthenticated) {
      showToast('Промокодты қолдану үшін алдымен жүйеге кіріңіз', 'error');
      return;
    }

    setIsApplyingPromo(true);
    try {
      const cleanCode = promoCodeInput.trim().toUpperCase();
      const validation = await validatePromoCode(cleanCode);

      if (!validation.valid) {
        showToast(validation.message || 'Промокод жарамсыз немесе мерзімі өткен', 'error');
        return;
      }

      const rewardType = validation.rewardType?.toLowerCase() || '';
      const isDiscount = rewardType.includes('discount') || (validation.discountPercent !== undefined && validation.discountPercent > 0);

      if (isDiscount && validation.discountPercent && validation.discountPercent > 0) {
        setAppliedPromo({
          code: cleanCode,
          discountPercent: validation.discountPercent,
          rewardTitle: validation.rewardTitle || `${validation.discountPercent}% жеңілдік`,
        });
        showToast(`«${cleanCode}» промокоды қолданылды: -${validation.discountPercent}% жеңілдік! 🎉`, 'success');
      } else {
        // Free subscription promo code: Activate immediately
        const res = await activatePromoCode(cleanCode);
        if (res.success) {
          showToast(`Промокод сәтті қолданылды (${res.rewardTitle || 'Премиум'})! 👑`, 'success');
          onClose();
          window.location.reload();
        } else {
          showToast(res.error || 'Промокод жарамсыз немесе мерзімі өткен', 'error');
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Промокодты тексеру кезінде қате орын алды';
      showToast(msg, 'error');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Reset receipt state whenever modal closes or opens fresh
  useEffect(() => {
    if (!isOpen) {
      setReceiptFile(null);
      setReceiptPreview('');
      setVerificationError(null);
      setVerificationResult(null);
      setIsUploading(false);
      setIsSubmitted(false);
      setAppliedPromo(null);
      setPromoCodeInput('');
    }
  }, [isOpen]);

  const handleModalClose = () => {
    setReceiptFile(null);
    setReceiptPreview('');
    setVerificationError(null);
    setVerificationResult(null);
    setIsUploading(false);
    setIsSubmitted(false);
    onClose();
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleModalClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={handleModalClose} />

      <div className="flex min-h-full items-start justify-center p-3 sm:p-6 text-center">
        <div className="w-full max-w-2xl my-6 sm:my-10 transform rounded-3xl bg-white p-6 sm:p-8 text-left shadow-2xl transition-all z-10 border border-orange-100 relative mb-24 sm:mb-28">
          {/* Close button */}
          <button
            onClick={handleModalClose}
            className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F08000] to-orange-400 flex items-center justify-center p-2 text-white shadow-lg shadow-orange-500/20">
              <img
                src={tandaPremiumWhite}
                alt="Tanda Premium"
                className="w-7 h-auto object-contain drop-shadow-sm"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900">Tanda Premium</h2>
              </div>
              {initialReason && (
                <p className="text-sm text-slate-500">
                  {initialReason}
                </p>
              )}
            </div>
          </div>

          {!settings ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#F08000] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Баптаулар мен тарифтер жүктелуде...</p>
            </div>
          ) : isSubmitted ? (
            verificationResult?.status === 'PENDING' ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-50 to-orange-50/40 border border-amber-200 text-center my-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-600 shadow-md">
                  <Clock className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-amber-950 mb-1">Төлем чегі қабылданды! ⏳</h3>
                  <p className="text-sm text-amber-800 max-w-md mx-auto">
                    Сіздің төлем чегіңіз сәтті жіберілді. Модератор растаған бойда Tanda Premium жазылымыңыз автоматты түрде қосылады.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                    }}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm transition shadow-lg shadow-slate-900/20 cursor-pointer"
                  >
                    Түсінікті, жабу
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-emerald-50 to-teal-50/40 border border-emerald-200 text-center my-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-600 shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-emerald-950 mb-1">Tanda Premium белсендірілді! 👑</h3>
                  <p className="text-sm text-emerald-800 max-w-md mx-auto">
                    Төлем чегіңіз автоматты түрде расталды. Барлық аудио және электронды кітаптарды шектеусіз әрі жарнамасыз тыңдай аласыз!
                  </p>
                </div>

                {verificationResult?.receiptNumber && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-emerald-200 text-xs text-emerald-900 shadow-sm">
                    <span className="font-semibold text-slate-500">Чек №:</span>
                    <span className="font-mono font-bold">{verificationResult.receiptNumber}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      window.location.reload();
                    }}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    Тыңдауды бастау 🎧
                  </button>
                </div>
              </div>
            )
          ) : (

            <>
              {/* Tariff selection */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Тариф жоспарын таңдаңыз:
                </label>
                <div className={`grid grid-cols-1 ${plans.length === 2 ? 'sm:grid-cols-2' : plans.length === 1 ? 'sm:grid-cols-1 max-w-sm mx-auto' : 'sm:grid-cols-3'} gap-3`}>
                  {plans.map((p) => {
                    const isSelected = selectedPlan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={`relative p-4 rounded-2xl cursor-pointer transition-all border-2 text-left ${
                          isSelected
                            ? 'border-[#F08000] bg-orange-50/40 shadow-md shadow-orange-500/10 ring-2 ring-orange-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {p.badge && p.badge.trim() ? (
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-[#F08000] to-orange-600 text-white shadow">
                            {p.badge.trim()}
                          </span>
                        ) : null}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-base">{p.name}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#F08000] text-white' : 'border border-slate-300'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xl font-black text-slate-900">
                            {p.price.toLocaleString('kk-KZ')} ₸
                          </span>
                          {p.oldPrice && p.oldPrice > p.price ? (
                            <span className="text-xs font-bold text-slate-400 line-through">
                              {p.oldPrice.toLocaleString('kk-KZ')} ₸
                            </span>
                          ) : null}
                        </div>
                        {p.description && p.description.trim() ? (
                          <p className="text-[11px] text-slate-500 leading-snug">{p.description.trim()}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Promo code section (Directly under tariff cards) */}
                <div className="mt-3">
                  {appliedPromo ? (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-950">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Tag className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs text-emerald-900 tracking-wider uppercase">
                              {appliedPromo.code}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-200/80 text-[10px] font-black text-emerald-800">
                              -{appliedPromo.discountPercent}% ЖЕҢІЛДІК
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700">
                            Барлық тарифтердің бағасы {appliedPromo.discountPercent}%-ға төмендетілді
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedPromo(null);
                          setPromoCodeInput('');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer font-medium"
                      >
                        Болдырмау
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Промокод бар ма?"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPromo();
                          }
                        }}
                        className="flex-1 px-3.5 py-2.5 text-xs font-mono uppercase tracking-wider rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F08000] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPromo()}
                        disabled={isApplyingPromo || !promoCodeInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                      >
                        {isApplyingPromo ? '...' : 'Қолдану'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Notice (Ескерту) */}
              {settings?.paymentNoticeEnabled !== false && settings?.paymentNotice && settings.paymentNotice.trim() && (
                <div className="mb-6 text-xs text-slate-800 leading-relaxed px-1">
                  <FormattedNoticeText
                    text={settings.paymentNotice.trim()}
                    align={settings.paymentNoticeAlign || 'left'}
                  />
                </div>
              )}

              {/* Payment instructions */}
              {(() => {
                const isPhoneVisible = settings?.kaspiPhoneEnabled !== false;
                const isCardVisible = Boolean(settings?.kaspiCardEnabled);
                const gridColsClass = isPhoneVisible && isCardVisible
                  ? 'sm:grid-cols-3'
                  : (isPhoneVisible || isCardVisible)
                  ? 'sm:grid-cols-2'
                  : 'sm:grid-cols-1';

                return (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-900" />
                        {settings?.bankName || 'Kaspi'} аударым бойынша нұсқаулық:
                      </span>
                      {isPhoneVisible ? (
                        <button
                          type="button"
                          onClick={handleCopyPhone}
                          className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          Нөмірді көшіру
                        </button>
                      ) : isCardVisible ? (
                        <button
                          type="button"
                          onClick={handleCopyCard}
                          className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          Картаны көшіру
                        </button>
                      ) : null}
                    </div>

                    <div className={`grid grid-cols-1 ${gridColsClass} gap-2 text-xs text-slate-700`}>
                      {isPhoneVisible && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 block text-[10px]">{settings?.bankName || 'Kaspi'} нөмірі:</span>
                            <span className="font-black text-slate-900 text-sm font-mono">
                              {formatKaspiPhone(settings?.kaspiPhone)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyPhone}
                            title="Көшіру"
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {isCardVisible && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 block text-[10px]">{settings?.bankName || 'Банк'} картасы:</span>
                            <span className="font-black text-slate-900 text-sm font-mono">
                              {formatKaspiCard(settings?.kaspiCard)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyCard}
                            title="Картаны көшіру"
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                        <span className="text-slate-400 block text-[10px]">Алушы (Аты-жөні):</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {settings?.kaspiRecipientName || 'Tanda Platform'}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                      <strong className="font-bold text-slate-900">Маңызды ескерту:</strong>{' '}
                      {settings?.bankName || 'Kaspi'} қосымшасында <strong className="font-black text-slate-900">дәл осы соманы ({currentPlan.price.toLocaleString('kk-KZ')} ₸)</strong> ғана аударыңыз. Бұдан артық та, кем де салмаңыз, әйтпесе төлем есептелмейді және жазылым іске қосылмайды. Төлем жасалған соң чекті төменде тіркеңіз.
                    </p>
                  </div>
                );
              })()}

              {/* Receipt Upload Form */}
              <form onSubmit={handleSubmitReceipt} className="space-y-4 mb-6">
                {verificationError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div className="flex-1 text-xs leading-relaxed text-left">
                      <span className="font-bold text-rose-900 block mb-0.5">
                        Төлем чегі қабылданбады:
                      </span>
                      <p className="text-rose-900 font-medium">
                        {verificationError}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Төлем чегі: <span className="text-red-500">*</span>
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-[#F08000] rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-orange-50/30 transition">
                    {receiptPreview ? (
                      <div className="flex items-center gap-3">
                        {receiptPreview === 'pdf' || receiptFile?.name.toLowerCase().endsWith('.pdf') ? (
                          <div className="w-14 h-14 rounded-xl bg-red-50 text-red-600 flex flex-col items-center justify-center font-bold text-[11px] border border-red-200 shrink-0">
                            <FileText className="w-6 h-6 mb-0.5 text-red-500" />
                            PDF
                          </div>
                        ) : (
                          <img src={receiptPreview} alt="Receipt preview" className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0" />
                        )}
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{receiptFile?.name}</p>
                          <p className="text-[11px] text-slate-500">Басқа файл таңдау үшін басыңыз</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <Upload className="w-7 h-7 text-slate-400 mb-1.5" />
                        <p className="text-xs font-bold text-slate-700">Чекті таңдау немесе мында тастау</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG немесе PDF түбіртектері (15MB дейін)</p>
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
                    Байланыс нөміріңіз немесе Kaspi атыңыз:
                  </label>
                  <input
                    type="text"
                    placeholder="+7 (707) 123-45-67 немесе Асылбек Т."
                    value={phoneOrAccount}
                    onChange={(e) => setPhoneOrAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F08000]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !receiptFile}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#F08000] to-orange-600 hover:from-[#c06800] hover:to-orange-700 text-white font-black text-sm shadow-lg shadow-orange-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>AI чекті тексеруде... (3–5 сек)</span>
                    </span>
                  ) : (
                    <span>Чекті растауға жіберу</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
