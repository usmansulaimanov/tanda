import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuthStore, DEFAULT_MANAGER_AVATAR } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { useRoyaltyStore } from '../../store/useRoyaltyStore';
import { api } from '../../lib/api';
import { User } from '../../types';

interface PeakDayInfo {
  date: string;
  label: string;
  seconds: number;
  minutes: number;
}

export interface FormattedListeningTime {
  seconds: number;
  minutes: number;
  hours: number;
  secondsFormatted: string;
  minutesFormatted: string;
  hoursFormatted: string;
  compositeFormatted: string;
}

export const formatListeningTime = (totalSecInput: number | undefined | null): FormattedListeningTime => {
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

  const {
    user: currentUser,
    isAuthenticated,
    isAuthInitialized,
    authors,
    fetchAuthors,
    getAllAuthors,
  } = useAuthStore();
  const { books } = useBookStore();
  const { showToast } = useToastStore();
  const { fetchAuthorStats, authorStatsCache, authorBalances } = useRoyaltyStore();

  // Selected month for chart (YYYY-MM), defaults to current month
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isAuthorsLoaded, setIsAuthorsLoaded] = useState(false);
  const [directAuthor, setDirectAuthor] = useState<User | null>(null);

  // If not authenticated, redirect with preserved return URL
  useEffect(() => {
    if (!isAuthInitialized) return;

    if (!isAuthenticated || !currentUser) {
      showToast('Бұл бетті көру үшін жүйеге кіріңіз', 'error');
      const currentPath = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }

    const isUserAdmin = currentUser.role === 'admin' || Boolean(currentUser.isSuperAdmin);
    const isUserAuthor = currentUser.role === 'author' || Boolean(currentUser.isAuthor);

    if (!isUserAdmin && !isUserAuthor) {
      showToast('Бұл бетке кіруге рұқсатыңыз жоқ', 'error');
      navigate('/', { replace: true });
      return;
    }

    if (isUserAdmin) {
      fetchAuthors()
        .then(() => setIsAuthorsLoaded(true))
        .catch(() => setIsAuthorsLoaded(true));
    } else {
      setIsAuthorsLoaded(true);
    }
  }, [isAuthInitialized, isAuthenticated, currentUser, navigate, showToast, fetchAuthors]);

  const isAdmin = currentUser?.role === 'admin' || Boolean(currentUser?.isSuperAdmin);

  // If queryAuthorId is provided and author not in store, fetch directly
  useEffect(() => {
    if (!queryAuthorId || !isAuthInitialized || !currentUser) return;
    const isUserAdmin = currentUser.role === 'admin' || Boolean(currentUser.isSuperAdmin);
    if (!isUserAdmin) return;

    const exists = (authors || []).some(
      (a) => a.id === queryAuthorId || a.authorId === queryAuthorId || a.idNumber === queryAuthorId
    );
    if (!exists) {
      api
        .get(`/api/v1/admin/authors/${queryAuthorId}`)
        .then(({ data }) => {
          if (data) {
            setDirectAuthor({
              id: data.userId || data.id,
              authorId: data.id,
              name: data.name || '',
              email: data.email || '',
              phone: data.phone || undefined,
              idNumber: data.idNumber || undefined,
              avatarUrl: data.avatarUrl || DEFAULT_MANAGER_AVATAR,
              assignedAuthorName: data.assignedAuthorName || data.name || '',
              assignedBookIds: data.bookIds || data.assignedBookIds || [],
              role: 'author',
              isAuthor: true,
              duty: 'Автор',
              isActive: data.isActive !== false,
              createdAt: data.createdAt,
            });
          }
        })
        .catch(() => {
          // not found
        });
    }
  }, [queryAuthorId, isAuthInitialized, currentUser, authors]);

  // All authors list for Admin dropdown
  const allAuthors = useMemo(() => {
    const list = authors && authors.length > 0 ? authors : getAllAuthors();
    if (directAuthor && !list.some((a) => a.id === directAuthor.id || a.authorId === directAuthor.authorId)) {
      return [...list, directAuthor];
    }
    return list;
  }, [authors, getAllAuthors, directAuthor]);

  // Target author to display
  const targetAuthor: User | null = useMemo(() => {
    if (!currentUser) return null;
    if (queryAuthorId) {
      const found = allAuthors.find(
        (a) => a.id === queryAuthorId || a.authorId === queryAuthorId || a.idNumber === queryAuthorId
      );
      if (found) return found;
      if (
        directAuthor &&
        (directAuthor.id === queryAuthorId ||
          directAuthor.authorId === queryAuthorId ||
          directAuthor.idNumber === queryAuthorId)
      ) {
        return directAuthor;
      }
    }
    if (currentUser.role === 'author') {
      return currentUser;
    }
    if (isAdmin) {
      if (queryAuthorId) {
        const found = allAuthors.find(
          (a) => a.id === queryAuthorId || a.authorId === queryAuthorId || a.idNumber === queryAuthorId
        );
        return found || directAuthor || null;
      }
      return allAuthors[0] || null;
    }
    return currentUser;
  }, [queryAuthorId, allAuthors, directAuthor, currentUser, isAdmin]);

  // Determine author name to match
  const authorName = useMemo(() => {
    if (!targetAuthor) return '';
    return targetAuthor.assignedAuthorName?.trim() || targetAuthor.name.trim();
  }, [targetAuthor]);

  const currentAuthorStats = useMemo(() => {
    if (!targetAuthor) return null;
    const directKey1 = `${targetAuthor.id}_${selectedMonthKey}`;
    const directKey2 = targetAuthor.authorId ? `${targetAuthor.authorId}_${selectedMonthKey}` : directKey1;
    if (authorStatsCache[directKey1]) {
      return authorStatsCache[directKey1];
    }
    if (authorStatsCache[directKey2]) {
      return authorStatsCache[directKey2];
    }
    const match = Object.values(authorStatsCache).find(
      (s) =>
        s.month === selectedMonthKey &&
        (s.authorId === targetAuthor.id ||
          (targetAuthor.authorId && s.authorId === targetAuthor.authorId) ||
          (s.authorName && authorName && s.authorName.toLowerCase().trim() === authorName.toLowerCase().trim()))
    );
    return match || null;
  }, [targetAuthor, selectedMonthKey, authorStatsCache, authorName]);

  // Filter books belonging to this author
  const authorBooks = useMemo(() => {
    if (!targetAuthor) return [];
    if (!authorName && (!targetAuthor.assignedBookIds || targetAuthor.assignedBookIds.length === 0)) {
      return [];
    }

    const lowAuthor = authorName.toLowerCase();
    const assignedIds = new Set(targetAuthor.assignedBookIds || []);
    if (currentAuthorStats?.authorBooks) {
      currentAuthorStats.authorBooks.forEach((b: any) => {
        if (b.id) assignedIds.add(b.id);
        if (b.bookId) assignedIds.add(b.bookId);
      });
    }

    return books.filter((b) => {
      if (assignedIds.has(b.id)) return true;
      if (!b.author) return false;
      const bAuthor = b.author.toLowerCase().trim();
      return bAuthor === lowAuthor || bAuthor.includes(lowAuthor) || lowAuthor.includes(bAuthor);
    });
  }, [books, authorName, targetAuthor, currentAuthorStats]);

  // Fetch author stats from backend
  useEffect(() => {
    if (targetAuthor?.id || targetAuthor?.authorId) {
      const idToFetch = targetAuthor.authorId || targetAuthor.id;
      fetchAuthorStats(idToFetch, selectedMonthKey);
    }
  }, [targetAuthor?.id, targetAuthor?.authorId, selectedMonthKey, fetchAuthorStats]);

  // Aggregated metrics
  const stats = useMemo(() => {
    const totalBooks = authorBooks.length;
    const audioBooks = authorBooks.filter((b) => b.hasAudio || b.audioUrl).length;
    const totalPages = authorBooks.reduce((acc, b) => acc + (b.pages || 0), 0);

    let totalReads = 0;
    let totalViews = 0;
    let totalShelfSaves = 0;

    authorBooks.forEach((b) => {
      totalViews += b.viewsCount || 0;
      totalReads += b.readsCount || 0;
      totalShelfSaves += b.savedCount || 0;
    });

    const totalListens = currentAuthorStats?.totalMinutes || 0;

    return {
      totalBooks,
      audioBooks,
      totalPages,
      totalViews,
      totalReads,
      totalListens,
      totalShelfSaves,
    };
  }, [authorBooks, currentAuthorStats]);

  // Royalty and listening earnings
  const royalty = useMemo(() => {
    if (!targetAuthor) {
      return { totalMinutes: 0, totalSeconds: 0, estimatedEarned: 0, ratePerMinute: 0, currentBalance: 0, periodStatus: 'estimated' as const };
    }
    const targetBalance =
      authorBalances[targetAuthor.authorId || targetAuthor.id] ??
      authorBalances[targetAuthor.id] ??
      currentAuthorStats?.currentBalance ??
      0;

    if (currentAuthorStats) {
      return {
        totalMinutes: currentAuthorStats.totalMinutes,
        totalSeconds: currentAuthorStats.totalSeconds,
        estimatedEarned: currentAuthorStats.estimatedEarned,
        ratePerMinute: currentAuthorStats.ratePerMinute,
        currentBalance: targetBalance,
        periodStatus: currentAuthorStats.periodStatus,
      };
    }
    return {
      totalMinutes: 0,
      totalSeconds: 0,
      estimatedEarned: 0,
      ratePerMinute: 0,
      currentBalance: targetBalance,
      periodStatus: 'estimated' as const,
    };
  }, [targetAuthor, currentAuthorStats, authorBalances]);

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

  // Monthly Analytics: from backend stats
  const dailyAnalytics = useMemo(() => {
    if (!currentAuthorStats) {
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

    const maxSec = currentAuthorStats.dailyList.reduce((m, d) => Math.max(m, d.seconds), 60);

    return {
      dailyList: currentAuthorStats.dailyList,
      peakDay: currentAuthorStats.peakDay,
      peakMinutes: currentAuthorStats.peakMinutes,
      peakSeconds: currentAuthorStats.peakSeconds,
      totalListenedDays: currentAuthorStats.totalListenedDays,
      averageMinutes: currentAuthorStats.averageMinutes,
      totalSeconds: currentAuthorStats.totalSeconds,
      maxSecInPeriod: maxSec,
      lastListenedAt: currentAuthorStats.lastListenedAt,
    };
  }, [currentAuthorStats]);

  // Loading skeleton while initializing auth or loading target author
  if (!isAuthInitialized || (isAdmin && queryAuthorId && !targetAuthor && !isAuthorsLoaded)) {
    return (
      <section style={{ padding: '32px 16px 80px', backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 80px)' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ height: '60px', background: '#FFFFFF', borderRadius: '18px', border: '1.5px solid #E2E8F0', opacity: 0.6 }} />
          <div style={{ height: '120px', background: '#FFFFFF', borderRadius: '24px', border: '1.5px solid #E2E8F0', opacity: 0.6 }} />
          <div style={{ height: '200px', background: '#FFFFFF', borderRadius: '24px', border: '1.5px solid #E2E8F0', opacity: 0.6 }} />
        </div>
      </section>
    );
  }

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
            to={isAdmin ? '/admin/managers' : '/author/home'}
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
            {isAdmin ? '← Басқару бетіне оралу' : '← Жеке кабинетке оралу'}
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
                  value={targetAuthor.authorId || targetAuthor.id}
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
                    <option key={aut.id} value={aut.authorId || aut.id}>
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
              ) : isAdmin ? (
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
              ) : null}
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
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '14px',
            }}
          >
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Кітаптар саны</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                {authorBooks.length}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                {stats.audioBooks} аудиокітап
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Нақты тыңдалған уақыт</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                {formatListeningTime(royalty.totalSeconds).minutesFormatted}
              </div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.85)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>🕒 {formatListeningTime(royalty.totalSeconds).hoursFormatted} ({formatListeningTime(royalty.totalSeconds).hours} сағат)</span>
                <span>⏱️ {formatListeningTime(royalty.totalSeconds).secondsFormatted}</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>1 минуттың құны</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                {royalty.periodStatus === 'paid' ? `${royalty.ratePerMinute} ₸` : '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                {royalty.periodStatus === 'paid' ? '✓ Ай соңында бекітілді' : 'Ай соңында анықталады'}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{formatMonthLabel(selectedMonthKey)} табысы</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px', color: royalty.periodStatus === 'paid' ? '#86EFAC' : '#FDE047' }}>
                {royalty.periodStatus === 'paid'
                  ? `${Number((Math.floor(dailyAnalytics.totalSeconds / 60) * royalty.ratePerMinute).toFixed(2)).toLocaleString()} ₸`
                  : 'Жинақталуда'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                {royalty.periodStatus === 'paid' ? 'Ресми есептелген' : 'Ай соңында бекітіледі'}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(255,255,255,0.25)' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>Қолжетімді баланс</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px', color: '#FFFFFF' }}>
                {Number((royalty.currentBalance || 0).toFixed(2)).toLocaleString()} ₸
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
                Жалпы жинақталған баланс
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '12.5px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            <span style={{ fontSize: '16px' }}>ℹ️</span>
            <span>
              <strong>Нақты уақыттағы тыңдалым ережесі:</strong> Оқырман аудионы 60 секундтан асырып тыңдаған сәтте автор есебіне бірден жазылады. Ал роялтидің ресми ақшалай сомасы әр айдың соңында әкімшілік түсім мен шығынды бекіткенде қолжетімді балансқа түседі.
            </span>
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
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#005494', marginTop: '4px' }}>
                {dailyAnalytics.peakDay
                  ? formatListeningTime(dailyAnalytics.peakSeconds || (dailyAnalytics.peakMinutes * 60)).compositeFormatted
                  : '0 сағ • 0 мин • 0 сек'}
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
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                {selectedMonthKey ? `${formatMonthLabel(selectedMonthKey)} бойынша` : ''}
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
              {(() => {
                const activeDays = dailyAnalytics.totalListenedDays;
                const avgSec = activeDays > 0 ? Math.round(royalty.totalSeconds / activeDays) : 0;
                const avgTime = formatListeningTime(avgSec);
                return (
                  <>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)' }}>
                      {avgTime.minutesFormatted}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                      {avgTime.hoursFormatted} • {avgTime.secondsFormatted}
                    </div>
                  </>
                );
              })()}
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
                    const authorBookStat = currentAuthorStats?.authorBooks?.find((ab: any) => ab.id === book.id || ab.bookId === book.id);
                    const trackedSec = authorBookStat?.totalSeconds ?? ((authorBookStat?.totalMinutes ?? 0) * 60);
                    const bookTime = formatListeningTime(trackedSec);
                    const share = royalty.totalMinutes > 0 ? Math.round((bookTime.minutes / royalty.totalMinutes) * 100) : 0;

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{book.title}</span>
                              {targetAuthor?.assignedBookIds?.includes(book.id) ? (
                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '1px 6px', borderRadius: '4px' }}>
                                  ✓ Бекітілген
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369A1', background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '1px 6px', borderRadius: '4px' }}>
                                  🕒 Тарихи тыңдалым
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
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
                          <div>{bookTime.minutesFormatted}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                            ⏱ {bookTime.secondsFormatted} • 🕒 {bookTime.hoursFormatted}
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

      </div>
    </section>
  );
};
