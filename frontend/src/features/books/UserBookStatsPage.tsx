import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { booksApi } from '../../shared/api/books.api';
import { UserBookListeningStatsResponse } from '../../types';
import { Skeleton } from '../../shared/ui';

export const formatListeningTime = (totalSecInput: number | undefined | null) => {
  const sec = Math.max(0, Math.round(totalSecInput || 0));
  const min = Math.floor(sec / 60);
  const hrs = Number((sec / 3600).toFixed(1));

  return {
    seconds: sec,
    minutes: min,
    hours: hrs,
    secondsFormatted: `${sec.toLocaleString('ru-RU')} сек`,
    minutesFormatted: `${min.toLocaleString('ru-RU')} мин`,
    hoursFormatted: `${hrs} сағ`,
  };
};

const MONTH_NAMES_KZ: Record<string, string> = {
  '01': 'Қаңтар',
  '02': 'Ақпан',
  '03': 'Наурыз',
  '04': 'Сәуір',
  '05': 'Мамыр',
  '06': 'Маусым',
  '07': 'Шілде',
  '08': 'Тамыз',
  '09': 'Қыркүйек',
  '10': 'Қазан',
  '11': 'Қараша',
  '12': 'Желтоқсан',
};

const formatMonthLabel = (monthKey: string) => {
  const parts = monthKey.split('-');
  if (parts.length === 2) {
    const name = MONTH_NAMES_KZ[parts[1]] || parts[1];
    return `${name} ${parts[0]}`;
  }
  return monthKey;
};

export const UserBookStatsPage: React.FC = () => {
  const { bookId, userId } = useParams<{ bookId: string; userId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role, isAuthInitialized } = useAuthStore();
  const { showToast } = useToastStore();

  const isAdmin = Boolean(user?.isSuperAdmin || (role === 'admin' && !user?.duty) || role === 'admin');

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const qMonth = searchParams.get('month');
    if (qMonth && /^\d{4}-\d{2}$/.test(qMonth)) {
      return qMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [stats, setStats] = useState<UserBookListeningStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Month list for selector (last 12 months)
  const availableMonths = useMemo(() => {
    const list: Array<{ key: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push({ key, label: formatMonthLabel(key) });
    }
    return list;
  }, []);

  const loadStats = async (bId: string, uId: string, monthKey: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await booksApi.getUserBookStats(bId, uId, monthKey);
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load user book stats:', err);
      const msg = err?.response?.data?.message || 'Оқырманның кітап статистикасын жүктеу мүмкін болмады';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthInitialized) {
      if (!isAdmin) {
        navigate('/');
        return;
      }
      if (bookId && userId) {
        loadStats(bookId, userId, selectedMonthKey);
      }
    }
  }, [isAuthInitialized, isAdmin, bookId, userId, selectedMonthKey]);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonthKey(newMonth);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('month', newMonth);
      return next;
    });
  };

  const handleBack = () => {
    const fromScope = searchParams.get('scope') || 'MONTH';
    const fromTier = searchParams.get('tier') || 'LISTENERS';
    navigate(`/admin/books/${bookId}/audience?month=${selectedMonthKey}&scope=${fromScope}&tier=${fromTier}`);
  };

  const todayBookTime = formatListeningTime(stats?.todayBookSeconds);
  const todayTotalTime = formatListeningTime(stats?.userTodayTotalSeconds);
  const monthBookTime = formatListeningTime(stats?.monthBookSeconds);
  const allTimeBookTime = formatListeningTime(stats?.allTimeBookSeconds);
  const peakTime = formatListeningTime(stats?.peakDay?.seconds);

  const maxSecInPeriod = useMemo(() => {
    if (!stats?.dailyList?.length) return 0;
    return Math.max(...stats.dailyList.map((d) => d.seconds));
  }, [stats?.dailyList]);

  if (!isAuthInitialized || (isLoading && !stats)) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        <Skeleton className="h-28 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <section style={{ minHeight: '85vh', padding: '32px 16px', background: '#F8FAFC' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Top Header Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1.5px solid #E2E8F0',
            padding: '24px 28px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: '320px' }}>
              
              {/* Back button */}
              <button
                type="button"
                onClick={handleBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#F1F5F9',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E2E8F0';
                  e.currentTarget.style.color = '#0F172A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Тізімге қайту
              </button>

              {/* Reader + Book Info Block */}
              {stats && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {/* Reader Avatar */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: '#F1F5F9',
                      border: '2px solid #E2E8F0',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      color: '#475569',
                      fontSize: '16px',
                    }}
                  >
                    {stats.userAvatarUrl ? (
                      <img src={stats.userAvatarUrl} alt={stats.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      stats.userName?.charAt(0)?.toUpperCase() || 'U'
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: '19px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                        {stats.userName}
                      </h1>
                      {stats.userIdNumber && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                          ID: {stats.userIdNumber}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--blue)',
                          background: 'rgba(0, 84, 148, 0.08)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        «{stats.bookTitle}» кітабын тыңдау статистикасы
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', fontWeight: 600 }}>
                      Пошта: <strong style={{ color: '#0F172A' }}>{stats.userEmail}</strong>
                      {stats.userPhone && <> • Тел: <strong style={{ color: '#0F172A' }}>{stats.userPhone}</strong></>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Month selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Ай:</span>
              <select
                value={selectedMonthKey}
                onChange={(e) => handleMonthChange(e.target.value)}
                style={{
                  background: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--text-dark)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error state */}
        {errorMsg && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              borderRadius: '18px',
              padding: '24px',
              textAlign: 'center',
              color: '#991B1B',
              marginBottom: '24px',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Қате орын алды</div>
            <p style={{ fontSize: '13.5px', margin: '0 0 14px 0' }}>{errorMsg}</p>
            <button
              type="button"
              onClick={() => bookId && userId && loadStats(bookId, userId, selectedMonthKey)}
              style={{
                background: '#DC2626',
                color: '#FFF',
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Қайта көру
            </button>
          </div>
        )}

        {/* Main Content */}
        {stats && (
          <>
            {/* 4 Metric Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {/* 1. Today Listening */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Бүгін</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563EB' }}>
                  {todayBookTime.minutesFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  Осы кітаптан: <strong>{todayBookTime.secondsFormatted}</strong>
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#94A3B8', marginTop: '3px' }}>
                  Бүгін сайтта жалпы: <strong style={{ color: '#475569' }}>{todayTotalTime.minutesFormatted}</strong>
                </div>
              </div>

              {/* 2. Month Listening */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Бұл айда</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--blue)' }}>
                  {monthBookTime.minutesFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  {monthBookTime.hoursFormatted} • {monthBookTime.secondsFormatted}
                </div>
              </div>

              {/* 3. All-Time Listening */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Жалпы</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
                  {allTimeBookTime.hoursFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  {allTimeBookTime.minutesFormatted} • {allTimeBookTime.secondsFormatted}
                </div>
              </div>

              {/* 4. Peak Day */}
              <div
                style={{
                  background: stats.peakDay ? '#FFF7ED' : '#FFFFFF',
                  borderRadius: '20px',
                  border: stats.peakDay ? '1.5px solid #FED7AA' : '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: stats.peakDay ? '#C2410C' : '#64748B' }}>
                    Ең көп тыңдалған күн (Пик)
                  </span>
                </div>
                {stats.peakDay ? (
                  <>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#EA580C' }}>
                      {peakTime.minutesFormatted}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#9A3412', marginTop: '4px' }}>
                      {stats.peakDay.label}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#94A3B8', marginTop: '8px' }}>
                    Әзірге дерек жоқ
                  </div>
                )}
              </div>
            </div>

            {/* Daily Listening Graph */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                border: '1.5px solid #E2E8F0',
                padding: '28px 32px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                    {formatMonthLabel(selectedMonthKey)} — {stats.userName} күнделікті тыңдалымы:
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
                    Белсенді күндер: <strong style={{ color: 'var(--text-dark)' }}>{stats.totalListenedDays} күн</strong> • Орташа күнделікті уақыт:{' '}
                    <strong style={{ color: 'var(--text-dark)' }}>{stats.averageDailyMinutes} мин</strong>
                  </p>
                </div>
              </div>

              {/* Chart Bars */}
              <div style={{ overflowX: 'auto', paddingBottom: '8px' }} className="custom-scrollbar">
                <div
                  style={{
                    minWidth: '680px',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${stats.dailyList.length}, 1fr)`,
                    gap: '5px',
                    alignItems: 'flex-end',
                    height: '160px',
                    background: '#F8FAFC',
                    padding: '28px 14px 10px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {stats.dailyList.map((day) => {
                    const heightPercent = maxSecInPeriod > 0
                      ? Math.max(6, Math.round((day.seconds / maxSecInPeriod) * 75))
                      : 6;
                    const dayTime = formatListeningTime(day.seconds);

                    return (
                      <div
                        key={day.date}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end',
                          position: 'relative',
                        }}
                        title={`${day.label}: ${dayTime.hoursFormatted} | ${dayTime.minutesFormatted} | ${dayTime.secondsFormatted}`}
                      >
                        {/* Bar */}
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '28px',
                            height: `${heightPercent}%`,
                            borderRadius: '6px 6px 3px 3px',
                            background: day.isPeak
                              ? 'linear-gradient(180deg, #EF4444 0%, #EA580C 100%)'
                              : day.seconds > 0
                              ? 'linear-gradient(180deg, #3B82F6 0%, #005494 100%)'
                              : '#E2E8F0',
                            boxShadow: day.isPeak ? '0 4px 12px rgba(239, 68, 68, 0.4)' : 'none',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                        >
                          {day.isPeak && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '10px',
                                fontWeight: 900,
                                color: '#EA580C',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Пик
                            </span>
                          )}
                        </div>

                        {/* Date label */}
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: day.isToday || day.isPeak ? 800 : 600,
                            color: day.isToday ? 'var(--blue)' : day.isPeak ? '#EA580C' : '#64748B',
                            marginTop: '6px',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {day.shortLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
