import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
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

function getPeriodDisplayLabel(period: LeaderboardPeriod): string {
  switch (period) {
    case 'THIS_MONTH':
      return 'Осы айда';
    case 'LAST_MONTH':
      return 'Өткен айда';
    case 'THIS_WEEK':
      return 'Осы аптада';
    case 'LAST_WEEK':
      return 'Өткен аптада';
    default:
      return 'Осы мерзімде';
  }
}

export const LeaderboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab: leaderboard | personal
  const tabParam = searchParams.get('tab');
  const activeMainTab: 'leaderboard' | 'personal' = tabParam === 'personal' ? 'personal' : 'leaderboard';

  // Period: THIS_MONTH (default) | LAST_MONTH | THIS_WEEK | LAST_WEEK
  const periodParam = searchParams.get('period') as LeaderboardPeriod | null;
  const validPeriods: LeaderboardPeriod[] = ['THIS_MONTH', 'LAST_MONTH', 'THIS_WEEK', 'LAST_WEEK'];
  const selectedPeriod: LeaderboardPeriod = (periodParam && validPeriods.includes(periodParam)) ? periodParam : 'THIS_MONTH';

  const setActiveMainTab = (tab: 'leaderboard' | 'personal') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'personal') {
        next.set('tab', 'personal');
      } else {
        next.delete('tab');
      }
      return next;
    }, { replace: true });
  };

  const setSelectedPeriod = (period: LeaderboardPeriod) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (period === 'THIS_MONTH') {
        next.delete('period');
      } else {
        next.set('period', period);
      }
      return next;
    }, { replace: true });
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const selectedYear = currentYear;
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const isFirstMonth = selectedMonth <= 1;
  const isCurrentOrFutureMonth = selectedMonth >= currentMonth;

  const handlePrevMonth = () => {
    if (isFirstMonth) return;
    setSelectedMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    if (isCurrentOrFutureMonth) return;
    setSelectedMonth((m) => m + 1);
  };

  // Leaderboard Query
  const {
    data: leaderboardData,
    isLoading: isLeaderboardLoading,
    isFetching: isLeaderboardFetching,
    isError: isLeaderboardError,
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: ['leaderboard', selectedPeriod],
    queryFn: () => leaderboardApi.getLeaderboard(selectedPeriod),
    staleTime: 30 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15000),
  });

  // Personal Stats Query
  const {
    data: personalStats,
    isLoading: isPersonalLoading,
    isFetching: isPersonalFetching,
    isError: isPersonalError,
    refetch: refetchPersonal,
  } = useQuery({
    queryKey: ['personal-stats', selectedYear, selectedMonth],
    queryFn: () => leaderboardApi.getPersonalStats({ year: selectedYear, month: selectedMonth }),
    enabled: isAuthenticated && activeMainTab === 'personal',
    staleTime: 30 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15000),
  });


  const filteredEntries = leaderboardData?.topEntries || [];

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
            Қазақша аудиокітаптарды ең көп тыңдаған оқырмандар рейтингі.
          </p>
        </div>

        {/* Main Tabs Navigation (Segmented Switcher) */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => setActiveMainTab('leaderboard')}
              className={`flex items-center justify-center px-4 sm:px-5 py-1.5 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${
                activeMainTab === 'leaderboard'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Топ 100</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('personal')}
              className={`flex items-center justify-center px-4 sm:px-5 py-1.5 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${
                activeMainTab === 'personal'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Статистикам</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LEADERBOARD */}
        {activeMainTab === 'leaderboard' && (
          <div className="space-y-5">
            
            {/* Period Selector Tabs */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('THIS_MONTH')}
                  className={`px-1.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap flex items-center justify-center ${
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
                  className={`px-1.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap flex items-center justify-center ${
                    selectedPeriod === 'LAST_MONTH'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Өткен ай
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('THIS_WEEK')}
                  className={`px-1.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap flex items-center justify-center ${
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
                  className={`px-1.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap flex items-center justify-center ${
                    selectedPeriod === 'LAST_WEEK'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Өткен апта
                </button>
              </div>

              {/* Period Label */}
              <div className="text-xs sm:text-sm text-slate-600 font-semibold px-1 sm:px-2">
                {leaderboardData?.periodLabel || ''}
              </div>
            </div>

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
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        {getPeriodDisplayLabel(selectedPeriod)}
                      </div>
                      <div className="text-lg sm:text-xl font-black text-emerald-600">
                        {formatMinutes(leaderboardData.currentUserEntry.periodMinutes)}
                      </div>
                    </div>
                    <div className="text-right border-l border-slate-200 pl-6 hidden sm:block">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Жалпы</div>
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
              {isLeaderboardLoading || (isLeaderboardFetching && !leaderboardData) ? (

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
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2 pl-3 pr-1 sm:pl-4 sm:pr-2 w-12 sm:w-16 text-center">Орын</th>
                        <th className="py-2 pl-1 pr-3 sm:pl-2 sm:pr-4">Оқырман</th>
                        <th className="py-2 px-3 sm:px-4 text-right">{getPeriodDisplayLabel(selectedPeriod)}</th>
                        <th className="py-2 px-3 sm:px-6 text-right hidden sm:table-cell">Жалпы</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
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
                            <td className="py-1.5 sm:py-2 pl-3 pr-1 sm:pl-4 sm:pr-2 text-center w-12 sm:w-16">
                              {isTop1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-base font-bold border border-amber-300 shadow-sm">
                                  🥇
                                </span>
                              ) : isTop2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-base font-bold border border-slate-300 shadow-sm">
                                  🥈
                                </span>
                              ) : isTop3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-800 text-base font-bold border border-orange-300 shadow-sm">
                                  🥉
                                </span>
                              ) : isTop10 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                                  {entry.rank}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium text-xs">
                                  #{entry.rank}
                                </span>
                              )}
                            </td>

                            {/* User Info */}
                            <td className="py-1.5 sm:py-2 pl-1 pr-3 sm:pl-2 sm:pr-4">
                              <div className="flex items-center gap-2 sm:gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 overflow-hidden flex-shrink-0">
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
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`truncate text-xs sm:text-sm ${isMe ? 'text-emerald-900 font-bold' : 'text-slate-900 font-medium'}`}>
                                      {entry.fullName}
                                    </span>
                                    {isMe && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                                        Сіз
                                      </span>
                                    )}
                                    {isTop10 && (
                                      <span className="hidden md:inline-flex items-center text-[10px] text-amber-700 font-bold">
                                        🎖️ Топ 10
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Period Minutes */}
                            <td className="py-1.5 sm:py-2 px-3 sm:px-4 text-right whitespace-nowrap">
                              <div className="font-bold text-emerald-700 text-xs sm:text-sm">
                                {formatMinutes(entry.periodMinutes)}
                              </div>
                            </td>

                            {/* All-time Minutes */}
                            <td className="py-1.5 sm:py-2 px-3 sm:px-6 text-right hidden sm:table-cell whitespace-nowrap">
                              <div className="text-slate-600 text-xs sm:text-sm font-medium">
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
                
                {/* 4 Summary Cards (Ordered: Жалпы, Бүгін, Осы айда, Соңғы 7 күн) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Жалпы</div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                      {formatMinutes(personalStats.allTimeMinutes)}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Бүгін</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2">
                      {formatMinutes(personalStats.todayMinutes)}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Осы айда</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2">
                      {formatMinutes(personalStats.thisMonthMinutes)}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Соңғы 7 күн</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2">
                      {formatMinutes(personalStats.last7DaysMinutes)}
                    </div>
                  </div>
                </div>

                {/* Monthly Activity Bar Chart */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        Тыңдау белсенділігі: {personalStats.selectedMonthName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Month Navigation Switcher */}
                      <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          disabled={isFirstMonth}
                          title="Өткен ай"
                          className={`p-1 rounded-lg transition-colors ${
                            isFirstMonth
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm cursor-pointer'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-2 min-w-[70px] text-center select-none">
                          {personalStats.selectedMonthName}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          disabled={isCurrentOrFutureMonth}
                          title="Келесі ай"
                          className={`p-1 rounded-lg transition-colors ${
                            isCurrentOrFutureMonth
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm cursor-pointer'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      <div className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 whitespace-nowrap">
                        Жалпы: {formatMinutes(personalStats.selectedMonthMinutes)}
                      </div>
                    </div>
                  </div>

                  {/* SVG/CSS Interactive Bar Graph */}
                  <div className="overflow-x-auto pb-1 -mx-2 px-2">
                    <div className="h-32 sm:h-36 min-w-[680px] sm:min-w-[780px] flex items-end justify-between gap-1 sm:gap-1.5 pt-5 pb-1 px-2 sm:px-3 border-b border-slate-200">
                      {personalStats.dailyActivity.map((day, idx) => {
                        const heightPercent = maxChartMinutes > 0 ? (day.minutes / maxChartMinutes) * 75 : 0;
                        const isZero = day.minutes === 0;
                        const isFirstFew = idx < 2;
                        const isLastFew = idx > personalStats.dailyActivity.length - 3;
                        const tooltipPosClass = isFirstFew
                          ? 'left-0 translate-x-0'
                          : isLastFew
                          ? 'right-0 translate-x-0'
                          : 'left-1/2 -translate-x-1/2';

                        const formattedDayNum = String(day.dayOfMonth).padStart(2, '0');

                        return (
                          <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center h-full justify-end group relative min-w-[16px]"
                          >
                            {/* Tooltip on hover - positioned safely inside chart container header */}
                            <div
                              className={`opacity-0 group-hover:opacity-100 transition-all duration-150 absolute top-0 ${tooltipPosClass} bg-slate-900 text-white text-[11px] py-1 px-2.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-30 flex items-center gap-1.5 border border-slate-700`}
                            >
                              <span className="text-slate-300">{day.dayLabel}:</span>
                              <span className="text-emerald-400 font-bold">{day.minutes} мин</span>
                            </div>

                            {/* Bar Value above bar */}
                            {day.minutes > 0 && (
                              <span className="text-[9px] sm:text-[10px] text-emerald-800 mb-0.5 group-hover:text-emerald-600 font-bold transition-colors block">
                                {day.minutes}
                              </span>
                            )}

                            {/* Bar column */}
                            <div
                              style={{ height: `${Math.max(heightPercent, 4)}%` }}
                              className={`w-full max-w-[16px] sm:max-w-[20px] rounded-t-sm transition-all duration-300 ${
                                isZero
                                  ? 'bg-slate-200 group-hover:bg-slate-300'
                                  : 'bg-emerald-500 group-hover:bg-emerald-600 shadow-sm'
                              }`}
                            ></div>

                            {/* Day Number at bottom - 2-digit format without ellipsis */}
                            <span className="text-[8.5px] sm:text-[9.5px] text-slate-500 font-medium mt-1.5 group-hover:text-slate-900 transition-colors whitespace-nowrap text-center">
                              {formattedDayNum}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
