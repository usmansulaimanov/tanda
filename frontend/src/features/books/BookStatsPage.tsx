import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { booksApi } from '../../shared/api/books.api';
import { BookStatsResponse, BookAudienceMember } from '../../types';
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
    compositeFormatted: `${hrs} сағ • ${min.toLocaleString('ru-RU')} мин • ${sec.toLocaleString('ru-RU')} сек`,
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

export const BookStatsPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role, isAuthInitialized } = useAuthStore();
  const { showToast } = useToastStore();

  const isAuthor = Boolean(role === 'author' || user?.isAuthor || user?.role === 'author');
  const isAdmin = Boolean(user?.isSuperAdmin || (role === 'admin' && !user?.duty) || role === 'admin');

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const qMonth = searchParams.get('month');
    if (qMonth && /^\d{4}-\d{2}$/.test(qMonth)) {
      return qMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [stats, setStats] = useState<BookStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audience Drilldown Modal state (Admin only)
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [audienceTier, setAudienceTier] = useState<'LISTENERS' | 'READERS' | 'ACTIVES'>('LISTENERS');
  const [audienceScope, setAudienceScope] = useState<'MONTH' | 'ALL_TIME'>('MONTH');
  const [audienceMembers, setAudienceMembers] = useState<BookAudienceMember[]>([]);
  const [isAudienceLoading, setIsAudienceLoading] = useState(false);
  const [audienceSearch, setAudienceSearch] = useState('');

  const openAudienceModal = async (tier: 'LISTENERS' | 'READERS' | 'ACTIVES', scope: 'MONTH' | 'ALL_TIME' = 'MONTH') => {
    if (!isAdmin || !bookId) return;
    setAudienceTier(tier);
    setAudienceScope(scope);
    setAudienceSearch('');
    setAudienceModalOpen(true);
    setIsAudienceLoading(true);
    try {
      const data = await booksApi.getAudience(bookId, {
        tier,
        scope,
        month: selectedMonthKey,
      });
      setAudienceMembers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load audience:', err);
      showToast('Аудитория тізімін жүктеу сәтсіз аяқталды', 'error');
    } finally {
      setIsAudienceLoading(false);
    }
  };

  const handleAudienceScopeChange = async (newScope: 'MONTH' | 'ALL_TIME') => {
    if (!bookId) return;
    setAudienceScope(newScope);
    setIsAudienceLoading(true);
    try {
      const data = await booksApi.getAudience(bookId, {
        tier: audienceTier,
        scope: newScope,
        month: selectedMonthKey,
      });
      setAudienceMembers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load audience:', err);
    } finally {
      setIsAudienceLoading(false);
    }
  };

  const filteredAudienceMembers = useMemo(() => {
    if (!audienceSearch.trim()) return audienceMembers;
    const q = audienceSearch.toLowerCase().trim();
    return audienceMembers.filter((m) =>
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q) ||
      m.idNumber?.toLowerCase().includes(q) ||
      m.username?.toLowerCase().includes(q)
    );
  }, [audienceMembers, audienceSearch]);

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

  const loadStats = async (monthKey: string) => {
    if (!bookId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await booksApi.getStats(bookId, monthKey);
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load book stats:', err);
      const msg = err?.response?.data?.message || 'Кітап статистикасын жүктеу мүмкін болмады';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthInitialized && bookId) {
      loadStats(selectedMonthKey);
    }
  }, [isAuthInitialized, bookId, selectedMonthKey]);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonthKey(newMonth);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('month', newMonth);
      return next;
    });
  };

  // Back Navigation handler
  const handleBack = () => {
    const fromParam = searchParams.get('from');
    if (fromParam) {
      navigate(fromParam);
      return;
    }
    if (isAdmin && stats?.assignedAuthorId) {
      navigate(`/admin/authors/${stats.assignedAuthorId}`);
    } else if (isAuthor) {
      navigate('/author/books');
    } else if (isAdmin) {
      navigate('/admin/home');
    } else {
      navigate(-1);
    }
  };

  const todayTime = formatListeningTime(stats?.todaySeconds);
  const monthTime = formatListeningTime(stats?.monthSeconds);
  const allTime = formatListeningTime(stats?.allTimeSeconds);
  const peakTime = formatListeningTime(stats?.peakDay?.seconds);

  const maxSecInPeriod = useMemo(() => {
    if (!stats?.dailyList?.length) return 0;
    return Math.max(...stats.dailyList.map((d) => d.seconds), 0);
  }, [stats]);

  if (!isAuthInitialized) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <section className="book-stats-section" style={{ minHeight: '85vh', padding: '32px 16px', background: '#F8FAFC' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: '280px' }}>
              
              {/* Back Button */}
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
                Артқа қайту
              </button>

              {/* Book Info Block */}
              {stats && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '62px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#005494',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }}
                  >
                    {stats.coverImage && (
                      <img
                        src={stats.coverImage}
                        alt={stats.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                        {stats.title}
                      </h1>
                      {stats.category && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--blue)',
                            background: 'rgba(0, 84, 148, 0.08)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {stats.category}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '3px', fontWeight: 600 }}>
                      Авторы: <strong style={{ color: '#334155' }}>{stats.author || 'Белгісіз'}</strong>
                      {stats.pages ? ` • ${stats.pages} бет` : ''}
                      {stats.hasAudio ? ' • Аудио' : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Month Selector Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Айды таңдау:</span>
              <select
                value={selectedMonthKey}
                onChange={(e) => handleMonthChange(e.target.value)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '13.5px',
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
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Қате орын алды</div>
            <p style={{ fontSize: '14px', margin: '0 0 14px 0' }}>{errorMsg}</p>
            <button
              type="button"
              onClick={() => loadStats(selectedMonthKey)}
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

        {/* Loading state */}
        {isLoading && !stats && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1.45fr] gap-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        )}

        {/* Main Content */}
        {stats && (
          <>
            {/* 5 Metric Summary Cards */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1.45fr] gap-4 mb-6"
            >
              {/* 1. Today Listening */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Бүгін</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563EB' }}>
                  {todayTime.minutesFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  {todayTime.secondsFormatted}
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
                  {monthTime.minutesFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  {monthTime.hoursFormatted} • {monthTime.secondsFormatted}
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
                  {allTime.hoursFormatted}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  {allTime.minutesFormatted} • {allTime.secondsFormatted}
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

              {/* 5. Audience Engagement Tiers */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '16px 18px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569' }}>
                    Аудитория белсенділігі
                  </div>
                  {isAdmin && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--blue)', background: 'rgba(0, 84, 148, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                      Админ
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Listeners Tier */}
                  <div
                    onClick={() => isAdmin && openAudienceModal('LISTENERS', 'MONTH')}
                    style={{
                      cursor: isAdmin ? 'pointer' : 'default',
                      padding: '4px 6px',
                      margin: '0 -6px',
                      borderRadius: '8px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (isAdmin) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (isAdmin) e.currentTarget.style.background = 'transparent'; }}
                    title={isAdmin ? 'Тыңдармандар тізімін көру' : undefined}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A' }}>
                        Тыңдармандар:
                      </div>
                      {isAdmin && <span style={{ fontSize: '11px', color: '#94A3B8' }}>›</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '1px' }}>
                      Бұл айда:{' '}
                      <strong
                        onClick={(e) => {
                          if (isAdmin) {
                            e.stopPropagation();
                            openAudienceModal('LISTENERS', 'MONTH');
                          }
                        }}
                        style={{ color: '#2563EB', textDecoration: isAdmin ? 'underline' : 'none' }}
                      >
                        {(stats.monthListeners ?? stats.monthUniqueListeners).toLocaleString('ru-RU')} адам
                      </strong>{' '}
                      • Жалпы:{' '}
                      <strong
                        onClick={(e) => {
                          if (isAdmin) {
                            e.stopPropagation();
                            openAudienceModal('LISTENERS', 'ALL_TIME');
                          }
                        }}
                        style={{ color: '#0F172A', textDecoration: isAdmin ? 'underline' : 'none' }}
                      >
                        {(stats.allTimeListeners ?? stats.allTimeUniqueListeners).toLocaleString('ru-RU')} адам
                      </strong>
                    </div>
                  </div>

                  {/* Readers Tier */}
                  <div
                    onClick={() => isAdmin && openAudienceModal('READERS', 'MONTH')}
                    style={{
                      borderTop: '1px dashed #E2E8F0',
                      paddingTop: '5px',
                      cursor: isAdmin ? 'pointer' : 'default',
                      padding: '5px 6px 4px',
                      margin: '0 -6px',
                      borderRadius: '8px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (isAdmin) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (isAdmin) e.currentTarget.style.background = 'transparent'; }}
                    title={isAdmin ? 'Оқырмандар тізімін көру' : undefined}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A' }}>
                        Оқырмандар:
                      </div>
                      {isAdmin && <span style={{ fontSize: '11px', color: '#94A3B8' }}>›</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '1px' }}>
                      Бұл айда:{' '}
                      <strong
                        onClick={(e) => {
                          if (isAdmin) {
                            e.stopPropagation();
                            openAudienceModal('READERS', 'MONTH');
                          }
                        }}
                        style={{ color: '#059669', textDecoration: isAdmin ? 'underline' : 'none' }}
                      >
                        {(stats.monthReaders ?? 0).toLocaleString('ru-RU')} адам
                      </strong>{' '}
                      • Жалпы:{' '}
                      <strong
                        onClick={(e) => {
                          if (isAdmin) {
                            e.stopPropagation();
                            openAudienceModal('READERS', 'ALL_TIME');
                          }
                        }}
                        style={{ color: '#047857', textDecoration: isAdmin ? 'underline' : 'none' }}
                      >
                        {(stats.allTimeReaders ?? 0).toLocaleString('ru-RU')} адам
                      </strong>
                    </div>
                  </div>

                  {/* Actives Tier */}
                  <div
                    onClick={() => isAdmin && openAudienceModal('ACTIVES', 'MONTH')}
                    style={{
                      borderTop: '1px dashed #E2E8F0',
                      paddingTop: '5px',
                      cursor: isAdmin ? 'pointer' : 'default',
                      padding: '5px 6px 4px',
                      margin: '0 -6px',
                      borderRadius: '8px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (isAdmin) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (isAdmin) e.currentTarget.style.background = 'transparent'; }}
                    title={isAdmin ? 'Белсенділер тізімін көру' : undefined}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A' }}>
                        Белсенділер:
                      </div>
                      {isAdmin && <span style={{ fontSize: '11px', color: '#94A3B8' }}>›</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '1px' }}>
                      Бұл айда:{' '}
                      <strong
                        onClick={(e) => {
                          if (isAdmin) {
                            e.stopPropagation();
                            openAudienceModal('ACTIVES', 'MONTH');
                          }
                        }}
                        style={{ color: '#D97706', textDecoration: isAdmin ? 'underline' : 'none' }}
                      >
                        {(stats.monthActives ?? 0).toLocaleString('ru-RU')} адам
                      </strong>{' '}
                      • Жалпы:{' '}
                      <strong
                        onClick={(e) => {
                          if (isAdmin) {
                            e.stopPropagation();
                            openAudienceModal('ACTIVES', 'ALL_TIME');
                          }
                        }}
                        style={{ color: '#B45309', textDecoration: isAdmin ? 'underline' : 'none' }}
                      >
                        {(stats.allTimeActives ?? 0).toLocaleString('ru-RU')} адам
                      </strong>
                    </div>
                  </div>
                </div>
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
                    {formatMonthLabel(selectedMonthKey)} — күнделікті тыңдалым бағандары:
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

      {/* Admin Audience Drilldown Modal */}
      {isAdmin && audienceModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setAudienceModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1.5px solid #E2E8F0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px 16px',
                borderBottom: '1.5px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FFFFFF',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                    {audienceTier === 'LISTENERS'
                      ? 'Тыңдармандар тізімі'
                      : audienceTier === 'READERS'
                      ? 'Оқырмандар тізімі'
                      : 'Белсенділер тізімі'}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background:
                        audienceTier === 'LISTENERS'
                          ? '#EFF6FF'
                          : audienceTier === 'READERS'
                          ? '#ECFDF5'
                          : '#FFFBEB',
                      color:
                        audienceTier === 'LISTENERS'
                          ? '#2563EB'
                          : audienceTier === 'READERS'
                          ? '#059669'
                          : '#D97706',
                    }}
                  >
                    {filteredAudienceMembers.length} адам
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
                  {stats?.title} • {audienceScope === 'MONTH' ? formatMonthLabel(selectedMonthKey) : 'Барлық уақытта'}
                </p>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setAudienceModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#F1F5F9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E2E8F0';
                  e.currentTarget.style.color = '#0F172A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.color = '#64748B';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Scope Switcher & Search Bar */}
            <div style={{ padding: '14px 24px', background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Scope Switcher pills */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleAudienceScopeChange('MONTH')}
                  style={{
                    flex: 1,
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: '1.5px solid',
                    borderColor: audienceScope === 'MONTH' ? 'var(--blue)' : '#E2E8F0',
                    background: audienceScope === 'MONTH' ? 'rgba(0, 84, 148, 0.08)' : '#FFFFFF',
                    color: audienceScope === 'MONTH' ? 'var(--blue)' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Бұл айда ({formatMonthLabel(selectedMonthKey)})
                </button>
                <button
                  type="button"
                  onClick={() => handleAudienceScopeChange('ALL_TIME')}
                  style={{
                    flex: 1,
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: '1.5px solid',
                    borderColor: audienceScope === 'ALL_TIME' ? 'var(--blue)' : '#E2E8F0',
                    background: audienceScope === 'ALL_TIME' ? 'rgba(0, 84, 148, 0.08)' : '#FFFFFF',
                    color: audienceScope === 'ALL_TIME' ? 'var(--blue)' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Жалпы (барлық уақытта)
                </button>
              </div>

              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Аты-жөні, поштасы немесе ID бойынша іздеу..."
                  value={audienceSearch}
                  onChange={(e) => setAudienceSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '12.5px',
                    outline: 'none',
                    background: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2.5"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                {audienceSearch && (
                  <button
                    type="button"
                    onClick={() => setAudienceSearch('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body - User List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }} className="custom-scrollbar">
              {isAudienceLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
              ) : filteredAudienceMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                    {audienceSearch ? 'Іздеу бойынша ешкім табылмады' : 'Бұл санатта әзірге оқырман жоқ'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                    {audienceTier === 'LISTENERS'
                      ? 'Кемінде 1 минут тыңдаған қолданушылар'
                      : audienceTier === 'READERS'
                      ? 'Кемінде 15 минут тыңдаған қолданушылар'
                      : 'Кемінде 1 сағат тыңдаған белсенді оқырмандар'}
                  </div>
                </div>
              ) : (
                filteredAudienceMembers.map((member, idx) => (
                  <div
                    key={member.userId || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: '1.5px solid #F1F5F9',
                      background: '#FFFFFF',
                      transition: 'all 0.15s ease',
                      gap: '12px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#F1F5F9';
                      e.currentTarget.style.background = '#FFFFFF';
                    }}
                  >
                    {/* User info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          background: '#E2E8F0',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          color: '#475569',
                          fontSize: '14px',
                        }}
                      >
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          member.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.name}
                          </span>
                          {member.idNumber && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                              ID: {member.idNumber}
                            </span>
                          )}
                          {member.username && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--blue)' }}>
                              @{member.username}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{member.email}</span>
                          {member.phone && <span>• {member.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Duration badge */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 900,
                          color:
                            audienceTier === 'LISTENERS'
                              ? '#2563EB'
                              : audienceTier === 'READERS'
                              ? '#059669'
                              : '#D97706',
                          background:
                            audienceTier === 'LISTENERS'
                              ? '#EFF6FF'
                              : audienceTier === 'READERS'
                              ? '#ECFDF5'
                              : '#FFFBEB',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {member.formattedDuration}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1.5px solid #F1F5F9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC',
              }}
            >
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                Барлығы: <strong style={{ color: '#0F172A' }}>{filteredAudienceMembers.length} адам</strong>
              </div>
              <button
                type="button"
                onClick={() => setAudienceModalOpen(false)}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Жабу
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
