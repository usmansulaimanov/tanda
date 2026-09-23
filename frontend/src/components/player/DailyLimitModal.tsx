import React from 'react';
import { Clock, X, AlertCircle } from 'lucide-react';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';

export const DailyLimitModal: React.FC = () => {
  const { showDailyLimitModal, closeDailyLimitModal } = useAudioPlayerStore();

  if (!showDailyLimitModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center relative transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-limit-title"
      >
        {/* Close icon button */}
        <button
          type="button"
          onClick={closeDailyLimitModal}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          aria-label="Жабу"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-[#EF7E00] shadow-sm mb-4">
          <Clock className="w-8 h-8" />
        </div>

        {/* Modal Title */}
        <h3 id="daily-limit-title" className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          Тыңдалым лимиті аяқталды
        </h3>

        {/* Main Message */}
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-5">
          Бүгінгі күнге берілген тыңдалым лимитіңіз (8 сағат) аяқталды. Кітапты тыңдауды ертең (00:00-ден кейін) жалғастыра аласыз.
        </p>

        {/* Informative Hint Box */}
        <div className="w-full bg-[#E8F1FB]/60 border border-[#005494]/15 rounded-2xl p-3.5 mb-6 flex items-start gap-2.5 text-left">
          <AlertCircle className="w-4 h-4 text-[#005494] shrink-0 mt-0.5" />
          <p className="text-xs text-[#005494] font-medium leading-relaxed">
            Күн сайын сағат 00:00-де 8 сағаттық аудио тыңдалым лимиті автоматты түрде қайта жаңарады.
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={closeDailyLimitModal}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#005494] hover:bg-[#003F70] text-white font-bold text-sm sm:text-base transition-all shadow-md hover:shadow-lg active:scale-98"
        >
          Түсінікті
        </button>
      </div>
    </div>
  );
};
