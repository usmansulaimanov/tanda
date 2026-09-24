import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useQuoteStore } from '../../store/useQuoteStore';
import { useNewsStore } from '../../store/useNewsStore';
import { useToastStore } from '../../store/useToastStore';
import { hasAdminPermission } from '../../utils/permissions';
import heroReadingImg from '../../assets/hero-reading.jpg';

export const AdminHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, isAuthInitialized } = useAuthStore();
  const { books } = useBookStore();
  const { quotes } = useQuoteStore();
  const { articles } = useNewsStore();
  const { showToast } = useToastStore();

  // Auth protection guard
  React.useEffect(() => {
    if (!isAuthInitialized) return;
    if (!user || (role !== 'admin' && !user.isSuperAdmin)) {
      showToast('Бұл бетке кіру үшін әкімші рұқсаты қажет', 'error');
      navigate('/login?redirect=/admin/home', { replace: true });
    }
  }, [isAuthInitialized, user, role, navigate, showToast]);

  // Determine user title and duty
  const isSuperAdmin = Boolean(user?.isSuperAdmin || (role === 'admin' && !user?.duty));
  const displayRoleTitle = isSuperAdmin
    ? 'Админ'
    : user?.duty?.trim() || 'Әкімші көмекшісі';

  const userDisplayName = user?.name || (isSuperAdmin ? 'Әкімші' : 'Көмекші');

  // Permissions check for quick access tiles
  const canViewBooks = hasAdminPermission(user, 'books_view');
  const canCreateBooks = hasAdminPermission(user, 'books_create');
  const canViewReaders = hasAdminPermission(user, 'readers_view');
  const canManagePromos = hasAdminPermission(user, 'promocodes_manage');
  const canManageQuotes = hasAdminPermission(user, 'quotes_manage');
  const canManageMessages = hasAdminPermission(user, 'messages_manage');
  const canManageNews = hasAdminPermission(user, 'news_manage');
  const canViewStats = hasAdminPermission(user, 'analytics_view');
  const canManageManagers = hasAdminPermission(user, 'managers_manage');

  // Current formatted date as DD.MM.YYYY.
  const todayFormatted = useMemo(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}.${month}.${year}.`;
  }, []);

  if (!isAuthInitialized || !user) {
    return null;
  }

  return (
    <div className="admin-home-wrapper" style={{ minHeight: 'calc(100vh - 70px)', background: '#F8FAFC' }}>
      {/* HERO / LANDING SECTION */}
      <section
        className="hero"
        style={{
          position: 'relative',
          padding: '48px 24px 60px',
          minHeight: '420px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Background cover image with gradient overlay */}
        <div className="hero-bg-cover">
          <img
            src={heroReadingImg}
            alt="Tanda Admin"
            className="hero-bg-cover-img"
            loading="eager"
          />
          <div className="hero-bg-cover-overlay" />
        </div>

        <div
          className="hero-container"
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <div style={{ maxWidth: '720px' }}>
            {/* Role / Duty Badge */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 16px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, var(--orange) 0%, #D96B00 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 14px rgba(239, 126, 0, 0.4)',
                }}
              >
                <span>{displayRoleTitle}</span>
              </div>

              {todayFormatted && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.18)',
                    backdropFilter: 'blur(8px)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}
                >
                  {todayFormatted}
                </div>
              )}
            </div>

            {/* User Name Greeting */}
            <h1
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.15,
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              }}
            >
              Қош келдіңіз, {userDisplayName}!
            </h1>

            {/* ID Subtitle */}
            {user?.idNumber && (
              <div
                style={{
                  fontSize: '15px',
                  color: 'rgba(255, 255, 255, 0.88)',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                }}
              >
                <span>ID: {user.idNumber}</span>
              </div>
            )}

            <p
              style={{
                fontSize: '15px',
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.88)',
                maxWidth: '560px',
                margin: '0 0 28px 0',
              }}
            >
              {isSuperAdmin
                ? 'Tanda платформасын толық басқару орталығы. Төмендегі бөлімдер арқылы кітаптар қорын, оқырмандарды және жүйелік параметрлерді басқара аласыз.'
                : 'Сіздің көмекші кабинетіңізге қош келдіңіз! Өзіңізге жүктелген міндеттер мен бөлімдерді төмендегі батырмалар арқылы басқарыңыз.'}
            </p>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {canViewBooks && (
                <Link
                  to="/admin"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 22px',
                    borderRadius: '12px',
                    background: '#FFFFFF',
                    color: 'var(--blue)',
                    fontWeight: 700,
                    fontSize: '14px',
                    textDecoration: 'none',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                    <path d="M6 6h10"></path>
                    <path d="M6 10h10"></path>
                  </svg>
                  <span>Кітаптар қоры</span>
                </Link>
              )}

              {canCreateBooks && (
                <Link
                  to="/admin/books/new"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 22px',
                    borderRadius: '12px',
                    background: 'var(--orange)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    textDecoration: 'none',
                    boxShadow: '0 6px 20px rgba(239, 126, 0, 0.35)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Жаңа кітап қосу</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACCESS TILES SECTION */}
      <section style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '36px 24px 60px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
            Қолжетімді басқару бөлімдері
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', margin: '4px 0 0 0' }}>
            Сіздің рөліңізге берілген құқықтар бойынша навигация
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {canViewBooks && (
            <Link
              to="/admin"
              style={{
                textDecoration: 'none',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                    <path d="M6 6h10"></path>
                    <path d="M6 10h10"></path>
                  </svg>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '4px 10px', borderRadius: '20px' }}>
                  {books.length} кітап
                </span>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Кітаптар қоры
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                  Барлық кітаптарды, аудиофайлдарды қарау және өңдеу
                </div>
              </div>
            </Link>
          )}

          {canViewReaders && (
            <Link
              to="/admin/readers"
              style={{
                textDecoration: 'none',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#F0FDF4',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '4px 10px', borderRadius: '20px' }}>
                  Оқырмандар
                </span>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Оқырмандар базасы
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                  Тіркелген оқырмандар тізімі және олардың профильдері
                </div>
              </div>
            </Link>
          )}

          {canManagePromos && (
            <Link
              to="/admin/promocodes"
              style={{
                textDecoration: 'none',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#FEF3C7',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Промокодтар
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                  Жеңілдік және акциялық промокодтарды жасау, басқару
                </div>
              </div>
            </Link>
          )}

          {canManageQuotes && (
            <Link
              to="/admin/quotes"
              style={{
                textDecoration: 'none',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#F3E8FF',
                    color: '#9333EA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                  </svg>
                </div>
                {quotes.length > 0 && (
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#9333EA', background: '#F3E8FF', padding: '4px 10px', borderRadius: '20px' }}>
                    {quotes.length} цитата
                  </span>
                )}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Цитаталар
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                  Кітаптардан шабыттандыратын үзінділер мен цитаталар
                </div>
              </div>
            </Link>
          )}

          {canManageMessages && (
            <Link
              to="/admin/messages"
              style={{
                textDecoration: 'none',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#E0F2FE',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Хабарламалар
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                  Оқырмандарға жеке хабарламалар жіберу жүйесі
                </div>
              </div>
            </Link>
          )}

          {canManageNews && (
            <Link
              to="/admin/news"
              style={{
                textDecoration: 'none',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#FFF1F2',
                    color: '#E11D48',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
                  </svg>
                </div>
                {articles.length > 0 && (
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#E11D48', background: '#FFF1F2', padding: '4px 10px', borderRadius: '20px' }}>
                    {articles.length} мақала
                  </span>
                )}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Жаңалықтар
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                  Платформа жаңалықтары мен мақалаларын жариялау
                </div>
              </div>
            </Link>
          )}

          {canViewStats && (
            <Link
              to="/admin/stats"
              style={{
                textDecoration: 'none',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Статистика
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                  Қолданушылар белсенділігі мен тыңдау көрсеткіштері
                </div>
              </div>
            </Link>
          )}

          {canManageManagers && (
            <Link
              to="/admin/managers"
              style={{
                textDecoration: 'none',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                  Басқару (Көмекшілер)
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                  Көмекшілер аккаунттарын, міндеттерін және рұқсаттарын басқару
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};
