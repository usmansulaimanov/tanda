import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { booksApi } from '../../shared/api/books.api';
import { BookAudienceMember, Book } from '../../types';
import { Skeleton } from '../../shared/ui';

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

  // 12 Months list
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

  const handleBack = () => {
    navigate(`/admin/books/${bookId}/stats?month=${selectedMonthKey}`);
  };

  const handleReaderClick = (memberUserId: string) => {
    navigate(`/admin/books/${bookId}/readers/${memberUserId}/stats?month=${selectedMonthKey}&scope=${scope}&tier=${tierFilter}`);
  };

  if (!isAuthInitialized || (isLoading && !book)) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        <Skeleton className="h-28 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: '280px' }}>
              
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
                Кітап статистикасына қайту
              </button>

              {/* Book details */}
              {book && (
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
                    {book.coverImage && (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                        {book.title}
                      </h1>
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
                        Оқырмандар аудиториясы
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px', fontWeight: 600 }}>
                      Авторы: <strong style={{ color: '#0F172A' }}>{book.author}</strong>
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
                onChange={(e) => updateFilters(tierFilter, scope, e.target.value)}
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

        {/* Filter Navigation Bar */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            padding: '16px 20px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Tiers & Scope tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Scope toggle */}
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '12px', padding: '3px' }}>
              <button
                type="button"
                onClick={() => updateFilters(tierFilter, 'MONTH', selectedMonthKey)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
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
                Бұл айда ({formatMonthLabel(selectedMonthKey)})
              </button>
              <button
                type="button"
                onClick={() => updateFilters(tierFilter, 'ALL_TIME', selectedMonthKey)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
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
                Жалпы (барлық уақытта)
              </button>
            </div>

            <div style={{ width: '1px', height: '24px', background: '#E2E8F0', margin: '0 4px' }} />

            {/* Tier Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => updateFilters('LISTENERS', scope, selectedMonthKey)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: tierFilter === 'LISTENERS' ? '#2563EB' : '#E2E8F0',
                  background: tierFilter === 'LISTENERS' ? '#EFF6FF' : '#FFFFFF',
                  color: tierFilter === 'LISTENERS' ? '#2563EB' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Тыңдармандар (≥ 1 мин)
              </button>
              <button
                type="button"
                onClick={() => updateFilters('READERS', scope, selectedMonthKey)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: tierFilter === 'READERS' ? '#059669' : '#E2E8F0',
                  background: tierFilter === 'READERS' ? '#ECFDF5' : '#FFFFFF',
                  color: tierFilter === 'READERS' ? '#059669' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Оқырмандар (≥ 15 мин)
              </button>
              <button
                type="button"
                onClick={() => updateFilters('ACTIVES', scope, selectedMonthKey)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: tierFilter === 'ACTIVES' ? '#D97706' : '#E2E8F0',
                  background: tierFilter === 'ACTIVES' ? '#FFFBEB' : '#FFFFFF',
                  color: tierFilter === 'ACTIVES' ? '#D97706' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Белсенділер (≥ 1 сағ)
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Оқырманды іздеу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: '12px',
                border: '1.5px solid #E2E8F0',
                fontSize: '12.5px',
                outline: 'none',
                background: '#F8FAFC',
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
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
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

        {/* Counter header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
            {tierFilter === 'LISTENERS'
              ? 'Тыңдармандар'
              : tierFilter === 'READERS'
              ? 'Оқырмандар'
              : 'Белсенділер'}{' '}
            ({scope === 'MONTH' ? formatMonthLabel(selectedMonthKey) : 'Барлық уақытта'}):
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
            Табылды: <strong style={{ color: '#0F172A' }}>{filteredMembers.length} адам</strong>
          </div>
        </div>

        {/* Audience List / Grid */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.5px solid #E2E8F0',
              padding: '60px 20px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👤</div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              {searchQuery ? 'Іздеу бойынша оқырман табылмады' : 'Бұл санатта әзірге оқырман жоқ'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              {tierFilter === 'LISTENERS'
                ? 'Кемінде 1 минут тыңдаған оқырмандар осы тізімге кіреді'
                : tierFilter === 'READERS'
                ? 'Кемінде 15 минут тыңдаған оқырмандар осы тізімге кіреді'
                : 'Кемінде 1 сағат тыңдаған тұрақты оқырмандар осы тізімге кіреді'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {filteredMembers.map((member) => (
              <div
                key={member.userId}
                onClick={() => handleReaderClick(member.userId)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#93C5FD';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(37, 99, 235, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.03)';
                }}
              >
                <div>
                  {/* Top user header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          background: '#F1F5F9',
                          border: '1.5px solid #E2E8F0',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          color: '#475569',
                          fontSize: '15px',
                        }}
                      >
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          member.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14.5px', fontWeight: 900, color: '#0F172A' }}>
                            {member.name}
                          </span>
                          {member.idNumber && (
                            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                              ID: {member.idNumber}
                            </span>
                          )}
                        </div>
                        {member.username && (
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--blue)' }}>
                            @{member.username}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#94A3B8' }}>📧</span>
                      <span>{member.email}</span>
                    </div>
                    {member.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#94A3B8' }}>📞</span>
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom stats row */}
                <div
                  style={{
                    borderTop: '1.5px solid #F1F5F9',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Осы кітапты тыңдады:</div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 900,
                        color:
                          tierFilter === 'LISTENERS'
                            ? '#2563EB'
                            : tierFilter === 'READERS'
                            ? '#059669'
                            : '#D97706',
                      }}
                    >
                      {member.formattedDuration}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      color: 'var(--blue)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Толық статистикасы →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
