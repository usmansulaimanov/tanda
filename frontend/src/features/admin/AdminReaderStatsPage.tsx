import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { readersApi } from '../../shared/api/readers.api';
import { ReaderDetailedStatsResponse } from '../../types';
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

const MONTHS_KZ_LIST = [
  { value: '01', label: 'Қаңтар' },
  { value: '02', label: 'Ақпан' },
  { value: '03', label: 'Наурыз' },
  { value: '04', label: 'Сәуір' },
  { value: '05', label: 'Мамыр' },
  { value: '06', label: 'Маусым' },
  { value: '07', label: 'Шілде' },
  { value: '08', label: 'Тамыз' },
  { value: '09', label: 'Қыркүйек' },
  { value: '10', label: 'Қазан' },
  { value: '11', label: 'Қараша' },
  { value: '12', label: 'Желтоқсан' },
];

const AVAILABLE_YEARS = ['2027', '2026', '2025', '2024'];

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

const formatDayShortLabel = (day: { date?: string; shortLabel?: string }) => {
  if (day.date && /^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
    const parts = day.date.split('-');
    return `${parts[2]}.${parts[1]}.`;
  }
  if (day.shortLabel) {
    return day.shortLabel.endsWith('.') ? day.shortLabel : `${day.shortLabel}.`;
  }
  return '';
};

export const AdminReaderStatsPage: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role, isAuthInitialized } = useAuthStore();
  const { showToast } = useToastStore();

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const qMonth = searchParams.get('month');
    if (qMonth && /^\d{4}-\d{2}$/.test(qMonth)) {
      return qMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [stats, setStats] = useState<ReaderDetailedStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedYear, selectedMonth] = useMemo(() => {
    const parts = selectedMonthKey.split('-');
    const y = parts[0] || String(new Date().getFullYear());
    const m = parts[1] || '01';
    return [y, m];
  }, [selectedMonthKey]);

  const loadStats = async (uId: string, monthKey: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await readersApi.getReaderDetailedStats(uId, monthKey);
      setStats(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e.response?.data?.message || e.message || 'Оқырман статистикасын жүктеу мүмкін болмады';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthInitialized) return;
    if (role !== 'admin') {
      showToast('Рұқсат шектелген', 'error');
      navigate('/', { replace: true });
      return;
    }
    if (!userId) {
      navigate('/admin/stats?tab=readers', { replace: true });
      return;
    }
    loadStats(userId, selectedMonthKey);
  }, [isAuthInitialized, role, userId, selectedMonthKey]);

  const handleMonthChange = (newMonthKey: string) => {
    setSelectedMonthKey(newMonthKey);
    setSearchParams({ month: newMonthKey }, { replace: true });
  };

  const todayTime = useMemo(() => formatListeningTime(stats?.todaySeconds), [stats?.todaySeconds]);
  const monthTime = useMemo(() => formatListeningTime(stats?.monthSeconds), [stats?.monthSeconds]);
  const allTime = useMemo(() => formatListeningTime(stats?.allTimeSeconds), [stats?.allTimeSeconds]);

  const maxDailySeconds = useMemo(() => {
    if (!stats?.dailyList || stats.dailyList.length === 0) return 1;
    const max = Math.max(...stats.dailyList.map((d) => d.seconds || 0));
    return max > 0 ? max : 1;
  }, [stats?.dailyList]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '24px 0 60px' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 20px' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#64748B' }}>
            <Link to="/admin" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>
              Басқару панелі
            </Link>
            <span>/</span>
            <Link to="/admin/stats?tab=readers" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>
              Статистика
            </Link>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 700 }}>Оқырман статистикасы</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/stats?tab=readers')}
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Артқа қайту
          </button>
        </div>

        {/* Loading state */}
        {isLoading && !stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Skeleton style={{ height: '120px', borderRadius: '20px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <Skeleton style={{ height: '110px', borderRadius: '16px' }} />
              <Skeleton style={{ height: '110px', borderRadius: '16px' }} />
              <Skeleton style={{ height: '110px', borderRadius: '16px' }} />
              <Skeleton style={{ height: '110px', borderRadius: '16px' }} />
            </div>
            <Skeleton style={{ height: '320px', borderRadius: '20px' }} />
          </div>
        )}

        {/* Reader Profile Header Card */}
        {stats && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.5px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
              }}
            >
              {/* Reader Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: stats.avatarUrl ? 'transparent' : '#6366F1',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '22px',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {stats.avatarUrl ? (
                    <img
                      src={stats.avatarUrl}
                      alt={stats.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    stats.name?.charAt(0)?.toUpperCase() || 'O'
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {stats.name}
                    </h1>
                    {stats.isPremium ? (
                      <span
                        style={{
                          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                          color: '#000',
                          fontWeight: 800,
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        PREMIUM
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#F1F5F9',
                          color: '#64748B',
                          fontWeight: 700,
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        Стандарт
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '6px',
                      fontSize: '12.5px',
                      color: '#64748B',
                      flexWrap: 'wrap',
                    }}
                  >
                    {stats.idNumber && (
                      <span
                        style={{
                          fontFamily: 'monospace',
                          background: '#F1F5F9',
                          color: '#0F172A',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontWeight: 700,
                        }}
                      >
                        ID: {stats.idNumber}
                      </span>
                    )}
                    <span>{stats.email}</span>
                    {stats.phone && <span>• {stats.phone}</span>}
                    {stats.birthDate && <span>• Туған күні: {stats.birthDate}</span>}
                  </div>
                </div>
              </div>

              {/* Month / Year Selectors */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={selectedYear}
                  onChange={(e) => handleMonthChange(`${e.target.value}-${selectedMonth}`)}
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: 'var(--text-dark)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(`${selectedYear}-${e.target.value}`)}
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
                  {MONTHS_KZ_LIST.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

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
              onClick={() => userId && loadStats(userId, selectedMonthKey)}
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
            {/* 4 KPI Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {/* 1. Today */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
                  Бүгін
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563EB' }}>
                  {todayTime.minutesFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  {todayTime.secondsFormatted}
                </div>
              </div>

              {/* 2. Month */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
                  Бұл айда ({formatMonthLabel(selectedMonthKey)})
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--blue)' }}>
                  {monthTime.minutesFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  {monthTime.hoursFormatted} • {monthTime.secondsFormatted}
                </div>
              </div>

              {/* 3. All-Time */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
                  Жалпы тыңдалымы
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
                  {allTime.hoursFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  {allTime.minutesFormatted} • {allTime.secondsFormatted}
                </div>
              </div>

              {/* 4. Active days & Average */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
                  Белсенділік
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669' }}>
                  {stats.totalListenedDays} күн
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  Орташа: {stats.averageDailyMinutes} мин/күн
                </div>
              </div>
            </div>

            {/* Daily Listening Chart */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                border: '1.5px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {formatMonthLabel(selectedMonthKey)}
                </h2>

                {stats.peakDay && stats.peakDay.seconds > 0 && (
                  <span
                    style={{
                      background: '#ECFDF5',
                      color: '#059669',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                    }}
                  >
                    🔥 Пик күн: {stats.peakDay.label} ({stats.peakDay.minutes} мин)
                  </span>
                )}
              </div>

              {/* Chart Bars with horizontal scroll wrapper */}
              <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                <div
                  style={{
                    minWidth: `${Math.max(stats.dailyList.length * 30, 720)}px`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${stats.dailyList.length}, minmax(0, 1fr))`,
                    gap: '6px',
                    alignItems: 'end',
                  }}
                >
                  {stats.dailyList.map((day, idx) => {
                    const heightPct = Math.max(0, Math.min(100, Math.round((day.seconds / maxDailySeconds) * 100)));
                    const isToday = day.isToday;
                    const isPeak = day.isPeak;

                    return (
                      <div
                        key={day.date || idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {/* Bar container */}
                        <div
                          style={{
                            width: '100%',
                            height: '110px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            title={`${day.date}: ${day.minutes} мин (${day.seconds} сек)`}
                            style={{
                              width: '100%',
                              height: `${heightPct}%`,
                              minHeight: day.seconds > 0 ? '4px' : '2px',
                              background: isPeak
                                ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)'
                                : isToday
                                ? 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)'
                                : day.seconds > 0
                                ? 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)'
                                : '#E2E8F0',
                              borderRadius: '6px 6px 2px 2px',
                              transition: 'height 0.3s ease',
                              cursor: 'pointer',
                            }}
                          />
                        </div>

                        {/* Date label */}
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: isToday || isPeak ? 800 : 600,
                            color: isToday ? '#2563EB' : isPeak ? '#059669' : '#94A3B8',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDayShortLabel(day)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Listened Books Section */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                border: '1.5px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Тыңдалған кітаптар
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                    Барлығы: <strong>{stats.books?.length || 0} кітап</strong>
                  </p>
                </div>
              </div>

              {/* Table */}
              {!stats.books || stats.books.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '14px', margin: 0 }}>Бұл оқырман әлі кітап тыңдамаған</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>№</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Кітап</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Бүгін</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Бұл айда</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Жалпы</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Әрекет</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.books.map((b, idx) => (
                        <tr
                          key={b.bookId}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '14px 16px', color: '#94A3B8', fontWeight: 700 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '40px',
                                  height: '56px',
                                  borderRadius: '8px',
                                  background: '#E2E8F0',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                }}
                              >
                                {b.coverImage ? (
                                  <img
                                    src={b.coverImage}
                                    alt={b.bookTitle}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '10px',
                                      color: '#94A3B8',
                                    }}
                                  >
                                    Кітап
                                  </div>
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>
                                  {b.bookTitle}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                  {b.bookAuthor}
                                  {b.category && <span style={{ color: '#94A3B8' }}> • {b.category}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#2563EB' }}>
                            {b.todayFormatted}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>
                            {b.monthFormatted}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>
                            {b.allTimeFormatted}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <Link
                              to={`/admin/books/${b.bookId}/readers/${userId}/stats`}
                              style={{
                                background: '#F8FAFC',
                                border: '1.5px solid #E2E8F0',
                                color: '#2563EB',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'inline-block',
                              }}
                            >
                              Толық статистикасы
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
