import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { useRoyaltyStore } from '../../store/useRoyaltyStore';
import { User } from '../../types';

interface PeakDayInfo {
  date: string;
  label: string;
  seconds: number;
  minutes: number;
}

const formatNumberWithSpaces = (val: number | string): string => {
  if (val === '' || val === null || val === undefined) return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ru-RU');
};

const parseFormattedNumber = (val: string): number => {
  const digits = val.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

const formatDisplayId = (raw?: string): string => {
  if (!raw) return '';
  const clean = raw.trim().replace(/\s+/g, '');
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }
  if (/^\d+$/.test(clean) && clean.length < 8) {
    const padded = clean.padStart(8, '0');
    return `${padded.slice(0, 4)} ${padded.slice(4)}`;
  }
  return raw.trim();
};

export const AuthorStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { authorId: routeAuthorId } = useParams<{ authorId?: string }>();
  const [searchParams] = useSearchParams();
  const queryAuthorId = routeAuthorId || searchParams.get('authorId');

  const { user: currentUser, isAuthenticated, getAllAuthors } = useAuthStore();
  const { books } = useBookStore();
  const { showToast } = useToastStore();
  const { getAuthorStats, requestPayout, listeningStats } = useRoyaltyStore();

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('Kaspi Gold');
  const [payoutAccount, setPayoutAccount] = useState('');

  // Selected month for chart (YYYY-MM), defaults to current month
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // All authors list for Admin dropdown
  const allAuthors = useMemo(() => getAllAuthors(), [getAllAuthors]);

  // If not authenticated, redirect
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      showToast('Бұл бетті көру үшін жүйеге кіріңіз', 'error');
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate, showToast]);

  const isAdmin = currentUser?.role === 'admin' || Boolean(currentUser?.isSuperAdmin);

  // Target author to display
  const targetAuthor: User | null = useMemo(() => {
    if (!currentUser) return null;
    if (queryAuthorId) {
      const found = allAuthors.find((a) => a.id === queryAuthorId);
      if (found) return found;
    }
    if (currentUser.role === 'author') {
      return currentUser;
    }
    if (isAdmin) {
      if (queryAuthorId) {
        return allAuthors.find((a) => a.id === queryAuthorId) || allAuthors[0] || null;
      }
      return allAuthors[0] || null;
    }
    return currentUser;
  }, [queryAuthorId, allAuthors, currentUser, isAdmin]);

  // Determine author name to match
  const authorName = useMemo(() => {
    if (!targetAuthor) return '';
    return targetAuthor.assignedAuthorName?.trim() || targetAuthor.name.trim();
  }, [targetAuthor]);

  // Filter books belonging to this author
  const authorBooks = useMemo(() => {
    if (!targetAuthor) return [];
    if (!authorName && (!targetAuthor.assignedBookIds || targetAuthor.assignedBookIds.length === 0)) {
      return [];
    }

    const lowAuthor = authorName.toLowerCase();
    const assignedIds = new Set(targetAuthor.assignedBookIds || []);

    return books.filter((b) => {
      if (assignedIds.has(b.id)) return true;
      if (!b.author) return false;
      const bAuthor = b.author.toLowerCase().trim();
      return bAuthor === lowAuthor || bAuthor.includes(lowAuthor) || lowAuthor.includes(bAuthor);
    });
  }, [books, authorName, targetAuthor]);

  // Aggregated metrics
  const stats = useMemo(() => {
    const totalBooks = authorBooks.length;
    const audioBooks = authorBooks.filter((b) => b.hasAudio || b.audioUrl).length;
    const totalPages = authorBooks.reduce((acc, b) => acc + (b.pages || 0), 0);

    let totalReads = 0;
    let totalViews = 0;
    let totalListens = 0;
    let totalShelfSaves = 0;

    authorBooks.forEach((b) => {
      const views = b.viewsCount || 0;
      const reads = b.readsCount || 0;
      const trackedMin = listeningStats[b.id]?.totalMinutes || 0;
      const saves = b.savedCount || 0;

      totalViews += views;
      totalReads += reads;
      totalListens += trackedMin;
      totalShelfSaves += saves;
    });

    return {
      totalBooks,
      audioBooks,
      totalPages,
      totalViews,
      totalReads,
      totalListens,
      totalShelfSaves,
    };
  }, [authorBooks, listeningStats]);

  // Royalty and listening earnings
  const royalty = useMemo(() => {
    if (!targetAuthor) {
      return { totalMinutes: 0, totalSeconds: 0, estimatedEarned: 0, ratePerMinute: 0, currentBalance: 0, periodStatus: 'estimated' as const };
    }
    return getAuthorStats(targetAuthor, books);
  }, [targetAuthor, books, getAuthorStats]);

  // Kazakh month names
  const KZ_MONTHS: Record<number, string> = {
    1: 'Қаңтар', 2: 'Ақпан', 3: 'Наурыз', 4: 'Сәуір',
    5: 'Мамыр', 6: 'Маусым', 7: 'Шілде', 8: 'Тамыз',
    9: 'Қыркүйек', 10: 'Қазан', 11: 'Қараша', 12: 'Желтоқсан',
  };
  const formatMonthLabel = (key: string) => {
    const [y, m] = key.split('-');
    return `${KZ_MONTHS[Number(m)]} ${y}`;
  };
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const shiftMonth = (key: string, delta: number): string => {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Monthly Analytics: compute stats for selectedMonthKey (all days of that month)
  const dailyAnalytics = useMemo(() => {
    if (!targetAuthor) {
      return {
        dailyList: [],
        peakDay: null as PeakDayInfo | null,
        peakMinutes: 0,
        peakSeconds: 0,
        totalListenedDays: 0,
        averageMinutes: 0,
        totalSeconds: 0,
        lastListenedAt: null as string | null,
        maxSecInPeriod: 60,
      };
    }

    const [selYear, selMonth] = selectedMonthKey.split('-').map(Number);

    // Build full dateMap from all history
    const fullDateMap: Record<string, number> = {};
    let latestTimestamp: string | null = null;

    authorBooks.forEach((b) => {
      const stat = listeningStats[b.id];
      if (stat) {
        if (stat.lastListenedAt) {
          if (!latestTimestamp || new Date(stat.lastListenedAt) > new Date(latestTimestamp)) {
            latestTimestamp = stat.lastListenedAt;
          }
        }
        if (stat.dailySeconds) {
          Object.entries(stat.dailySeconds).forEach(([d, s]) => {
            fullDateMap[d] = (fullDateMap[d] || 0) + s;
          });
        }
      }
    });

    const _now = new Date();
    const todayIso = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    const daysInMonth = new Date(selYear, selMonth, 0).getDate();

    const days: {
      date: string;
      label: string;
      shortLabel: string;
      seconds: number;
      minutes: number;
      isToday: boolean;
      isPeak: boolean;
    }[] = [];

    let maxSecInPeriod = 0;
    let monthTotalSec = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayNum = String(day).padStart(2, '0');
      const monthNum = String(selMonth).padStart(2, '0');
      const iso = `${selYear}-${monthNum}-${dayNum}`;
      const sec = Math.round(fullDateMap[iso] || 0);
      if (sec > maxSecInPeriod) maxSecInPeriod = sec;
      monthTotalSec += sec;

      days.push({
        date: iso,
        label: `${dayNum}.${monthNum}`,
        shortLabel: `${dayNum}.${monthNum}`,
        seconds: sec,
        minutes: Number((sec / 60).toFixed(1)),
        isToday: iso === todayIso,
        isPeak: false,
      });
    }

    // Find peak day within the selected month
    let peakDay: PeakDayInfo | null = null;
    let maxSec = 0;
    Object.entries(fullDateMap).forEach(([dStr, sec]) => {
      if (dStr.startsWith(selectedMonthKey) && sec > maxSec && sec > 0) {
        maxSec = Math.round(sec);
        const dObj = new Date(dStr);
        const dayStr = String(dObj.getDate()).padStart(2, '0');
        const monthStr = String(dObj.getMonth() + 1).padStart(2, '0');
        const yearStr = dObj.getFullYear();
        peakDay = {
          date: dStr,
          label: `${dayStr}.${monthStr}.${yearStr}`,
          seconds: maxSec,
          minutes: Number((maxSec / 60).toFixed(1)),
        };
      }
    });

    // Mark peak day in chart
    if (peakDay) {
      const peakDate = (peakDay as PeakDayInfo).date;
      days.forEach((day) => {
        if (day.date === peakDate && day.seconds > 0) day.isPeak = true;
      });
    }

    const activeDaysCount = days.filter((d) => d.seconds > 0).length;
    const avgMin = activeDaysCount > 0 ? Number(((monthTotalSec / 60) / activeDaysCount).toFixed(1)) : 0;

    return {
      dailyList: days,
      peakDay,
      peakMinutes: peakDay ? (peakDay as PeakDayInfo).minutes : 0,
      peakSeconds: peakDay ? (peakDay as PeakDayInfo).seconds : 0,
      totalListenedDays: activeDaysCount,
      averageMinutes: avgMin,
      totalSeconds: monthTotalSec,
      maxSecInPeriod: Math.max(maxSecInPeriod, 60),
      lastListenedAt: latestTimestamp,
    };
  }, [targetAuthor, authorBooks, listeningStats, selectedMonthKey]);

  if (!currentUser) return null;

  if (!targetAuthor) {
    return (
      <section style={{ padding: '60px 16px', textAlign: 'center', backgroundColor: '#F8FAFC', minHeight: '80vh' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', background: '#FFFFFF', padding: '40px', borderRadius: '24px', border: '1.5px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '10px' }}>
            Автор табылмады
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
            Бұл автор жүйеде тіркелмеген немесе өшірілген.
          </p>
          <Link
            to="/admin/managers"
            style={{
              display: 'inline-flex',
              padding: '10px 24px',
              borderRadius: '50px',
              background: 'var(--blue)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '13.5px',
            }}
          >
            ← Басқару бетіне оралу
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: '32px 16px 80px', backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>

        {/* 1. Admin Top Banner & Switcher (if Admin is viewing) */}
        {isAdmin && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '16px 24px',
              border: '1.5px solid #BFDBFE',
              boxShadow: '0 4px 16px rgba(0, 84, 148, 0.04)',
              marginBottom: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link
                to="/admin/managers"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--blue)',
                  background: 'rgba(0, 84, 148, 0.08)',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Басқару панеліне оралу
              </Link>
            </div>

            {/* Fast Author Switcher Dropdown */}
            {allAuthors.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
                  Авторды ауыстыру:
                </label>
                <select
                  value={targetAuthor.id}
                  onChange={(e) => navigate(`/admin/authors/${e.target.value}`)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: 'var(--text-dark)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {allAuthors.map((aut) => (
                    <option key={aut.id} value={aut.id}>
                      {aut.name} ({aut.assignedBookIds?.length || 0} кітап)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* 2. Top Header Card (Author Identity) */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '30px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 8px 30px rgba(0, 45, 80, 0.04)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--blue) 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '28px',
                  boxShadow: '0 8px 20px rgba(0, 84, 148, 0.25)',
                  flexShrink: 0,
                  overflow: 'hidden',
                  border: '3px solid #FFFFFF',
                }}
              >
                {targetAuthor.avatarUrl ? (
                  <img src={targetAuthor.avatarUrl} alt={targetAuthor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  targetAuthor.name.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                    {targetAuthor.name}
                  </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px', fontSize: '13px', color: '#64748B', flexWrap: 'wrap' }}>
                  <span>ID: <strong style={{ fontFamily: 'monospace', color: 'var(--text-dark)' }}>{formatDisplayId(targetAuthor.idNumber || targetAuthor.id)}</strong></span>
                  <span>•</span>
                  <span>{targetAuthor.email}</span>
                  {targetAuthor.phone && (
                    <>
                      <span>•</span>
                      <span>{targetAuthor.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentUser.id === targetAuthor.id ? (
                <Link
                  to="/settings"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#475569',
                    background: '#F1F5F9',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  Профиль баптаулары
                </Link>
              ) : (
                <Link
                  to={`/admin/managers?tab=authors&editAuthor=${targetAuthor.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--blue)',
                    background: '#EFF6FF',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  Авторды өңдеу ↗
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 3. Royalty Earnings & Balance Card (50/50 Model) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #003763 0%, #005494 100%)',
            borderRadius: '24px',
            padding: '28px 32px',
            color: '#FFFFFF',
            boxShadow: '0 12px 32px rgba(0, 55, 99, 0.18)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>
                  Аудиокітап тыңдалымдары мен роялти табысы
                </h2>
              </div>
            </div>

            {currentUser.id === targetAuthor.id && (
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(true)}
                style={{
                  padding: '11px 22px',
                  borderRadius: '50px',
                  border: 'none',
                  background: 'var(--orange)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(239, 126, 0, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                Ақшаны шығару
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Кітаптар саны</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                {authorBooks.length}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Тыңдалған уақыт</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                {royalty.totalSeconds >= 60
                  ? `${Math.floor(royalty.totalSeconds / 60)} мин`
                  : royalty.totalSeconds > 0
                  ? `${royalty.totalSeconds} сек`
                  : '0 мин'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                {royalty.totalSeconds >= 3600
                  ? `≈ ${(royalty.totalSeconds / 3600).toFixed(1)} сағат`
                  : `${royalty.totalSeconds} секунд`}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>1 минуттың бағасы</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                {royalty.ratePerMinute} ₸
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                1 сағатқа ≈ {(royalty.ratePerMinute * 60).toFixed(1)} ₸
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{formatMonthLabel(selectedMonthKey)} роялти табысы</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px', color: '#86EFAC' }}>
                {Number((Math.floor(dailyAnalytics.totalSeconds / 60) * royalty.ratePerMinute).toFixed(2)).toLocaleString()} ₸
              </div>
            </div>
          </div>
        </div>

        {/* 4. Daily Listening Dynamics ("Қай күні көп тыңдалды") */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '28px 32px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.03)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Тыңдалым белсенділігі мен пик күндері
              </h3>
            </div>

            {/* Month navigator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setSelectedMonthKey((prev) => shiftMonth(prev, -1))}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  border: '1.5px solid #E2E8F0', background: '#F8FAFC',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-dark)',
                  fontSize: '16px', fontWeight: 700,
                }}
              >‹</button>

              <span style={{
                fontSize: '13px', fontWeight: 700, color: '#64748B',
                background: '#F1F5F9', borderRadius: '8px', padding: '5px 14px',
                minWidth: '155px', textAlign: 'center',
              }}>
                {formatMonthLabel(selectedMonthKey)}
              </span>

              <button
                onClick={() => setSelectedMonthKey((prev) => shiftMonth(prev, 1))}
                disabled={selectedMonthKey >= currentMonthKey}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  border: '1.5px solid #E2E8F0', background: '#F8FAFC',
                  cursor: selectedMonthKey >= currentMonthKey ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selectedMonthKey >= currentMonthKey ? '#CBD5E1' : 'var(--text-dark)',
                  fontSize: '16px', fontWeight: 700,
                }}
              >›</button>
            </div>
          </div>

          {/* 3 Metric Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            {/* Peak Day Card */}
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '16px',
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Ең көп тыңдалған күн</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)' }}>
                {dailyAnalytics.peakDay ? (dailyAnalytics.peakDay as PeakDayInfo).label : 'Әлі тыңдалмады'}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginTop: '4px' }}>
                {dailyAnalytics.peakDay
                  ? `${dailyAnalytics.peakMinutes > 0 ? `${dailyAnalytics.peakMinutes} минут` : `${dailyAnalytics.peakSeconds} секунд`}`
                  : '0 минут'}
              </div>
            </div>

            {/* Active Days Card */}
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '16px',
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Белсенді күндер саны</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)' }}>
                {dailyAnalytics.totalListenedDays} күн
              </div>
            </div>

            {/* Average Daily Card */}
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '16px',
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Орташа күнделікті уақыт</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)' }}>
                {(() => {
                  const activeDays = dailyAnalytics.totalListenedDays;
                  if (activeDays === 0 || royalty.totalSeconds === 0) return '0 мин';
                  const avg = Number((Math.floor(royalty.totalSeconds / 60) / activeDays).toFixed(1));
                  return `${avg} мин`;
                })()}
              </div>
            </div>
          </div>

          {/* Monthly Activity Bar Chart */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)' }}>
                {formatMonthLabel(selectedMonthKey)} — күнделікті тыңдалым:
              </span>
            </div>

            <div style={{ overflowX: 'auto', paddingBottom: '8px' }} className="custom-scrollbar">
              <div
                style={{
                  minWidth: '650px',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${dailyAnalytics.dailyList.length}, 1fr)`,
                  gap: '5px',
                  alignItems: 'flex-end',
                  height: '145px',
                  background: '#F8FAFC',
                  padding: '24px 14px 10px',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                }}
              >
                {dailyAnalytics.dailyList.map((day) => {
                  const heightPercent = dailyAnalytics.maxSecInPeriod > 0
                    ? Math.max(6, Math.round((day.seconds / dailyAnalytics.maxSecInPeriod) * 75))
                    : 6;

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
                      title={`${day.label}: ${day.minutes > 0 ? `${day.minutes} мин` : `${day.seconds} сек`}`}
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
                              top: '-18px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontSize: '10px',
                              fontWeight: 900,
                              color: '#EA580C',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            🔥 Пик
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
        </div>



        {/* 6. Book-by-Book Breakdown Table */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '26px 30px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Автор кітаптарының нақты тыңдалым кестесі: {authorBooks.length}
              </h3>
            </div>
          </div>

          {authorBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
              Авторға бекітілген кітаптар жоқ.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontWeight: 800 }}>
                    <th style={{ padding: '12px 14px' }}>Кітап</th>
                    <th style={{ padding: '12px 14px' }}>Санаты</th>
                    <th style={{ padding: '12px 14px' }}>Тыңдалған уақыт</th>
                    <th style={{ padding: '12px 14px' }}>Үлесі (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {authorBooks.map((book) => {
                    const trackedSec = Math.floor(listeningStats[book.id]?.totalSeconds || 0);
                    const trackedMin = listeningStats[book.id]?.totalMinutes || 0;
                    const displayTime = trackedMin > 0 ? `${trackedMin} мин` : trackedSec > 0 ? `${trackedSec} сек` : '0 мин';
                    const share = royalty.totalSeconds > 0 ? Math.round((trackedSec / royalty.totalSeconds) * 100) : 0;

                    return (
                      <tr key={book.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '52px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              background: book.gradient || '#005494',
                              flexShrink: 0,
                            }}
                          >
                            {book.coverImage && <img src={book.coverImage} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{book.title}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                              {book.pages ? `${book.pages} бет` : ''} {book.hasAudio ? '• 🎧 Аудио' : ''}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--blue)', background: 'rgba(0, 84, 148, 0.08)', padding: '3px 8px', borderRadius: '6px' }}>
                            {book.category}
                          </span>
                        </td>

                        <td style={{ padding: '14px', fontWeight: 800, color: '#2563EB' }}>
                          {displayTime}
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                            {trackedSec} секунд
                          </div>
                        </td>

                        <td style={{ padding: '14px', minWidth: '120px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${share}%`, height: '100%', background: 'var(--blue)', borderRadius: '4px' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-dark)', minWidth: '32px' }}>
                              {share}%
                            </span>
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

        {/* 8. Payout Request Modal */}
        {isPayoutModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0, 20, 45, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setIsPayoutModalOpen(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
                padding: '32px',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  Қаражатты шығару
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Қолжетімді баланс:</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#16A34A' }}>
                  {royalty.currentBalance.toLocaleString()} ₸
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt = Number(payoutAmount);
                  if (!amt || amt <= 0) {
                    showToast('Жарамды сома енгізіңіз', 'error');
                    return;
                  }
                  if (amt > royalty.currentBalance) {
                    showToast('Шығару сомасы баланстан аспауы керек', 'error');
                    return;
                  }
                  if (!payoutAccount.trim()) {
                    showToast('Карта немесе шот нөмірін жазыңыз', 'error');
                    return;
                  }
                  const res = requestPayout(targetAuthor.id, targetAuthor.name, amt, payoutMethod, payoutAccount);
                  if (res.success) {
                    showToast(`«${amt.toLocaleString()} ₸» сомасына ақша шығару өтінімі қабылданды!`, 'success');
                    setIsPayoutModalOpen(false);
                    setPayoutAmount('');
                    setPayoutAccount('');
                  } else {
                    showToast(res.error || 'Қате орын алды', 'error');
                  }
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Шығару әдісі
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Kaspi Gold">Kaspi Gold (Телефон немесе Карта)</option>
                    <option value="Halyk Bank">Halyk Bank (Карта нөмірі)</option>
                    <option value="Банктік шот (ИП / ЖК / Өзін-өзі жұмыспен қамтығандар)">Банктік шот (IBAN KZ...)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Шығару сомасы (₸)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Мысалы: 50 000"
                    value={formatNumberWithSpaces(payoutAmount)}
                    onChange={(e) => {
                      const parsed = parseFormattedNumber(e.target.value);
                      setPayoutAmount(parsed > 0 ? String(parsed) : '');
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Деректемелер (Карта нөмірі / Телефон / IBAN)
                  </label>
                  <input
                    type="text"
                    placeholder="4400 4300 .... немесе +7 (701) ..."
                    value={payoutAccount}
                    onChange={(e) => setPayoutAccount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsPayoutModalOpen(false)}
                    style={{
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '50px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: 'var(--text-mid)',
                      cursor: 'pointer',
                    }}
                  >
                    Бас тарту
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      padding: '10px 24px',
                      fontSize: '13px',
                      fontWeight: 800,
                      borderRadius: '50px',
                    }}
                  >
                    Өтінім жіберу
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
