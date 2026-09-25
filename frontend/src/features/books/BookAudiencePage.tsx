import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { booksApi } from '../../shared/api/books.api';
import { BookAudienceMember, Book } from '../../types';
import { Skeleton } from '../../shared/ui';

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

const formatMonthOnly = (monthKey: string) => {
  const parts = monthKey.split('-');
  if (parts.length === 2) {
    return MONTH_NAMES_KZ[parts[1]] || parts[1];
  }
  return monthKey;
};

export const BookAudiencePage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role, isAuthInitialized } = useAuthStore();
  const { showToast } = useToastStore();

  const isAdmin = Boolean(user?.isSuperAdmin || (role === 'admin' && !user?.duty) || role === 'admin');

  const [book, setBook] = useState<Book | null>(null);
  const [audienceList, setAudienceList] = useState<BookAudienceMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const qMonth = searchParams.get('month');
    if (qMonth && /^\d{4}-\d{2}$/.test(qMonth)) {
      return qMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [tierFilter, setTierFilter] = useState<'LISTENERS' | 'READERS' | 'ACTIVES'>(() => {
    const qTier = searchParams.get('tier');
    if (qTier === 'READERS' || qTier === 'ACTIVES') return qTier;
    return 'LISTENERS';
  });

  const [scope, setScope] = useState<'MONTH' | 'ALL_TIME'>(() => {
    const qScope = searchParams.get('scope');
    if (qScope === 'ALL_TIME') return 'ALL_TIME';
    return 'MONTH';
  });

  const [searchQuery, setSearchQuery] = useState('');

  const [selectedYear, selectedMonth] = useMemo(() => {
    const parts = selectedMonthKey.split('-');
    const y = parts[0] || String(new Date().getFullYear());
    const m = parts[1] || '01';
    return [y, m];
  }, [selectedMonthKey]);

  const loadData = async (bId: string, tier: string, sc: string, mKey: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [bookData, audienceData] = await Promise.all([
        booksApi.getById(bId),
        booksApi.getAudience(bId, { tier, scope: sc, month: mKey }),
      ]);
      setBook(bookData);
      setAudienceList(Array.isArray(audienceData) ? audienceData : []);
    } catch (err: any) {
      console.error('Failed to load audience:', err);
      const msg = err?.response?.data?.message || 'Оқырмандар тізімін жүктеу мүмкін болмады';
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
      if (bookId) {
        loadData(bookId, tierFilter, scope, selectedMonthKey);
      }
    }
  }, [isAuthInitialized, isAdmin, bookId, tierFilter, scope, selectedMonthKey]);

  const updateFilters = (newTier: 'LISTENERS' | 'READERS' | 'ACTIVES', newScope: 'MONTH' | 'ALL_TIME', newMonth: string) => {
    setTierFilter(newTier);
    setScope(newScope);
    setSelectedMonthKey(newMonth);
    setCurrentPage(1);
    setSearchParams({
      tier: newTier,
      scope: newScope,
      month: newMonth,
    });
  };

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return audienceList;
    const q = searchQuery.toLowerCase().trim();
    return audienceList.filter((m) =>
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q) ||
      m.idNumber?.toLowerCase().includes(q) ||
      m.username?.toLowerCase().includes(q)
    );
  }, [audienceList, searchQuery]);

  // Paginated list
  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  const handleBack = () => {
    navigate(`/admin/books/${bookId}/stats?month=${selectedMonthKey}`);
  };

  const handleReaderClick = (memberUserId: string) => {
    navigate(`/admin/books/${bookId}/readers/${memberUserId}/stats?month=${selectedMonthKey}&scope=${scope}&tier=${tierFilter}`);
  };

  const exportToExcel = () => {
    try {
      if (filteredMembers.length === 0) {
        showToast('Жүктеу үшін оқырмандар табылмады', 'info');
        return;
      }

      const rows = filteredMembers.map((member, idx) => ({
        '№': idx + 1,
        'ID нөмірі': member.idNumber ? `ID: ${member.idNumber}` : '—',
        'Аты-жөні': member.name || 'Оқырман',
        'Юзернейм': member.username ? `@${member.username}` : '—',
        'Электронды поштасы (Email)': member.email || '—',
        'Телефон нөмірі': member.phone || '—',
        'Бүгін тыңдағаны': member.todayFormattedDuration || '0 мин',
        'Тыңдаған уақыты': member.formattedDuration || '0 сек',
        'Кітап атауы': book?.title || '—',
        'Уақыт ауқымы': scope === 'MONTH' ? formatMonthLabel(selectedMonthKey) : 'Барлық уақытта',
        'Санаты': tierFilter === 'LISTENERS' ? 'Тыңдарман' : tierFilter === 'READERS' ? 'Оқырман' : 'Белсенді',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 26 },
        { wch: 18 },
        { wch: 28 },
        { wch: 18 },
        { wch: 20 },
        { wch: 28 },
        { wch: 22 },
        { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Аудитория');

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Tanda_${book?.title || 'Book'}_Audience_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);

      showToast(`«${filename}» Excel файлы сәтті жүктелді! (${filteredMembers.length} оқырман)`, 'success');
    } catch {
      showToast('Excel файлын экспорттау кезінде қате орын алды', 'error');
    }
  };

  if (!isAuthInitialized || (isLoading && !book)) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>
        <Skeleton className="h-28 rounded-2xl mb-6" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <section className="admin-page-section" style={{ minHeight: '85vh', padding: '32px 16px', background: '#F8FAFC' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Breadcrumb & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <Link to="/admin" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
              Басқару панелі
            </Link>
            <span>/</span>
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--blue)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Кітап статистикасы
            </button>
            <span>/</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
              Оқырмандар аудиториясы
            </span>
          </div>

          <button
            type="button"
            onClick={handleBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#475569',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              borderRadius: '10px',
              padding: '8px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Артқа қайту
          </button>
        </div>

        {/* Top Header Card: Book info & Month */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1.5px solid #E2E8F0',
            padding: '20px 26px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {book && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px', flex: 1 }}>
                <div
                  style={{
                    width: '48px',
                    height: '64px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#005494',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  }}
                >
                  {book.coverImage && (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                    {book.title}
                  </h1>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '3px', fontWeight: 600 }}>
                    Авторы: <strong style={{ color: '#0F172A' }}>{book.author}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Year & Month selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Year */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Жыл:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => updateFilters(tierFilter, scope, `${e.target.value}-${selectedMonth}`)}
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '9px 14px',
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
              </div>

              {/* Month */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Ай:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => updateFilters(tierFilter, scope, `${selectedYear}-${e.target.value}`)}
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '9px 16px',
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
        </div>

        {/* Main Card with Filters, Search, and Table */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1.5px solid #E2E8F0',
            padding: '24px 28px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '20px',
              paddingBottom: '20px',
              borderBottom: '1.5px solid #F1F5F9',
            }}
          >
            {/* Left side: Tiers & Scope */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Scope toggle */}
              <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '10px', padding: '3px' }}>
                <button
                  type="button"
                  onClick={() => updateFilters(tierFilter, 'MONTH', selectedMonthKey)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    background: scope === 'MONTH' ? '#FFFFFF' : 'transparent',
                    color: scope === 'MONTH' ? 'var(--blue)' : '#64748B',
                    boxShadow: scope === 'MONTH' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {formatMonthOnly(selectedMonthKey)}
                </button>
                <button
                  type="button"
                  onClick={() => updateFilters(tierFilter, 'ALL_TIME', selectedMonthKey)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    background: scope === 'ALL_TIME' ? '#FFFFFF' : 'transparent',
                    color: scope === 'ALL_TIME' ? 'var(--blue)' : '#64748B',
                    boxShadow: scope === 'ALL_TIME' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Жалпы
                </button>
              </div>

              <div style={{ width: '1px', height: '24px', background: '#E2E8F0', margin: '0 2px' }} />

              {/* Clean Tier Buttons (WITHOUT duration text) */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => updateFilters('LISTENERS', scope, selectedMonthKey)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid',
                    borderColor: tierFilter === 'LISTENERS' ? '#2563EB' : '#CBD5E1',
                    background: tierFilter === 'LISTENERS' ? '#EFF6FF' : '#FFFFFF',
                    color: tierFilter === 'LISTENERS' ? '#2563EB' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Тыңдармандар
                </button>
                <button
                  type="button"
                  onClick={() => updateFilters('READERS', scope, selectedMonthKey)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid',
                    borderColor: tierFilter === 'READERS' ? '#059669' : '#CBD5E1',
                    background: tierFilter === 'READERS' ? '#ECFDF5' : '#FFFFFF',
                    color: tierFilter === 'READERS' ? '#059669' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Оқырмандар
                </button>
                <button
                  type="button"
                  onClick={() => updateFilters('ACTIVES', scope, selectedMonthKey)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid',
                    borderColor: tierFilter === 'ACTIVES' ? '#D97706' : '#CBD5E1',
                    background: tierFilter === 'ACTIVES' ? '#FFFBEB' : '#FFFFFF',
                    color: tierFilter === 'ACTIVES' ? '#D97706' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Белсенділер
                </button>
              </div>
            </div>

            {/* Right side: Search, Refresh, Excel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
                <input
                  type="text"
                  placeholder="Оқырман аты, ID, пошта..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 34px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#F8FAFC',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box',
                  }}
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="2.5"
                  style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
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

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => bookId && loadData(bookId, tierFilter, scope, selectedMonthKey)}
                title="Тізімді жаңарту"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
                <span>Жаңарту</span>
              </button>

              {/* Excel Download button */}
              <button
                type="button"
                onClick={exportToExcel}
                title="Аудитория тізімін Excel форматында жүктеу"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: '#107C41',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(16, 124, 65, 0.25)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Excel жүктеу</span>
              </button>
            </div>
          </div>

          {/* Section header & counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                {tierFilter === 'LISTENERS' ? 'Тыңдармандар тізімі' : tierFilter === 'READERS' ? 'Оқырмандар тізімі' : 'Белсенділер тізімі'}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px', margin: 0 }}>
                {scope === 'MONTH' ? `${formatMonthLabel(selectedMonthKey)} айындағы оқырмандар` : 'Барлық уақыттағы оқырмандар'}
              </p>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
              Табылған оқырман саны: <strong style={{ color: 'var(--blue)' }}>{filteredMembers.length}</strong>
            </div>
          </div>

          {/* Audience Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>№</th>
                  <th style={{ width: '150px', whiteSpace: 'nowrap' }}>ID нөмірі</th>
                  <th>Аты-жөні</th>
                  <th>Электрондық поштасы</th>
                  <th style={{ width: '180px', whiteSpace: 'nowrap' }}>Тыңдаған уақыты</th>
                  <th style={{ width: '180px', textAlign: 'right', whiteSpace: 'nowrap' }}>Әрекеттер</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((member, index) => {
                  const itemIndex = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={member.userId || index}
                      onClick={() => handleReaderClick(member.userId)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Sequential Number */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12px' }}>
                        {itemIndex}
                      </td>

                      {/* ID Number Badge */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            background: 'rgba(0, 84, 148, 0.08)',
                            color: 'var(--blue)',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            letterSpacing: '0.04em',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ID: {member.idNumber || `0000 ${String(1000 + itemIndex).padStart(4, '0')}`}
                        </span>
                      </td>

                      {/* Name & Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              background: '#F1F5F9',
                              border: '1.5px solid #CBD5E1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                              flexShrink: 0,
                              color: '#475569',
                            }}
                          >
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              member.name?.charAt(0)?.toUpperCase() || 'U'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '14px' }}>
                              {member.name}
                            </div>
                            {member.username && (
                              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--blue)' }}>
                                @{member.username}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <div style={{ color: 'var(--text-mid)', fontSize: '13px' }}>
                          {member.email}
                        </div>
                      </td>

                      {/* Duration */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            Бүгін: {member.todayFormattedDuration || '0 мин'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                            {scope === 'MONTH' ? 'Бұл айда' : 'Жалпы'}: {member.formattedDuration}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaderClick(member.userId);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            background: '#F8FAFC',
                            color: 'var(--blue)',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#EFF6FF';
                            e.currentTarget.style.borderColor = '#93C5FD';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F8FAFC';
                            e.currentTarget.style.borderColor = '#CBD5E1';
                          }}
                        >
                          <span>Толық статистикасы</span>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-mid)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #CBD5E1',
                  borderTopColor: 'var(--blue)',
                  borderRadius: '50%',
                  margin: '0 auto 12px auto',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Оқырмандар тізімі жүктелуде...</div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredMembers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-mid)' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>👤</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '4px' }}>
                {searchQuery.trim() ? 'Іздеу бойынша оқырман табылмады' : 'Бұл санатта әзірге оқырман жоқ'}
              </div>
              <p style={{ fontSize: '13px', margin: '0 0 16px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto', color: '#64748B' }}>
                {searchQuery.trim()
                  ? `«${searchQuery}» сұранысы бойынша ешқандай оқырман табылмады. Іздеу сөзін өзгертіп көріңіз.`
                  : tierFilter === 'LISTENERS'
                  ? 'Кемінде 1 минут тыңдаған қолданушылар осы тізімде көрінеді.'
                  : tierFilter === 'READERS'
                  ? 'Кемінде 15 минут тыңдаған қолданушылар осы тізімде көрінеді.'
                  : 'Кемінде 1 сағат тыңдаған қолданушылар осы тізімде көрінеді.'}
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredMembers.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1.5px solid #F1F5F9',
              }}
            >
              {/* Page size selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                  Беттегі оқырман саны:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                  ({Math.min((currentPage - 1) * pageSize + 1, filteredMembers.length)}-
                  {Math.min(currentPage * pageSize, filteredMembers.length)} / Барлығы {filteredMembers.length})
                </span>
              </div>

              {/* Page navigation buttons */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      background: currentPage === 1 ? '#F8FAFC' : '#FFFFFF',
                      color: currentPage === 1 ? '#94A3B8' : 'var(--text-dark)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ‹ Алдыңғы
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - currentPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            border: '1.5px solid',
                            borderColor: pageNum === currentPage ? 'var(--blue)' : '#CBD5E1',
                            background: pageNum === currentPage ? 'var(--blue)' : '#FFFFFF',
                            color: pageNum === currentPage ? '#FFFFFF' : 'var(--text-dark)',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return (
                        <span key={pageNum} style={{ padding: '0 4px', color: '#94A3B8' }}>
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      background: currentPage === totalPages ? '#F8FAFC' : '#FFFFFF',
                      color: currentPage === totalPages ? '#94A3B8' : 'var(--text-dark)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Кейінгі ›
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
