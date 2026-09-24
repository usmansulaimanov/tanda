import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import heroReadingImg from '../../assets/hero-reading.jpg';

export const AuthorHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, isAuthInitialized } = useAuthStore();
  const { showToast } = useToastStore();

  const isAuthor = Boolean(role === 'author' || user?.isAuthor || user?.role === 'author');
  const isSuperAdmin = Boolean(user?.isSuperAdmin || (role === 'admin' && !user?.duty));

  const userDisplayName = user?.assignedAuthorName || user?.name || 'Автор';

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
    <div className="author-home-wrapper" style={{ minHeight: 'calc(100vh - 70px)', background: '#F8FAFC' }}>
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
            alt="Tanda Author"
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
            {/* Role Badge */}
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
                <span>Автор</span>
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

            {/* Author Name Greeting */}
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
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontFamily: 'monospace',
                  marginBottom: '14px',
                  letterSpacing: '0.05em',
                }}
              >
                ID: {user.idNumber}
              </div>
            )}

            <p
              style={{
                fontSize: '15px',
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.6,
                margin: '0 0 24px 0',
                maxWidth: '560px',
              }}
            >
              Сіздің авторлық кабинетіңізге қош келдіңіз! Авторлық статистикаңыз бен кітаптарыңызды осы жерден бақылай аласыз.
            </p>

            {/* Quick Action Button */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                to="/author/stats"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 28px',
                  borderRadius: '50px',
                  fontWeight: 800,
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(239, 126, 0, 0.35)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span>Авторлық статистика</span>
              </Link>

              <Link
                to="/author/books"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '50px',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#FFFFFF',
                  background: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(8px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.35)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                  <path d="M6 6h10"></path>
                  <path d="M6 10h10"></path>
                </svg>
                <span>Кітаптарым</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACCESS CARDS GRID */}
      <section style={{ maxWidth: '1200px', margin: '-30px auto 48px', padding: '0 24px', position: 'relative', zIndex: 3 }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
            Қолжетімді бөлімдер
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Авторлық функционал бойынша навигация
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {/* 1. Author Stats */}
          <Link
            to="/author/stats"
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
                  background: '#FFF7ED',
                  color: 'var(--orange)',
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
                Авторлық статистика
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                Тыңдалымдар, оқырмандар саны және роялти табысы
              </div>
            </div>
          </Link>

          {/* 2. My Books */}
          <Link
            to="/author/books"
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
                  color: 'var(--blue)',
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
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                Кітаптарым
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                Сізге бекітілген авторлық кітаптарыңыз
              </div>
            </div>
          </Link>

          {/* 3. Settings */}
          <Link
            to="/settings"
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
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                Баптаулар
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                Профиль және қауіпсіздік баптаулары
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};
