import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { usePromoStore, getPromoAccessDurationDays } from '../../store/usePromoStore';
import { useToastStore } from '../../store/useToastStore';
import { User } from '../../types';
import { hasAdminPermission } from '../../utils/permissions';
import { api } from '../../lib/api';

const USERS_REGISTRY_KEY = 'tanda_users_registry_v1';

function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return [];
}

type StatTab = 'readers' | 'books' | 'authors' | 'subscriptions';

const ALL_SYSTEM_CATEGORIES = [
  'Көркем әдебиет',
  'Детектив',
  'Романтика',
  'Фэнтези',
  'Фантастика',
  'Мистика және хоррор',
  'Психология',
  'Өзін-өзі дамыту',
  'Бизнес және қаржы',
  'Тарих',
  'Руханият және философия',
  'Білім және ғылым',
  'Балалар әдебиеті',
  'Жасөспірімдер әдебиеті',
  'Өмірбаян және мемуар',
];

export const AdminStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const { books, fetchBooks } = useBookStore();
  const { batches, promocodes } = usePromoStore();
  const { showToast } = useToastStore();

  const canViewStats = hasAdminPermission(user, 'analytics_view');

  const [activeTab, setActiveTab] = useState<StatTab>('readers');
  const [readers, setReaders] = useState<User[]>([]);
  const [isLoadingReaders, setIsLoadingReaders] = useState(false);
  const [authorSearchQuery, setAuthorSearchQuery] = useState('');
  const [bookSearchQuery, setBookSearchQuery] = useState('');

  useEffect(() => {
    if (role !== 'admin' || !canViewStats) {
      showToast('Статистика бөліміне кіруге рұқсатыңыз жоқ', 'error');
      navigate('/admin', { replace: true });
    }
  }, [role, canViewStats, navigate, showToast]);

  useEffect(() => {
    fetchBooks({ includeArchived: true });
  }, [fetchBooks]);

  const refreshReaders = React.useCallback(() => {
    setIsLoadingReaders(true);
    try {
      const localUsers = getStoredUsers().filter((u) => u.role === 'client');
      setReaders(localUsers);
    } catch {}

    api
      .get('/api/admin/users', { params: { role: 'client' } })
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          setReaders(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingReaders(false);
      });
  }, []);

  useEffect(() => {
    refreshReaders();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === USERS_REGISTRY_KEY || !e.key) {
        refreshReaders();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', refreshReaders);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', refreshReaders);
    };
  }, [refreshReaders]);

  useEffect(() => {
    if (activeTab === 'readers') {
      refreshReaders();
    }
  }, [activeTab, refreshReaders]);

  // 1. READERS STATS
  const totalReaders = readers.length;

  // Active premium calculation (either isPremium is true or active in promocodes)
  const premiumUserIds = useMemo(() => {
    const ids = new Set<string>();
    readers.forEach((r) => {
      if (r.isPremium) ids.add(r.id);
    });
    promocodes.forEach((p) => {
      if (p.usedBy && p.usedBy.length > 0) {
        const isExp = new Date(p.expiresAt) < new Date();
        if (p.isActive && !isExp) {
          p.usedBy.forEach((u) => ids.add(u.userId));
        }
      }
    });
    return ids;
  }, [readers, promocodes]);

  const premiumReadersCount = useMemo(() => {
    return readers.filter((r) => r.isPremium || premiumUserIds.has(r.id)).length;
  }, [readers, premiumUserIds]);

  const freeReadersCount = Math.max(0, totalReaders - premiumReadersCount);
  const blockedReadersCount = useMemo(() => readers.filter((r) => r.isActive === false).length, [readers]);

  // Gender Breakdown
  const femaleCount = useMemo(() => readers.filter((r) => r.gender === 'female').length, [readers]);
  const maleCount = useMemo(() => readers.filter((r) => r.gender === 'male').length, [readers]);
  const unspecifiedGenderCount = useMemo(
    () => readers.filter((r) => !r.gender || r.gender === 'other').length,
    [readers]
  );

  const femalePct = totalReaders > 0 ? Math.round((femaleCount / totalReaders) * 100) : 0;
  const malePct = totalReaders > 0 ? Math.round((maleCount / totalReaders) * 100) : 0;
  const unspecifiedGenderPct = totalReaders > 0 ? Math.max(0, 100 - femalePct - malePct) : 0;

  // Birthday & Age Breakdown
  const withBirthdayCount = useMemo(
    () => readers.filter((r) => Boolean(r.birthDate && r.birthDate.trim())).length,
    [readers]
  );
  const withoutBirthdayCount = Math.max(0, totalReaders - withBirthdayCount);

  const ageStats = useMemo(() => {
    let under18 = 0;
    let age18to24 = 0;
    let age25to34 = 0;
    let age35to44 = 0;
    let age45plus = 0;
    let unknownAge = 0;

    const currentYear = new Date().getFullYear();

    readers.forEach((r) => {
      if (!r.birthDate) {
        unknownAge++;
        return;
      }
      let birthYear: number | null = null;
      if (r.birthDate.includes('.')) {
        const p = r.birthDate.split('.');
        if (p.length === 3) birthYear = parseInt(p[2], 10);
      } else if (r.birthDate.includes('-')) {
        const p = r.birthDate.split('-');
        if (p.length === 3) birthYear = parseInt(p[0], 10);
      }

      if (!birthYear || isNaN(birthYear) || birthYear < 1920 || birthYear > currentYear) {
        unknownAge++;
        return;
      }

      const age = currentYear - birthYear;
      if (age < 18) under18++;
      else if (age <= 24) age18to24++;
      else if (age <= 34) age25to34++;
      else if (age <= 44) age35to44++;
      else age45plus++;
    });

    return { under18, age18to24, age25to34, age35to44, age45plus, unknownAge };
  }, [readers]);

  // 2. BOOKS STATS
  const totalBooksCount = books.length;
  const activeBooksCount = useMemo(() => books.filter((b) => !b.isArchived).length, [books]);
  const archivedBooksCount = useMemo(() => books.filter((b) => b.isArchived).length, [books]);
  const freeBooksCount = useMemo(() => books.filter((b) => b.isFree).length, [books]);
  const premiumBooksCount = useMemo(() => books.filter((b) => !b.isFree).length, [books]);
  const audioBooksCount = useMemo(() => books.filter((b) => b.hasAudio).length, [books]);

  // Categories Breakdown
  const categoriesMap = useMemo(() => {
    const map: Record<string, number> = {};
    books.forEach((b) => {
      const cat = b.category || 'Санатсыз';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({
        name,
        count,
        pct: totalBooksCount > 0 ? Math.round((count / totalBooksCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [books, totalBooksCount]);

  // All system genres/categories statistics
  const allGenreStats = useMemo(() => {
    const list = [...ALL_SYSTEM_CATEGORIES];
    books.forEach((b) => {
      if (b.category && !list.includes(b.category) && b.category !== 'Санатсыз') {
        list.push(b.category);
      }
      if (Array.isArray(b.categories)) {
        b.categories.forEach((c) => {
          if (c && !list.includes(c) && c !== 'Санатсыз') list.push(c);
        });
      }
    });

    return list.map((name) => {
      const count = books.filter((b) => {
        if (b.category === name) return true;
        if (Array.isArray(b.categories) && b.categories.includes(name)) return true;
        return false;
      }).length;
      const pct = totalBooksCount > 0 ? Math.round((count / totalBooksCount) * 100) : 0;
      return { name, count, pct };
    });
  }, [books, totalBooksCount]);

  // Filtered books list for table
  const filteredBooksList = useMemo(() => {
    if (!bookSearchQuery.trim()) return books.slice(0, 15);
    const q = bookSearchQuery.toLowerCase().trim();
    return books.filter((b) => {
      return (
        (b.title || '').toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.category || '').toLowerCase().includes(q)
      );
    });
  }, [books, bookSearchQuery]);

  // 3. AUTHORS STATS
  const authorsStatsList = useMemo(() => {
    const map: Record<
      string,
      { name: string; totalBooks: number; audioBooks: number; premiumBooks: number; freeBooks: number; categories: Set<string> }
    > = {};

    books.forEach((b) => {
      const rawAuthor = b.author?.trim() || 'Белгісіз автор';
      if (!map[rawAuthor]) {
        map[rawAuthor] = {
          name: rawAuthor,
          totalBooks: 0,
          audioBooks: 0,
          premiumBooks: 0,
          freeBooks: 0,
          categories: new Set<string>(),
        };
      }
      map[rawAuthor].totalBooks += 1;
      if (b.hasAudio) map[rawAuthor].audioBooks += 1;
      if (b.isFree) map[rawAuthor].freeBooks += 1;
      else map[rawAuthor].premiumBooks += 1;
      if (b.category) map[rawAuthor].categories.add(b.category);
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        categoriesList: Array.from(item.categories).join(', '),
      }))
      .sort((a, b) => b.totalBooks - a.totalBooks || a.name.localeCompare(b.name));
  }, [books]);

  const uniqueAuthorsCount = authorsStatsList.length;
  const authorsWithAudioCount = useMemo(() => authorsStatsList.filter((a) => a.audioBooks > 0).length, [authorsStatsList]);
  const avgBooksPerAuthor = uniqueAuthorsCount > 0 ? (totalBooksCount / uniqueAuthorsCount).toFixed(1) : '0';
  const topAuthor = authorsStatsList[0];

  const filteredAuthorsList = useMemo(() => {
    if (!authorSearchQuery.trim()) return authorsStatsList;
    const q = authorSearchQuery.toLowerCase().trim();
    return authorsStatsList.filter((a) => a.name.toLowerCase().includes(q) || a.categoriesList.toLowerCase().includes(q));
  }, [authorsStatsList, authorSearchQuery]);

  // 4. SUBSCRIPTIONS & PROMOCODES STATS
  const totalPromocodesCount = promocodes.length;
  const totalUsedPromocodesCount = useMemo(
    () => promocodes.reduce((acc, p) => acc + (p.usedCount || 0), 0),
    [promocodes]
  );
  const activeUnusedPromocodesCount = useMemo(() => {
    return promocodes.filter((p) => {
      const isExp = new Date(p.expiresAt) < new Date();
      return p.isActive && !isExp && p.usedCount < p.maxUses;
    }).length;
  }, [promocodes]);

  const totalBatchesCount = batches.length;

  // Subscription plan breakdown
  const subscriptionPlansBreakdown = useMemo(() => {
    let sub1m = 0;
    let sub3m = 0;
    let sub6m = 0;
    let sub1y = 0;
    let subInfinite = 0;
    let other = 0;

    promocodes.forEach((p) => {
      const dur = getPromoAccessDurationDays(p);
      if (dur === 'infinite') subInfinite++;
      else if (dur >= 365) sub1y++;
      else if (dur >= 180) sub6m++;
      else if (dur >= 90) sub3m++;
      else if (dur >= 30) sub1m++;
      else other++;
    });

    return [
      { label: '1 айлық тариф (30 күн)', count: sub1m, color: '#3B82F6' },
      { label: '3 айлық тариф (90 күн)', count: sub3m, color: '#10B981' },
      { label: '6 айлық тариф (180 күн)', count: sub6m, color: '#F59E0B' },
      { label: '1 жылдық тариф (365 күн)', count: sub1y, color: '#8B5CF6' },
      { label: 'Мәңгілік / Шектеусіз Премиум', count: subInfinite, color: '#EC4899' },
      ...(other > 0 ? [{ label: 'Басқа арнайы мерзімдер', count: other, color: '#64748B' }] : []),
    ];
  }, [promocodes]);

  // Recent promo activations history
  const recentPromoActivations = useMemo(() => {
    const list: {
      promoCode: string;
      rewardTitle: string;
      userName: string;
      userEmail: string;
      usedAt: string;
    }[] = [];

    promocodes.forEach((p) => {
      if (p.usedBy && Array.isArray(p.usedBy)) {
        p.usedBy.forEach((u) => {
          list.push({
            promoCode: p.code,
            rewardTitle: p.rewardTitle,
            userName: u.userName || 'Оқырман',
            userEmail: u.userEmail,
            usedAt: u.usedAt,
          });
        });
      }
    });

    return list.sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime());
  }, [promocodes]);

  return (
    <section className="admin-page-section" id="admin-stats-section">
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
        
        {/* Top Header Card */}
        <div
          className="admin-card"
          style={{
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '16px',
            padding: '16px 20px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#FFFFFF' }}>
              Статистика және көрсеткіштер
            </h1>
          </div>

          {/* Quick Metrics Bar in Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 700 }}>Оқырмандар</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#38BDF8', marginTop: '2px' }}>
                {isLoadingReaders ? '...' : totalReaders}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 700 }}>Кітаптар</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#4ADE80', marginTop: '2px' }}>
                {totalBooksCount}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 700 }}>Авторлар</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#C084FC', marginTop: '2px' }}>
                {uniqueAuthorsCount}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 700 }}>Подпискалар</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#FBBF24', marginTop: '2px' }}>
                {premiumReadersCount}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: '#FFFFFF',
            padding: '8px',
            borderRadius: '16px',
            marginBottom: '24px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('readers')}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '12px 18px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'readers' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'readers' ? '#FFFFFF' : '#475569',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Оқырмандар</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('books')}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '12px 18px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'books' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'books' ? '#FFFFFF' : '#475569',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
            <span>Кітаптар</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('authors')}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '12px 18px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'authors' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'authors' ? '#FFFFFF' : '#475569',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>Авторлар</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '12px 18px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'subscriptions' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'subscriptions' ? '#FFFFFF' : '#475569',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <span>Подпискалар</span>
          </button>
        </div>

        {/* TAB 1: ОҚЫРМАНДАР (READERS STATS) */}
        {activeTab === 'readers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 2x2 Uniform Grid for 4 Analytics Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
                gap: '20px',
                alignItems: 'stretch',
              }}
            >
              {/* 1. General Reader Metrics Table */}
              <div className="admin-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '14px', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 18px', background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                    Оқырмандардың жалпы көрсеткіштері
                  </h3>
                </div>

                <div style={{ overflowX: 'auto', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <table className="admin-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '2.5px solid #94A3B8' }}>Барлығы</th>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>Премиум</th>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>Стандарт</th>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>Бұғатталған</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '12px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{totalReaders}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{premiumReadersCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{freeReadersCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{blockedReadersCount}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '10px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            100%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((premiumReadersCount / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((freeReadersCount / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((blockedReadersCount / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Birthday Stats Card */}
              <div className="admin-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '14px', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 18px', background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                    Туған күн көрсеткіші
                  </h3>
                </div>

                <div style={{ overflowX: 'auto', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <table className="admin-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '33.33%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '2.5px solid #94A3B8' }}>Барлығы</th>
                        <th style={{ width: '33.33%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>Белгілеген</th>
                        <th style={{ width: '33.33%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>Белгілемеген</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '12px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{totalReaders}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{withBirthdayCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{withoutBirthdayCount}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '10px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            100%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((withBirthdayCount / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((withoutBirthdayCount / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Gender Distribution Table */}
              <div className="admin-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '14px', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 18px', background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                    Жынысы бойынша оқырмандар бөлінісі
                  </h3>
                </div>

                <div style={{ overflowX: 'auto', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <table className="admin-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '2.5px solid #94A3B8' }}>Барлығы</th>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>Әйелдер</th>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>Ерлер</th>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>Көрсетілмеген</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '12px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{totalReaders}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{femaleCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{maleCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{unspecifiedGenderCount}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '10px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            100%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {femalePct}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {malePct}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {unspecifiedGenderPct}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Age Stats Card */}
              <div className="admin-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '14px', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 18px', background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                    Оқырмандардың жас шамасы
                  </h3>
                </div>

                <div style={{ overflowX: 'auto', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <table className="admin-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '20%', padding: '12px 10px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>&lt;18 жас</th>
                        <th style={{ width: '20%', padding: '12px 10px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>18–24 жас</th>
                        <th style={{ width: '20%', padding: '12px 10px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>25–34 жас</th>
                        <th style={{ width: '20%', padding: '12px 10px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>35–44 жас</th>
                        <th style={{ width: '20%', padding: '12px 10px', color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>45+ жас</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '12px 10px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{ageStats.under18}</span>
                        </td>
                        <td style={{ padding: '12px 10px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{ageStats.age18to24}</span>
                        </td>
                        <td style={{ padding: '12px 10px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{ageStats.age25to34}</span>
                        </td>
                        <td style={{ padding: '12px 10px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{ageStats.age35to44}</span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{ageStats.age45plus}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '10px 10px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((ageStats.under18 / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((ageStats.age18to24 / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((ageStats.age25to34 / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((ageStats.age35to44 / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalReaders > 0 ? Math.round((ageStats.age45plus / totalReaders) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Button to full Readers Management Panel */}
            <div
              className="admin-card"
              style={{
                padding: '28px 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  Оқырмандарды басқару панелі
                </h3>
              </div>

              <Link
                to="/admin/readers"
                className="btn-primary"
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 84, 148, 0.2)',
                }}
              >
                <span>Оқырмандар панеліне өту</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
            </div>

          </div>
        )}

        {/* TAB 2: КІТАПТАР (BOOKS STATS) */}
        {activeTab === 'books' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top Grid: General Book Metrics & Audio indicator */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
                gap: '20px',
                alignItems: 'stretch',
              }}
            >
              {/* 1. General Book Metrics Table */}
              <div className="admin-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '14px', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 18px', background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                    Кітаптардың жалпы көрсеткіштері
                  </h3>
                </div>

                <div style={{ overflowX: 'auto', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <table className="admin-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '2.5px solid #94A3B8' }}>Барлығы</th>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>Премиум</th>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>Тегін</th>
                        <th style={{ width: '25%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>Архивте</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '12px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{totalBooksCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{premiumBooksCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{freeBooksCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{archivedBooksCount}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '10px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            100%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalBooksCount > 0 ? Math.round((premiumBooksCount / totalBooksCount) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalBooksCount > 0 ? Math.round((freeBooksCount / totalBooksCount) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalBooksCount > 0 ? Math.round((archivedBooksCount / totalBooksCount) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Audio indicator Table */}
              <div className="admin-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '14px', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 18px', background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                    Аудио нұсқа көрсеткіші
                  </h3>
                </div>

                <div style={{ overflowX: 'auto', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <table className="admin-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '33.33%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '2.5px solid #94A3B8' }}>Барлығы</th>
                        <th style={{ width: '33.33%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800, borderRight: '1px solid #E2E8F0' }}>Аудио бар</th>
                        <th style={{ width: '33.33%', padding: '12px 14px', color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>Аудио жоқ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '12px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{totalBooksCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{audioBooksCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{Math.max(0, totalBooksCount - audioBooksCount)}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '10px 14px', borderRight: '2.5px solid #94A3B8' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            100%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderRight: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalBooksCount > 0 ? Math.round((audioBooksCount / totalBooksCount) * 100) : 0}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {totalBooksCount > 0 ? Math.round(((totalBooksCount - audioBooksCount) / totalBooksCount) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 3. Full Genres & Categories Breakdown Table Card */}
            <div
              className="admin-card"
              style={{
                padding: '0',
                overflow: 'hidden',
                borderRadius: '14px',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '12px 18px', background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  Жанрлар мен санаттар бөлінісі
                </h3>
              </div>

              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="admin-table" style={{ width: '100%', minWidth: '1200px', margin: 0, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {allGenreStats.map((cat, idx) => (
                        <th
                          key={cat.name}
                          style={{
                            padding: '12px 14px',
                            color: '#0F172A',
                            fontSize: '13px',
                            fontWeight: 800,
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            borderRight: idx < allGenreStats.length - 1 ? '1px solid #E2E8F0' : 'none',
                          }}
                        >
                          {cat.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {allGenreStats.map((cat, idx) => (
                        <td
                          key={cat.name}
                          style={{
                            padding: '12px 14px',
                            textAlign: 'center',
                            borderRight: idx < allGenreStats.length - 1 ? '1px solid #E2E8F0' : 'none',
                          }}
                        >
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{cat.count}</span>
                        </td>
                      ))}
                    </tr>

                    <tr>
                      {allGenreStats.map((cat, idx) => (
                        <td
                          key={cat.name}
                          style={{
                            padding: '10px 14px',
                            textAlign: 'center',
                            borderRight: idx < allGenreStats.length - 1 ? '1px solid #E2E8F0' : 'none',
                          }}
                        >
                          <span style={{ color: '#0F172A', fontSize: '13px', fontWeight: 800 }}>
                            {cat.pct}%
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Button to full Books Management Panel */}
            <div
              className="admin-card"
              style={{
                padding: '28px 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  Кітаптарды басқару панелі
                </h3>
              </div>

              <Link
                to="/admin"
                className="btn-primary"
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 84, 148, 0.2)',
                }}
              >
                <span>Кітаптар панеліне өту</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
            </div>

          </div>
        )}

        {/* TAB 3: АВТОРЛАР (AUTHORS STATS) */}
        {activeTab === 'authors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="admin-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-mid)' }}>Барлық авторлар</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-dark)' }}>{uniqueAuthorsCount}</div>
                <div style={{ fontSize: '12px', color: '#6366F1', marginTop: '6px', fontWeight: 600 }}>
                  Тіркелген бірегей авторлар
                </div>
              </div>

              <div className="admin-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-mid)' }}>Орташа кітап/автор</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0, 84, 148, 0.1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-dark)' }}>{avgBooksPerAuthor}</div>
                <div style={{ fontSize: '12px', color: 'var(--blue)', marginTop: '6px', fontWeight: 600 }}>
                  Әр авторға шаққандағы кітап
                </div>
              </div>

              <div className="admin-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-mid)' }}>Аудиосы бар авторлар</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 126, 0, 0.12)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-dark)' }}>{authorsWithAudioCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--orange)', marginTop: '6px', fontWeight: 600 }}>
                  Дауысталған кітап авторлары
                </div>
              </div>

              <div className="admin-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-mid)' }}>Көшбасшы автор</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="7"></circle>
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topAuthor ? topAuthor.name : '—'}
                </div>
                <div style={{ fontSize: '12px', color: '#10B981', marginTop: '6px', fontWeight: 700 }}>
                  {topAuthor ? `${topAuthor.totalBooks} кітабы бар` : 'Дерек жоқ'}
                </div>
              </div>
            </div>

            {/* Authors Ranking Table */}
            <div className="admin-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: '0 0 4px 0' }}>
                    ✍️ Авторлар рейтингі мен көрсеткіштері
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0 }}>
                    Кітаптар саны және жанрлық қамтылуы бойынша авторлар тізімі
                  </p>
                </div>

                <input
                  type="text"
                  value={authorSearchQuery}
                  onChange={(e) => setAuthorSearchQuery(e.target.value)}
                  placeholder="Авторды немесе жанрды іздеу..."
                  className="form-input"
                  style={{ padding: '8px 14px', fontSize: '13px', width: '260px' }}
                />
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Автор</th>
                      <th>Жалпы кітаптар</th>
                      <th>Премиум</th>
                      <th>Тегін</th>
                      <th>Аудиокітаптар</th>
                      <th>Негізгі санаттары</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuthorsList.map((a, idx) => (
                      <tr key={a.name}>
                        <td style={{ fontWeight: 800, color: 'var(--blue)' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>{a.name}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 900, color: 'var(--text-dark)' }}>{a.totalBooks}</span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{a.premiumBooks}</span>
                        </td>
                        <td>
                          <span style={{ color: '#16A34A', fontWeight: 700 }}>{a.freeBooks}</span>
                        </td>
                        <td>
                          {a.audioBooks > 0 ? (
                            <span style={{ color: '#6366F1', fontWeight: 700 }}>🎧 {a.audioBooks}</span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: '#475569' }}>
                            {a.categoriesList || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: ПОДПИСКАЛАР (SUBSCRIPTIONS STATS) */}
        {activeTab === 'subscriptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="admin-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-mid)' }}>Белсенді Премиумдар</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 126, 0, 0.12)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-dark)' }}>{premiumReadersCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--orange)', marginTop: '6px', fontWeight: 700 }}>
                  Қазіргі белсенді жазылушылар
                </div>
              </div>

              <div className="admin-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-mid)' }}>Қолданылған промокодтар</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-dark)' }}>{totalUsedPromocodesCount}</div>
                <div style={{ fontSize: '12px', color: '#10B981', marginTop: '6px', fontWeight: 600 }}>
                  Сәтті белсендірілген
                </div>
              </div>

              <div className="admin-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-mid)' }}>Жарамды промокодтар</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0, 84, 148, 0.1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-dark)' }}>{activeUnusedPromocodesCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--blue)', marginTop: '6px', fontWeight: 600 }}>
                  Әлі қолданылмаған
                </div>
              </div>

              <div className="admin-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-mid)' }}>Топтамалар (Батчтар)</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-dark)' }}>{totalBatchesCount}</div>
                <div style={{ fontSize: '12px', color: '#6366F1', marginTop: '6px', fontWeight: 600 }}>
                  Шығарылған пакеттер
                </div>
              </div>
            </div>

            {/* Plans Breakdown */}
            <div className="admin-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: '0 0 4px 0' }}>
                    🎟️ Тарифтер мен жазылым мерзімдері
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0 }}>
                    Шығарылған промокодтар мен жазылым пакеттерінің мерзімдік үлесі
                  </p>
                </div>
                <Link
                  to="/admin/promocodes"
                  style={{
                    background: 'var(--blue)',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Промокодтарды басқару →
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {subscriptionPlansBreakdown.map((plan) => (
                  <div
                    key={plan.label}
                    style={{
                      background: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '14px',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: plan.color }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{plan.label}</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: plan.color }}>
                      {plan.count} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>промокод</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activations History Table */}
            <div className="admin-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-dark)', margin: '0 0 4px 0' }}>
                  Соңғы белсендірілген жазылымдар (Тарих)
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-mid)' }}>
                  Оқырмандар белсендірген промокодтардың уақыты мен деректері
                </span>
              </div>

              {recentPromoActivations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#64748B', fontSize: '14px' }}>
                  Әзірге белсендірілген промокодтар жоқ
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Оқырман</th>
                        <th>Email</th>
                        <th>Промокод</th>
                        <th>Тариф / Сыйлық</th>
                        <th>Қолданылған уақыты</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPromoActivations.slice(0, 20).map((act, idx) => (
                        <tr key={`${act.promoCode}-${idx}`}>
                          <td>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{act.userName}</span>
                          </td>
                          <td>
                            <span style={{ color: '#64748B' }}>{act.userEmail}</span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--blue)' }}>
                              {act.promoCode}
                            </span>
                          </td>
                          <td>
                            <span style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                              {act.rewardTitle}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '13px', color: '#475569' }}>
                              {new Date(act.usedAt).toLocaleString('kk-KZ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </section>
  );
};
