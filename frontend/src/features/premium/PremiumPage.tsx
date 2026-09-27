import React, { useState } from 'react';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import tandaPremiumWhite from '../../assets/tanda-premium-white.png';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { PremiumModal } from './PremiumModal';
import { systemApi } from '../../shared/api/system.api';
import { premiumApi } from '../../shared/api/premium.api';

const formatKazakhDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = [
      'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
      'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year} ж.`;
  } catch {
    return dateStr;
  }
};

const calculateDaysRemaining = (expiresAtStr?: string | null): number => {
  if (!expiresAtStr) return 0;
  try {
    const exp = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diffMs = exp - now;
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
};

export const PremiumPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: systemApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const isUserPremium = Boolean(user?.isPremium);

  const { data: premiumStatus } = useQuery({
    queryKey: ['myPremiumStatus', user?.id],
    queryFn: premiumApi.getPremiumStatus,
    enabled: Boolean(isAuthenticated && isUserPremium),
    staleTime: 60 * 1000,
  });

  const effectiveStartsAt = premiumStatus?.startsAt || user?.premiumStartsAt || user?.createdAt;
  const effectiveExpiresAt = premiumStatus?.expiresAt || user?.premiumExpiresAt;
  const effectiveDaysRemaining = premiumStatus?.daysRemaining ?? calculateDaysRemaining(effectiveExpiresAt);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Қазақ тіліндегі үздік кітаптарды <br />
            <span className="bg-gradient-to-r from-[#F08000] via-orange-600 to-orange-700 bg-clip-text text-transparent">
              шектеусіз тыңдаңыз
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            100-ден астам аудиокітап, кәсіби дикторлар дауысы, 0% жарнама және шексіз хронометраж.
          </p>

          {isUserPremium ? (
            <div className="mt-8 max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-orange-200/80 shadow-xl shadow-orange-500/5 text-left">
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F08000] to-orange-400 flex items-center justify-center p-2 shadow-md shadow-orange-500/20 shrink-0">
                  <img
                    src={tandaPremiumWhite}
                    alt="Tanda Premium"
                    className="w-6 h-auto object-contain drop-shadow-sm"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Сізде белсенді Премиум жазылым бар!
                  </h3>
                </div>
              </div>

              {/* 3 Detail Metric Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                {/* 1. Қосылған күні */}
                <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-3.5 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#F08000]" />
                    <span>Қосылған күні:</span>
                  </div>
                  <div className="text-xs sm:text-sm font-black text-slate-800">
                    {formatKazakhDate(effectiveStartsAt)}
                  </div>
                </div>

                {/* 2. Аяқталу мерзімі */}
                <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-3.5 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>Аяқталу мерзімі:</span>
                  </div>
                  <div className="text-xs sm:text-sm font-black text-slate-800">
                    {formatKazakhDate(effectiveExpiresAt)}
                  </div>
                </div>

                {/* 3. Қалған күндер */}
                <div className="bg-emerald-50/80 rounded-2xl p-3 sm:p-3.5 border border-emerald-200/70">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Қалған уақыт:</span>
                  </div>
                  <div className="text-xs sm:text-sm font-black text-emerald-700">
                    {effectiveDaysRemaining > 0 ? `${effectiveDaysRemaining} күн қалды` : 'Бүгін аяқталады'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F08000] to-orange-600 hover:from-[#c06800] hover:to-orange-700 text-white font-black text-base shadow-xl shadow-orange-500/25 transition transform hover:-translate-y-0.5"
              >
                Премиумға жазылу
              </button>
            </div>
          )}
        </div>

        {/* Comparison Grid */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
            Стандартты оқырман vs Премиум оқырман
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Мүмкіндік</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase text-center">Стандартты (Тегін)</th>
                  <th className="py-3 px-4 text-xs font-bold text-[#F08000] uppercase text-center bg-orange-50/50 rounded-t-xl">Tanda Premium 👑</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <tr>
                  <td className="py-4 px-4 font-semibold text-slate-800">Тегін кітаптарды тыңдау</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold">Иә</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold bg-orange-50/30">Иә</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-slate-800">Премиум топтама кітаптары</td>
                  <td className="py-4 px-4 text-center text-slate-400">Тек 15 минуттық үзінді</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold bg-orange-50/30">Толық шектеусіз</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-slate-800">Аудио-жарнамалар</td>
                  <td className="py-4 px-4 text-center text-slate-500">15 сек жарнама бар</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold bg-orange-50/30">Мүлдем жоқ (0%)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-slate-800">Ойнату жылдамдығы (0.75x–2x)</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold">Иә</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold bg-orange-50/30">Иә</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-slate-800">Туған күн сыйлығы (+30 күн)</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold">Иә</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold bg-orange-50/30">Иә (+30 күн қосылады)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        <PremiumModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </div>
  );
};
