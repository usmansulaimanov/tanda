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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredEntries = (leaderboardData?.topEntries || []).filter((entry) =>
    entry.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const isPastPeriod = selectedPeriod === 'LAST_WEEK' || selectedPeriod === 'LAST_MONTH';

  // Max minutes for chart scaling
  const maxChartMinutes = Math.max(
    ...(personalStats?.dailyActivity?.map((d) => d.minutes) || [60]),
    30
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Title & Description */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <span>🏆</span>
            <span>Оқырмандар жарысы және статистика</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Рейтинг және Белсенділік
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Қазақша аудиокітаптарды ең көп тыңдаған оқырмандар рейтингі. Әр апта мен айдың соңында үздік 10 оқырманға арнайы сертификат табысталады!
          </p>
        </div>

        {/* Main Tabs Navigation */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-lg backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setActiveMainTab('leaderboard')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeMainTab === 'leaderboard'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <span>🏆</span>
              <span>Топ 100 оқырман</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('personal')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeMainTab === 'personal'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <span>📊</span>
              <span>Менің статистикам</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LEADERBOARD */}
        {activeMainTab === 'leaderboard' && (
          <div className="space-y-6">
            
            {/* Period Selector Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('THIS_WEEK')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    selectedPeriod === 'THIS_WEEK'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🟢 Осы апта
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('LAST_WEEK')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    selectedPeriod === 'LAST_WEEK'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🏆 Өткен апта (Жеңімпаздар)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('THIS_MONTH')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    selectedPeriod === 'THIS_MONTH'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🟢 Осы ай
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('LAST_MONTH')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    selectedPeriod === 'LAST_MONTH'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🏆 Өткен ай (Жеңімпаздар)
                </button>
              </div>

              {/* Period Label */}
              <div className="text-xs sm:text-sm text-slate-400 font-medium">
                {leaderboardData?.periodLabel || ''}
              </div>
            </div>

            {/* Past Winners Celebration Banner */}
            {isPastPeriod && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-700/10 border border-amber-500/30 flex items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl flex-shrink-0">
                  🎖️
                </div>
                <div className="space-y-1">
                  <h3 className="text-amber-300 font-bold text-base sm:text-lg">
                    {leaderboardData?.periodLabel} — Ресми сертификат иегерлері
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm">
                    Төмендегі үздік 10 оқырманға Tanda платформасының құрмет грамотасы мен сертификаты табысталады!
                  </p>
                </div>
              </div>
            )}

            {/* Ongoing Race Notification */}
            {!isPastPeriod && (
              <div className="p-3 sm:p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-4 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span>
                    Жарыс тікелей эфирде (Real-time) жаңарып отырады. Жексенбі 23:59-да есеп жабылады.
                  </span>
                </div>
                <div className="text-emerald-400 font-semibold hidden md:block">
                  Топ-10 ➡️ Сертификат
                </div>
              </div>
            )}

            {/* Current User Result Card (Pinned at top) */}
            {isAuthenticated && leaderboardData?.currentUserEntry && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-800 to-slate-800 border-2 border-emerald-500/40 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-extrabold text-emerald-300 text-lg">
                      #{leaderboardData.currentUserEntry.rank}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-base sm:text-lg">
                          {leaderboardData.currentUserEntry.fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Сіз
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-400">
                        {leaderboardData.currentUserEntry.rank <= 10 ? (
                          <span className="text-amber-400 font-medium">🔥 Сіз Топ-10 сертификат аймағындасыз!</span>
                        ) : leaderboardData.currentUserEntry.rank <= 100 ? (
                          <span className="text-emerald-400 font-medium">✨ Сіз Топ-100 үздік оқырмандар тізіміндесіз!</span>
                        ) : (
                          <span>Көбірек тыңдап, Топ-100-ге көтеріліңіз!</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Осы мерзімде</div>
                      <div className="text-lg sm:text-xl font-extrabold text-emerald-400">
                        {formatMinutes(leaderboardData.currentUserEntry.periodMinutes)}
                      </div>
                    </div>
                    <div className="text-right border-l border-slate-700 pl-6 hidden sm:block">
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Барлық уақытта</div>
                      <div className="text-base sm:text-lg font-bold text-slate-200">
                        {formatMinutes(leaderboardData.currentUserEntry.allTimeMinutes)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Input in Table */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Оқырман аты бойынша іздеу..."
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
                Барлығы: <span className="text-emerald-400 font-semibold">{leaderboardData?.totalParticipants || 0}</span> оқырман
              </div>
            </div>

            {/* Top 100 List / Table */}
            <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden">
              {isLeaderboardLoading ? (
                <div className="py-20 text-center space-y-3">
                  <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-sm">Рейтинг есептелуде...</p>
                </div>
              ) : isLeaderboardError ? (
                <div className="py-16 text-center space-y-4">
                  <p className="text-rose-400 font-medium">Деректерді жүктеу кезінде қате орын алды.</p>
                  <button
                    type="button"
                    onClick={() => refetchLeaderboard()}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-white transition-colors"
                  >
                    Қайта көру
                  </button>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="text-3xl">🎧</div>
                  <p className="text-slate-300 font-medium">Бұл мерзімде әзірге тыңдалған аудио жазбалар жоқ.</p>
                  <p className="text-xs text-slate-500">Кітап тыңдап, көшбасшылық қатарға бірінші болып шығыңыз!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/70 bg-slate-800/60 text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4 sm:px-6 w-16 text-center">Орын</th>
                        <th className="py-3.5 px-4">Оқырман</th>
                        <th className="py-3.5 px-4 text-right">Таңдалған мерзім</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right hidden sm:table-cell">Барлық уақытта</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
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
                                ? 'bg-emerald-900/30 hover:bg-emerald-900/40 font-semibold'
                                : 'hover:bg-slate-700/30'
                            }`}
                          >
                            {/* Rank Column */}
                            <td className="py-3.5 px-4 sm:px-6 text-center">
                              {isTop1 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 text-lg font-bold border border-amber-500/40">
                                  🥇
                                </span>
                              ) : isTop2 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 text-slate-200 text-lg font-bold border border-slate-300/40">
                                  🥈
                                </span>
                              ) : isTop3 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 text-lg font-bold border border-amber-700/40">
                                  🥉
                                </span>
                              ) : isTop10 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                  {entry.rank}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium text-xs sm:text-sm">
                                  #{entry.rank}
                                </span>
                              )}
                            </td>

                            {/* User Info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 overflow-hidden flex-shrink-0">
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
                                    <span className={`truncate text-sm sm:text-base ${isMe ? 'text-emerald-300 font-bold' : 'text-slate-100 font-medium'}`}>
                                      {entry.fullName}
                                    </span>
                                    {isMe && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                        Сіз
                                      </span>
                                    )}
                                    {isTop10 && (
                                      <span className="hidden md:inline-flex items-center text-[11px] text-amber-400 font-medium">
                                        🎖️ Топ 10
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Period Minutes */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="font-bold text-emerald-400 text-sm sm:text-base">
                                {formatMinutes(entry.periodMinutes)}
                              </div>
                            </td>

                            {/* All-time Minutes */}
                            <td className="py-3.5 px-4 sm:px-6 text-right hidden sm:table-cell">
                              <div className="text-slate-300 text-sm">
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
              <div className="bg-slate-800/90 rounded-3xl p-8 sm:p-12 border border-slate-700/80 text-center max-w-xl mx-auto space-y-6 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto">
                  🎧
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white">
                    Жеке статистикаңызды көру үшін жүйеге кіріңіз
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Күнделікті қанша минут тыңдағаныңызды, апталық және айлық тыңдау динамикаңыз бен графигіңізді бақылаңыз.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition-all text-sm"
                  >
                    Жүйеге кіру
                  </Link>
                  <Link
                    to="/signup"
                    className="w-full sm:w-auto px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition-all text-sm"
                  >
                    Тіркелу
                  </Link>
                </div>
              </div>
            ) : isPersonalLoading ? (
              <div className="py-20 text-center space-y-3">
                <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-sm">Жеке статистика жүктелуде...</p>
              </div>
            ) : isPersonalError || !personalStats ? (
              <div className="py-16 text-center space-y-4">
                <p className="text-rose-400 font-medium">Статистиканы алу мүмкін болмады.</p>
                <button
                  type="button"
                  onClick={() => refetchPersonal()}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-white"
                >
                  Қайта көру
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* 4 Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-700/80 shadow-lg">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Бүгін</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
                      {formatMinutes(personalStats.todayMinutes)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Бүгінгі тыңдалым</div>
                  </div>

                  <div className="bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-700/80 shadow-lg">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Соңғы 7 күн</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
                      {formatMinutes(personalStats.last7DaysMinutes)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Осы апталық белсенділік</div>
                  </div>

                  <div className="bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-700/80 shadow-lg">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Осы айда</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
                      {formatMinutes(personalStats.thisMonthMinutes)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Айлық жинақталған уақыт</div>
                  </div>

                  <div className="bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-700/80 shadow-lg">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Барлық уақытта</div>
                    <div className="text-xl sm:text-2xl font-black text-white mt-2">
                      {formatMinutes(personalStats.allTimeMinutes)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Тіркелгеннен бері</div>
                  </div>
                </div>

                {/* 14-Day Activity Bar Chart */}
                <div className="bg-slate-800/90 rounded-2xl p-5 sm:p-6 border border-slate-700/80 shadow-xl space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Тыңдау белсенділігі (Соңғы 14 күн)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Әр күн бойынша тыңдалған аудио минуттарының динамикасы
                      </p>
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                      Жалпы: {formatMinutes(personalStats.dailyActivity.reduce((acc, curr) => acc + curr.minutes, 0))}
                    </div>
                  </div>

                  {/* SVG/CSS Interactive Bar Graph */}
                  <div className="h-64 sm:h-72 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 pb-2 px-1 sm:px-2 border-b border-slate-700">
                    {personalStats.dailyActivity.map((day) => {
                      const heightPercent = maxChartMinutes > 0 ? (day.minutes / maxChartMinutes) * 100 : 0;
                      const isZero = day.minutes === 0;

                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative"
                        >
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-950 text-white text-[10px] sm:text-xs py-1 px-2 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-20 border border-slate-700">
                            {day.dayLabel}: <span className="text-emerald-400 font-bold">{day.minutes} мин</span>
                          </div>

                          {/* Bar Value above bar */}
                          {day.minutes > 0 && (
                            <span className="text-[10px] text-slate-400 mb-1 group-hover:text-emerald-400 font-semibold transition-colors hidden sm:block">
                              {day.minutes}
                            </span>
                          )}

                          {/* Bar column */}
                          <div
                            style={{ height: `${Math.max(heightPercent, 3)}%` }}
                            className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                              isZero
                                ? 'bg-slate-700/40 group-hover:bg-slate-700'
                                : 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 shadow-md shadow-emerald-950/40'
                            }`}
                          ></div>

                          {/* Day Label at bottom */}
                          <span className="text-[10px] sm:text-xs text-slate-400 mt-2 group-hover:text-slate-200 transition-colors truncate max-w-full text-center">
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
