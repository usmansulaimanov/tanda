import React, { useState } from 'react';
import { Check, ShieldCheck, Sparkles, Clock, Headphones, Gift, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { PremiumModal } from './PremiumModal';
import { systemApi } from '../../shared/api/system.api';

export const PremiumPage: React.FC = () => {
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: systemApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const isUserPremium = Boolean(user?.isPremium);

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
            <div className="mt-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 inline-flex items-center gap-3 text-emerald-800 font-bold">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>Сізде белсенді Премиум жазылым бар! Барлық кітаптар ашық.</span>
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
