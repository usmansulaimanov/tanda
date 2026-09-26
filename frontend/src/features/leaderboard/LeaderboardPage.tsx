import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { leaderboardApi, LeaderboardPeriod } from '../../shared/api/leaderboard.api';
import { useAuthStore } from '../../store/useAuthStore';

function formatMinutes(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 мин';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} сағ`;
  return `${hours} сағ ${mins} мин`;
}

export const LeaderboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [activeMainTab, setActiveMainTab] = useState<'leaderboard' | 'personal'>('leaderboard');
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('THIS_WEEK');
  // Leaderboard Query
  const {
    data: leaderboardData,
    isLoading: isLeaderboardLoading,
    isError: isLeaderboardError,
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: ['leaderboard', selectedPeriod],
    queryFn: () => leaderboardApi.getLeaderboard(selectedPeriod),
    staleTime: 30 * 1000,
  });

  // Personal Stats Query
  const {
    data: personalStats,
    isLoading: isPersonalLoading,
    isError: isPersonalError,
    refetch: refetchPersonal,
  } = useQuery({
    queryKey: ['personal-stats'],
    queryFn: leaderboardApi.getPersonalStats,
    enabled: isAuthenticated && activeMainTab === 'personal',
    staleTime: 30 * 1000,
  });

  const filteredEntries = leaderboardData?.topEntries || [];

  const isPastPeriod = selectedPeriod === 'LAST_WEEK' || selectedPeriod === 'LAST_MONTH';

  // Max minutes for chart scaling
  const maxChartMinutes = Math.max(
    ...(personalStats?.dailyActivity?.map((d) => d.minutes) || [60]),
    30
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-7">
        
        {/* Header Title & Description */}
        <div className="text-center space-y-2.5">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Жеке статистика және рейтинг
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Қазақша аудиокітаптарды ең көп тыңдаған оқырмандар рейтингі. Әр апта мен айдың соңында үздік 10 оқырманға арнайы сертификат табысталады!
          </p>
        </div>

        {/* Main Tabs Navigation (Segmented Switcher) */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 bg-slate-200/80 rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => setActiveMainTab('leaderboard')}
              className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeMainTab === 'leaderboard'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Топ 100 оқырман</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('personal')}
              className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeMainTab === 'personal'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Менің статистикам</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LEADERBOARD */}
        {activeMainTab === 'leaderboard' && (
          <div className="space-y-5">
            
            {/* Period Selector Tabs */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('THIS_WEEK')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    selectedPeriod === 'THIS_WEEK'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Осы апта
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('LAST_WEEK')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    selectedPeriod === 'LAST_WEEK'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Өткен апта
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('THIS_MONTH')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    selectedPeriod === 'THIS_MONTH'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Осы ай
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('LAST_MONTH')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    selectedPeriod === 'LAST_MONTH'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Өткен ай
                </button>
              </div>

              {/* Period Label */}
              <div className="text-xs sm:text-sm text-slate-600 font-semibold px-2">
                {leaderboardData?.periodLabel || ''}
              </div>
            </div>

            {/* Past Winners Celebration Banner */}
            {isPastPeriod && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm flex items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                  🎖️
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-amber-900 font-extrabold text-base sm:text-lg">
                    {leaderboardData?.periodLabel} — Ресми сертификат иегерлері
                  </h3>
                  <p className="text-amber-800 text-xs sm:text-sm">
                    Төмендегі үздік 10 оқырманға Tanda платформасының ресми сертификаты табысталады!
                  </p>
                </div>
              </div>
            )}


            {/* Current User Result Card (Pinned at top) */}
            {isAuthenticated && leaderboardData?.currentUserEntry && (
              <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-emerald-500/80 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-black text-lg shadow-sm">
                      {leaderboardData.currentUserEntry.rank > 0 ? `#${leaderboardData.currentUserEntry.rank}` : '—'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-bold text-base sm:text-lg">
                          {leaderboardData.currentUserEntry.fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Сіз
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500">
                        {leaderboardData.currentUserEntry.rank > 0 && leaderboardData.currentUserEntry.rank <= 10 ? (
                          <span className="text-amber-600 font-bold">Сіз Топ-10-ға кіресіз</span>
                        ) : leaderboardData.currentUserEntry.rank > 0 && leaderboardData.currentUserEntry.rank <= 100 ? (
                          <span className="text-emerald-700 font-semibold">Сіз Топ-100 үздік оқырмандар қатарындасыз</span>
                        ) : leaderboardData.currentUserEntry.periodMinutes > 0 ? (
                          <span>Көбірек тыңдап, Топ-100-ге көтеріліңіз!</span>
                        ) : (
                          <span>Бұл мерзімде әзірге тыңдамадыңыз. Кітап тыңдап, рейтингке қосылыңыз!</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Осы мерзімде</div>
                      <div className="text-lg sm:text-xl font-black text-emerald-600">
                        {formatMinutes(leaderboardData.currentUserEntry.periodMinutes)}
                      </div>
                    </div>
                    <div className="text-right border-l border-slate-200 pl-6 hidden sm:block">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Барлық уақытта</div>
                      <div className="text-base sm:text-lg font-bold text-slate-700">
                        {formatMinutes(leaderboardData.currentUserEntry.allTimeMinutes)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Total Participants Info */}
            <div className="flex items-center justify-end gap-4 pt-1">
              <div className="text-xs sm:text-sm text-slate-500 font-medium">
                Барлығы: <span className="text-emerald-700 font-bold">{leaderboardData?.totalParticipants || 0}</span> оқырман
              </div>
            </div>

            {/* Top 100 List / Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {isLeaderboardLoading ? (
                <div className="py-20 text-center space-y-3">
                  <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-sm font-medium">Рейтинг есептелуде...</p>
                </div>
              ) : isLeaderboardError ? (
                <div className="py-16 text-center space-y-4">
                  <p className="text-rose-600 font-medium">Деректерді жүктеу кезінде қате орын алды.</p>
                  <button
                    type="button"
                    onClick={() => refetchLeaderboard()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                  >
                    Қайта көру
                  </button>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="text-4xl">🎧</div>
                  <p className="text-slate-700 font-bold text-base">Бұл мерзімде әзірге тыңдалған аудио жазбалар жоқ.</p>
                  <p className="text-xs text-slate-500">Кітап тыңдап, көшбасшылық қатарға бірінші болып шығыңыз!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 sm:px-6 w-16 text-center">Орын</th>
                        <th className="py-3.5 px-4">Оқырман</th>
                        <th className="py-3.5 px-4 text-right">Таңдалған мерзім</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right hidden sm:table-cell">Барлық уақытта</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredEntries.map((entry) => {
                        const isMe = user?.id === entry.userId;
                        const isTop1 = entry.rank === 1;
                        const isTop2 = entry.rank === 2;
                        const isTop3 = entry.rank === 3;
                        const isTop10 = entry.rank <= 10;

                        return (
                          <tr
                            key={entry.userId}
                            className={`transition-colors ${
                              isMe
                                ? 'bg-emerald-50/80 hover:bg-emerald-100/70 font-semibold'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Rank Column */}
                            <td className="py-3.5 px-4 sm:px-6 text-center">
                              {isTop1 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 text-lg font-bold border border-amber-300 shadow-sm">
                                  🥇
                                </span>
                              ) : isTop2 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-lg font-bold border border-slate-300 shadow-sm">
                                  🥈
                                </span>
                              ) : isTop3 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-800 text-lg font-bold border border-orange-300 shadow-sm">
                                  🥉
                                </span>
                              ) : isTop10 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                                  {entry.rank}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium text-xs sm:text-sm">
                                  #{entry.rank}
                                </span>
                              )}
                            </td>

                            {/* User Info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 overflow-hidden flex-shrink-0">
                                  {entry.avatarUrl ? (
                                    <img
                                      src={entry.avatarUrl}
                                      alt={entry.fullName}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    entry.fullName.trim().charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`truncate text-sm sm:text-base ${isMe ? 'text-emerald-900 font-bold' : 'text-slate-900 font-medium'}`}>
                                      {entry.fullName}
                                    </span>
                                    {isMe && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                        Сіз
                                      </span>
                                    )}
                                    {isTop10 && (
                                      <span className="hidden md:inline-flex items-center text-[11px] text-amber-700 font-bold">
                                        🎖️ Топ 10
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Period Minutes */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="font-extrabold text-emerald-700 text-sm sm:text-base">
                                {formatMinutes(entry.periodMinutes)}
                              </div>
                            </td>

                            {/* All-time Minutes */}
                            <td className="py-3.5 px-4 sm:px-6 text-right hidden sm:table-cell">
                              <div className="text-slate-600 text-sm font-medium">
                                {formatMinutes(entry.allTimeMinutes)}
                              </div>
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
        )}

        {/* TAB 2: PERSONAL STATISTICS */}
        {activeMainTab === 'personal' && (
          <div className="space-y-6">
            {!isAuthenticated ? (
              /* Unauthenticated Call to Action */
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center max-w-xl mx-auto space-y-6 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-3xl mx-auto shadow-sm">
                  🎧
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Жеке статистикаңызды көру үшін жүйеге кіріңіз
                  </h2>
                  <p className="text-slate-600 text-sm">
                    Күнделікті қанша минут тыңдағаныңызды, апталық және айлық тыңдау динамикаңыз бен графигіңізді бақылаңыз.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-sm"
                  >
                    Жүйеге кіру
                  </Link>
                  <Link
                    to="/signup"
                    className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all text-sm border border-slate-200"
                  >
                    Тіркелу
                  </Link>
                </div>
              </div>
            ) : isPersonalLoading ? (
              <div className="py-20 text-center space-y-3">
                <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 text-sm font-medium">Жеке статистика жүктелуде...</p>
              </div>
            ) : isPersonalError || !personalStats ? (
              <div className="py-16 text-center space-y-4">
                <p className="text-rose-600 font-medium">Статистиканы алу мүмкін болмады.</p>
                <button
                  type="button"
                  onClick={() => refetchPersonal()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  Қайта көру
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 4 Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Бүгін</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2">
                      {formatMinutes(personalStats.todayMinutes)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Бүгінгі тыңдалым</div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Соңғы 7 күн</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2">
                      {formatMinutes(personalStats.last7DaysMinutes)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Осы апталық белсенділік</div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Осы айда</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2">
                      {formatMinutes(personalStats.thisMonthMinutes)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Айлық жинақталған уақыт</div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Барлық уақытта</div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                      {formatMinutes(personalStats.allTimeMinutes)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Тіркелгеннен бері</div>
                  </div>
                </div>

                {/* 14-Day Activity Bar Chart */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        Тыңдау белсенділігі (Соңғы 14 күн)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Әр күн бойынша тыңдалған аудио минуттарының динамикасы
                      </p>
                    </div>
                    <div className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Жалпы: {formatMinutes(personalStats.dailyActivity.reduce((acc, curr) => acc + curr.minutes, 0))}
                    </div>
                  </div>

                  {/* SVG/CSS Interactive Bar Graph */}
                  <div className="h-64 sm:h-72 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 pb-2 px-1 sm:px-2 border-b border-slate-200">
                    {personalStats.dailyActivity.map((day) => {
                      const heightPercent = maxChartMinutes > 0 ? (day.minutes / maxChartMinutes) * 100 : 0;
                      const isZero = day.minutes === 0;

                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative"
                        >
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] sm:text-xs py-1 px-2.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-20">
                            {day.dayLabel}: <span className="text-emerald-400 font-bold">{day.minutes} мин</span>
                          </div>

                          {/* Bar Value above bar */}
                          {day.minutes > 0 && (
                            <span className="text-[10px] text-slate-500 mb-1 group-hover:text-emerald-700 font-bold transition-colors hidden sm:block">
                              {day.minutes}
                            </span>
                          )}

                          {/* Bar column */}
                          <div
                            style={{ height: `${Math.max(heightPercent, 4)}%` }}
                            className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                              isZero
                                ? 'bg-slate-200 group-hover:bg-slate-300'
                                : 'bg-emerald-500 group-hover:bg-emerald-600 shadow-sm'
                            }`}
                          ></div>

                          {/* Day Label at bottom */}
                          <span className="text-[10px] sm:text-xs text-slate-500 font-medium mt-2 group-hover:text-slate-900 transition-colors truncate max-w-full text-center">
                            {day.dayLabel.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
