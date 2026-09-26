import React from 'react';
import { Bell, BellRing, BellOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useToastStore } from '../../../store/useToastStore';

export const PushNotificationPrompt: React.FC = () => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const { showToast } = useToastStore();

  if (!isSupported) {
    return null;
  }

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      showToast('Push-хабарламалар сәтті қосылды!', 'success');
    } else if (permission === 'denied') {
      showToast('Браузер баптауынан хабарламаларға рұқсат беріңіз', 'error');
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      showToast('Push-хабарламалар өшірілді', 'info');
    }
  };

  // If already subscribed
  if (isSubscribed) {
    return (
      <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              Push-хабарламалар қосылған
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                Белсенді
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Жаңа кітаптар, нақыл сөздер мен маңызды хабарламалар телефоныңызға келеді.
            </p>
          </div>
        </div>

        <button
          onClick={handleUnsubscribe}
          disabled={isLoading}
          className="text-xs font-semibold text-slate-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0 self-start sm:self-auto flex items-center gap-1.5"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <BellOff className="w-3.5 h-3.5" />
          )}
          Өшіру
        </button>
      </div>
    );
  }

  // If permission was previously denied
  if (permission === 'denied') {
    return (
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900 m-0">
            Хабарламалар браузерде бұғатталған
          </h4>
          <p className="text-xs text-amber-700 m-0 mt-1 leading-relaxed">
            Телефон экранына уведомление келуі үшін браузердің мекенжай жолағындағы (🔒 немесе ⚙️) белгіні басып, хабарламаларға рұқсат (Разрешить) беріңіз.
          </p>
        </div>
      </div>
    );
  }

  // Default: Prompt user to enable push notifications
  return (
    <div className="bg-gradient-to-r from-sky-50 via-indigo-50/50 to-blue-50 border border-sky-100 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 m-0">
              Телефонға жедел хабарлама (Push) алғыңыз келе ме?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 m-0 mt-1 leading-relaxed max-w-xl">
              Сайт жабық болса да, жаңа кітаптар мен күнделікті нақыл сөздер телефоныңыздың экранына уведомление болып шығады.
            </p>
            {error && (
              <p className="text-xs text-rose-600 font-medium m-0 mt-1.5">{error}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-600/25 transition-all shrink-0 cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Қосылуда...</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>Хабарламаларды қосу</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
