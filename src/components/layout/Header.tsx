import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { Book } from '../../types';
import tandaLogo from '../../assets/tanda-logo.png';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isAuthenticated, loginAsAdmin, loginAsClient, logout } = useAuthStore();
  const { books } = useBookStore();
  const { showToast } = useToastStore();

  // Search state
  const [headerSearch, setHeaderSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Profile menu state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (profileWrapRef.current && !profileWrapRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close profile dropdown on page change
  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  const handleSearchInput = (val: string) => {
    setHeaderSearch(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const q = val.toLowerCase();
    // Exclude archived books: if a book is archived or deleted, it must NEVER appear in search results
    const matches = books.filter((b) => {
      const isArchived = Boolean(b.isArchived) || (b.isArchived as unknown) === 'true';
      if (isArchived) return false;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    });
    setSearchResults(matches.slice(0, 6));
    setShowResults(true);
  };

  // Re-sync search results if books in database change (e.g. archived or deleted)
  useEffect(() => {
    if (!headerSearch.trim()) return;
    const q = headerSearch.toLowerCase();
    const matches = books.filter((b) => {
      const isArchived = Boolean(b.isArchived) || (b.isArchived as unknown) === 'true';
      if (isArchived) return false;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    });
    setSearchResults(matches.slice(0, 6));
  }, [books, headerSearch]);

  const handleSelectBook = (book: Book) => {
    setShowResults(false);
    setHeaderSearch('');
    if (isAuthenticated && role === 'admin') {
      navigate(`/admin/books/${book.id}/edit`);
    } else {
      navigate(`/book/${book.id}`);
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Жүйеден сәтті шықтыңыз', 'info');
    if (location.pathname.startsWith('/admin')) {
      navigate('/');
    }
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthError('');
    setAuthModalOpen(true);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      setAuthError('Электронды почтаны енгізіңіз');
      return;
    }

    const emailLower = authEmail.trim().toLowerCase();
    if (emailLower.includes('admin')) {
      loginAsAdmin();
      showToast('Админ аккаунтымен сәтті кірдіңіз!', 'success');
      navigate('/admin');
    } else {
      const name = authName.trim() || emailLower.split('@')[0] || 'Оқырман';
      loginAsClient(emailLower, name);
      showToast(`Қош келдіңіз, ${name}!`, 'success');
    }

    setAuthModalOpen(false);
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
  };

  const quickLoginAs = (targetRole: 'admin' | 'client') => {
    if (targetRole === 'admin') {
      loginAsAdmin();
      showToast('Админ ретінде кірдіңіз', 'success');
      navigate('/admin');
    } else {
      loginAsClient('reader@tanda.kz', 'Оқырман');
      showToast('Оқырман ретінде кірдіңіз', 'success');
    }
    setAuthModalOpen(false);
  };

  return (
    <>
      <nav className="tanda-nav" style={{ padding: '12px 32px' }}>
        <div style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          
          {/* Left: Logo & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', minWidth: 0, maxWidth: '520px' }}>
            {/* Logo */}
            <Link to="/" className="nav-logo" style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <img
                src={tandaLogo}
                alt="Tanda"
                style={{ height: '36px', width: 'auto', display: 'block', objectFit: 'contain' }}
              />
            </Link>

            {/* Header Search with Autocomplete */}
            <div ref={searchWrapRef} style={{ position: 'relative', flex: 1, minWidth: '160px', maxWidth: '300px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  value={headerSearch}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Кітап атын іздеу..."
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '8px 14px 8px 34px',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '50px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: '#F8FAFC',
                    color: 'var(--text-dark)',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
                <svg
                  style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>

              {/* Autocomplete Dropdown */}
              {showResults && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 'calc(100% + 6px)',
                    width: '320px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '12px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                    zIndex: 200,
                    padding: '6px',
                  }}
                >
                  {searchResults.length > 0 ? (
                    searchResults.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBook(b)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '36px',
                            borderRadius: '4px',
                            background: b.coverImage ? `url(${b.coverImage}) center/cover` : (b.gradient || '#0057A8'),
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.author} &bull; <span style={{ color: 'var(--blue)' }}>{b.category}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                      Кітап табылмады
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Middle: Links (Only shown for readers) */}
          {role !== 'admin' && (
            <ul className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '24px', margin: 0, padding: 0, listStyle: 'none', flexShrink: 0 }}>
              <li>
                <Link to="/" className={location.pathname === '/' ? 'active' : ''} style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                  Басты бет
                </Link>
              </li>
              <li>
                <Link to="/catalog" className={location.pathname === '/catalog' ? 'active' : ''} style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                  Кітаптар қоры
                </Link>
              </li>
            </ul>
          )}

          {/* Right: Auth & Profile Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {isAuthenticated && user ? (
              <div className="nav-profile-wrap" ref={profileWrapRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className={`nav-profile-btn ${profileOpen ? 'active' : ''}`}
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                >
                  <div className="nav-profile-avatar">
                    {user.name ? user.name.trim().charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'О')}
                  </div>
                  <span className="nav-profile-name">
                    {user.name || (user.role === 'admin' ? 'Администратор' : 'Оқырман')}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transition: 'transform 0.2s',
                      transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      color: '#64748B',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {profileOpen && (
                  <div className="nav-profile-dropdown">
                    {/* User Info Header: Name, Email & Role */}
                    <div className="profile-card-header">
                      <div className="profile-card-avatar">
                        {user.name ? user.name.trim().charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'О')}
                      </div>
                      <div className="profile-card-info">
                        <div className="profile-card-name" title={user.name || 'Оқырман'}>
                          {user.name || (user.role === 'admin' ? 'Администратор' : 'Оқырман')}
                        </div>
                        <div className="profile-card-email" title={user.email}>
                          {user.email}
                        </div>
                        <span className={`profile-card-role-badge ${user.role === 'admin' ? 'admin' : 'client'}`}>
                          {user.role === 'admin' ? 'Әкімшілік (Админ)' : 'Оқырман'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Navigation Links */}
                    <div className="profile-card-actions">
                      {user.role === 'admin' ? (
                        <Link
                          to="/admin"
                          className="profile-menu-item"
                          onClick={() => setProfileOpen(false)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                          </svg>
                          Басқару панелі
                        </Link>
                      ) : (
                        <Link
                          to="/catalog"
                          className="profile-menu-item"
                          onClick={() => setProfileOpen(false)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                          </svg>
                          Кітаптар қоры
                        </Link>
                      )}

                      <button
                        type="button"
                        className="profile-menu-item logout"
                        onClick={() => {
                          setProfileOpen(false);
                          handleLogout();
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Аккаунттан шығу
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="btn-nav-login"
                  style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 700 }}
                >
                  Кіру
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className="btn-nav-reg"
                  style={{ padding: '6px 18px', fontSize: '13px', fontWeight: 700 }}
                >
                  Тіркелу
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* AUTH MODAL (Exact design & account switching) */}
      {authModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,42,0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setAuthModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '36px 32px',
              position: 'relative',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setAuthModalOpen(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                color: 'var(--text-mid)',
              }}
            >
              ✕
            </button>

            {/* Modal title */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)' }}>
                {authMode === 'login' ? 'Сайтқа кіру' : 'Тіркелу'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                {authMode === 'login'
                  ? 'Аккаунтыңыз арқылы кіріп, кітаптарды оқыңыз немесе басқарыңыз'
                  : 'Жаңа аккаунт ашып, кітапхананы қолданыңыз'}
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: 'none',
                  background: 'none',
                  fontWeight: authMode === 'login' ? 800 : 600,
                  fontSize: '14px',
                  color: authMode === 'login' ? 'var(--blue)' : 'var(--text-mid)',
                  borderBottom: authMode === 'login' ? '2px solid var(--blue)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Кіру
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: 'none',
                  background: 'none',
                  fontWeight: authMode === 'signup' ? 800 : 600,
                  fontSize: '14px',
                  color: authMode === 'signup' ? 'var(--blue)' : 'var(--text-mid)',
                  borderBottom: authMode === 'signup' ? '2px solid var(--blue)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Тіркелу
              </button>
            </div>

            {/* Quick Demo Switchers */}
            <div style={{ marginBottom: '20px', padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mid)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Жылдам кіру (Аккаунт таңдау):
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => quickLoginAs('admin')}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--blue)',
                    background: '#FFF',
                    color: 'var(--blue)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Админ
                </button>
                <button
                  type="button"
                  onClick={() => quickLoginAs('client')}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #10B981',
                    background: '#FFF',
                    color: '#047857',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Оқырман (Reader)
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Аты-жөніңіз *
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Мысалы: Азамат Серікұлы"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                  Электронды почта (Email) *
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="admin@tanda.kz немесе siz@mail.kz"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                  Құпиясөз *
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Құпиясөзді енгізіңіз"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              {authError && (
                <div style={{ color: '#DC2626', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '12px', borderRadius: '50px', fontSize: '14px' }}
              >
                {authMode === 'login' ? 'Кіру' : 'Тіркелу және кіру'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
