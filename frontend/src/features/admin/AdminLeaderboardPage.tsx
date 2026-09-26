import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi, LeaderboardPeriod } from '../../shared/api/leaderboard.api';
import { useToastStore } from '../../store/useToastStore';

function formatMinutes(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 мин';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} сағ`;
  return `${hours} сағ ${mins} мин`;
}

export const AdminLeaderboardPage: React.FC = () => {
  const { showToast } = useToastStore();
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('LAST_WEEK');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-leaderboard', selectedPeriod, isCustomMode, customStartDate, customEndDate],
    queryFn: () => {
      if (isCustomMode && customStartDate && customEndDate) {
        return leaderboardApi.getAdminLeaderboard({
          startDate: customStartDate,
          endDate: customEndDate,
        });
      }
      return leaderboardApi.getAdminLeaderboard({ period: selectedPeriod });
    },
    staleTime: 30 * 1000,
  });

  const entries = (data?.topEntries || []).filter((e) =>
    e.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (e.email && e.email.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  const top10Winners = (data?.topEntries || []).slice(0, 10);

  const handleCopyTop10Emails = () => {
    const emails = top10Winners
      .map((w) => w.email)
      .filter(Boolean)
      .join(', ');

    if (!emails) {
      showToast('Жеңімпаздардың поштасы табылмады', 'info');
      return;
    }

    navigator.clipboard.writeText(emails);
    showToast('Топ-10 жеңімпаздың пошталары көшірілді!', 'success');
  };

  const handleCopySingleEmail = (email?: string) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    showToast(`${email} көшірілді!`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              Әкімші басқару тақтасы
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
              <span>🏆</span>
              <span>Оқырмандар рейтингі және Сертификаттар</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Апталық және айлық жеңімпаздарды қарау, сертификат жолдау үшін байланыс пошталарын алу
            </p>
          </div>

          {top10Winners.length > 0 && (
            <button
              type="button"
              onClick={handleCopyTop10Emails}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all text-xs sm:text-sm flex items-center gap-2"
            >
              <span>📋</span>
              <span>Топ-10 пошталарын көшіру ({top10Winners.length})</span>
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-700/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedPeriod('THIS_WEEK');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  !isCustomMode && selectedPeriod === 'THIS_WEEK'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Осы апта
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedPeriod('LAST_WEEK');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  !isCustomMode && selectedPeriod === 'LAST_WEEK'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🏆 Өткен апта (Жеңімпаздар)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedPeriod('THIS_MONTH');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  !isCustomMode && selectedPeriod === 'THIS_MONTH'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Осы ай
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedPeriod('LAST_MONTH');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  !isCustomMode && selectedPeriod === 'LAST_MONTH'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🏆 Өткен ай (Жеңімпаздар)
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isCustomMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                📅 Еркін мерзім
              </button>
            </div>

            <div className="text-xs sm:text-sm text-amber-400 font-bold">
              {data?.periodLabel || ''}
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {isCustomMode && (
            <div className="pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Басталуы:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs sm:text-sm rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Аяқталуы:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs sm:text-sm rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Сүзу
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Аты немесе email бойынша іздеу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-xs sm:text-sm text-slate-400">
            Барлығы: <span className="text-emerald-400 font-bold">{data?.totalParticipants || 0}</span> оқырман
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm">Деректер есептелуде...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-rose-400 font-medium">Қате орын алды.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 bg-slate-700 rounded-xl text-xs font-semibold text-white"
              >
                Қайта көру
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Бұл мерзімде тыңдалым жазбалары жоқ.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">Орын</th>
                    <th className="py-3 px-4">Оқырман</th>
                    <th className="py-3 px-4">Электронды пошта (Email)</th>
                    <th className="py-3 px-4 text-right">Мерзімдегі минуттар</th>
                    <th className="py-3 px-4 text-right">Барлық уақытта</th>
                    <th className="py-3 px-4 text-center">Сертификат</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {entries.map((entry) => {
                    const isTop10 = entry.rank <= 10;
                    return (
                      <tr
                        key={entry.userId}
                        className={`transition-colors ${isTop10 ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-slate-700/30'}`}
                      >
                        <td className="py-3 px-4 text-center font-bold">
                          {entry.rank === 1 ? '🥇 1' : entry.rank === 2 ? '🥈 2' : entry.rank === 3 ? '🥉 3' : `#${entry.rank}`}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {entry.fullName}
                        </td>
                        <td className="py-3 px-4">
                          {entry.email ? (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 font-mono text-xs">{entry.email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopySingleEmail(entry.email)}
                                title="Поштаны көшіру"
                                className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {formatMinutes(entry.periodMinutes)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {formatMinutes(entry.allTimeMinutes)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isTop10 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              🎖️ Топ-10 Иегері
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
