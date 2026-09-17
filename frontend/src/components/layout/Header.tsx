import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useToastStore } from '../../store/useToastStore';
import { useSidebarStore } from '../../store/useSidebarStore';
import { Book } from '../../types';
import { hasAdminPermission } from '../../utils/permissions';
import tandaLogo from '../../assets/tanda-logo.png';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isAuthenticated, logout } = useAuthStore();
  const { books } = useBookStore();
  const { savedBookIds } = useSavedBooksStore();
  const { showToast } = useToastStore();
  const { isOpen: isSidebarOpen, toggleSidebar } = useSidebarStore();

  // Search state
  const [headerSearch, setHeaderSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Profile menu state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);

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
    if (
      location.pathname.startsWith('/admin') ||
      location.pathname.startsWith('/promocode') ||
      location.pathname.startsWith('/profile') ||
      location.pathname.startsWith('/settings')
    ) {
      navigate('/');
    }
  };



  return (
    <>
      <nav className="tanda-nav" style={{ padding: '26px 32px', minHeight: '90px' }}>
        <div style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          
          {/* Left: Sidebar Toggle, Logo & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 auto', minWidth: 0, maxWidth: '540px' }}>
            {/* Sidebar Toggle Button */}
            <button
              type="button"
              className={`nav-sidebar-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
              onClick={toggleSidebar}
              title={isSidebarOpen ? 'Сайдбарды жабу' : 'Сайдбарды ашу'}
              aria-label="Сайдбарды ашу/жабу"
              style={{
                width: '40px',
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* Logo */}
            <Link
              to="/"
              className="nav-logo"
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40px',
                margin: 0,
                padding: 0,
              }}
            >
              <img
                src={tandaLogo}
                alt="Tanda"
                style={{ height: '34px', width: 'auto', display: 'block', objectFit: 'contain' }}
              />
            </Link>

            {/* Header Search with Autocomplete */}
            <div
              ref={searchWrapRef}
              style={{
                position: 'relative',
                flex: 1,
                minWidth: '160px',
                maxWidth: '300px',
                display: 'flex',
                alignItems: 'center',
                height: '40px',
              }}
            >
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={headerSearch}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Кітап атын іздеу..."
                  autoComplete="off"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 14px 0 36px',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '50px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: '#F8FAFC',
                    color: 'var(--text-dark)',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    display: 'block',
                  }}
                />
                <svg
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748B',
                    pointerEvents: 'none',
                  }}
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
                            background: b.gradient || '#0057A8',
                            flexShrink: 0,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          {b.coverImage && (
                            <img
                              src={b.coverImage}
                              alt={b.title}
                              referrerPolicy="no-referrer"
                              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
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
                <Link
                  to="/"
                  onClick={() => {
                    if (location.pathname === '/') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={location.pathname === '/' && !location.hash ? 'active' : ''}
                  style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                >
                  Басты бет
                </Link>
              </li>
              <li>
                <a
                  href="/#catalog"
                  onClick={(e) => {
                    if (location.pathname === '/') {
                      e.preventDefault();
                      const el = document.getElementById('catalog');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                        window.history.replaceState(null, '', '/#catalog');
                      }
                    }
                  }}
                  className={location.pathname === '/' && location.hash === '#catalog' ? 'active' : ''}
                  style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                >
                  Кітаптар қоры
                </a>
              </li>
              <li>
                <Link
                  to="/my-books"
                  className={location.pathname === '/my-books' ? 'active' : ''}
                  style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                >
                  Менің сөрем
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
                  className={`nav-profile-icon-btn ${profileOpen ? 'active' : ''}`}
                  title={user.name || 'Жеке профиль'}
                  aria-label="Жеке профиль"
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  style={{ padding: user.avatarUrl ? '2px' : undefined, overflow: 'hidden' }}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || 'Avatar'}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  )}
                </button>

                {profileOpen && (
                  <div className="nav-profile-dropdown">
                    {/* User Info Header: Name, Email & Role */}
                    <div className="profile-card-header">
                      <div className="profile-card-avatar" style={{ overflow: 'hidden' }}>
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name || 'Avatar'}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          user.name ? user.name.trim().charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'О')
                        )}
                      </div>
                      <div className="profile-card-info">
                        <div className="profile-card-name" title={user.role === 'admin' ? 'Админ' : (user.name || 'Оқырман')}>
                          {user.role === 'admin' ? 'Админ' : (user.name || 'Оқырман')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              background: 'rgba(0, 84, 148, 0.1)',
                              color: 'var(--blue)',
                              padding: '1px 7px',
                              borderRadius: '4px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            ID: {user.idNumber || (user.role === 'admin' ? '000 001' : '001 001')}
                          </span>
                          {user.username && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(235, 130, 60, 0.12)',
                                color: 'var(--orange)',
                                padding: '1px 7px',
                                borderRadius: '4px',
                              }}
                            >
                              @{user.username.replace(/^@/, '')}
                            </span>
                          )}
                        </div>
                        <div className="profile-card-email" title={user.email}>
                          {user.email}
                        </div>
                      </div>
                    </div>

                    {/* Quick Navigation Links */}
                    <div className="profile-card-actions">
                      {user.role !== 'admin' && (
                        <>
                          <Link
                            to="/my-books"
                            className="profile-menu-item"
                            onClick={() => setProfileOpen(false)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                              <path d="M6 6h10"></path>
                              <path d="M6 10h10"></path>
                            </svg>
                            <span style={{ flex: 1 }}>Менің сөрем</span>
                          </Link>

                          <Link
                            to="/profile"
                            className="profile-menu-item"
                            onClick={() => setProfileOpen(false)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                            </svg>
                            <span style={{ flex: 1 }}>Сақталған кітаптар</span>
                            {savedBookIds.length > 0 && (
                              <span
                                style={{
                                  background: 'var(--orange)',
                                  color: '#FFF',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '1px 7px',
                                  borderRadius: '50px',
                                }}
                              >
                                {savedBookIds.length}
                              </span>
                            )}
                          </Link>

                          <Link
                            to="/settings"
                            className="profile-menu-item"
                            onClick={() => setProfileOpen(false)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span style={{ flex: 1 }}>Баптаулар</span>
                          </Link>
                        </>
                      )}

                      {user.role === 'admin' ? (
                        <>
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

                          {hasAdminPermission(user, 'managers_manage') && (
                            <Link
                              to="/admin/managers"
                              className="profile-menu-item"
                              onClick={() => setProfileOpen(false)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              </svg>
                              Басқару (Управление)
                            </Link>
                          )}
                        </>
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
                <Link
                  to="/login"
                  className="btn-nav-login"
                  style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Кіру
                </Link>
                <Link
                  to="/signup"
                  className="btn-nav-reg"
                  style={{ padding: '6px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Тіркелу
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};
