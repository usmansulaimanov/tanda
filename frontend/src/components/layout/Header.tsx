import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useToastStore } from '../../store/useToastStore';
import { useSidebarStore } from '../../store/useSidebarStore';
import { useMessageStore } from '../../store/useMessageStore';
import { Book } from '../../types';
import { hasAdminPermission } from '../../utils/permissions';
import tandaLogo from '../../assets/tanda-logo.png';
import { Crown, X, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { systemApi } from '../../shared/api/system.api';
import { PremiumModal } from '../../features/premium/PremiumModal';
import { FilterDrawer, FilterState } from '../../features/catalog/FilterDrawer';


export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isAuthenticated, logout } = useAuthStore();
  const { books } = useBookStore();
  const { savedBookIds } = useSavedBooksStore();
  const { showToast } = useToastStore();
  const { isOpen: isSidebarOpen, toggleSidebar } = useSidebarStore();
  const { getUnreadCountForUser, messages } = useMessageStore();

  const unreadMessagesCount = React.useMemo(() => {
    if (!user) return 0;
    return getUnreadCountForUser(user.id);
  }, [user, messages, getUnreadCountForUser]);

  const isAuthor = Boolean(
    isAuthenticated && user && (role === 'author' || user.role === 'author' || user.isAuthor)
  );
  const isStaffOrAuthor = Boolean(
    isAuthenticated && user && (role === 'admin' || role === 'author' || user.role === 'admin' || user.role === 'author' || user.isSuperAdmin || user.isAuthor || Boolean(user.duty))
  );
  const homeRoute = isAuthor ? '/author/home' : isStaffOrAuthor ? '/admin/home' : '/';
  const canViewBooks = hasAdminPermission(user, 'books_view');
  const canViewReaders = hasAdminPermission(user, 'readers_view');

  // Search state
  const [headerSearch, setHeaderSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search overlay state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [headerFilters, setHeaderFilters] = useState<FilterState>({
    selectedAuthors: [],
    selectedNarrators: [],
    formatFilter: 'all',
    accessFilter: 'all',
    sortBy: 'default',
  });

  const openSearch = () => {
    setIsSearchOpen(true);
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInputRef.current?.focus(), 60);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setHeaderSearch('');
    document.body.style.overflow = '';
  };

  // Authors list for filter drawer
  const overlayAuthorsList = useMemo(() => {
    const map = new Map<string, number>();
    books.filter((b) => !b.isArchived).forEach((b) => {
      const a = b.author?.trim();
      if (a) map.set(a, (map.get(a) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'kk'));
  }, [books]);

  // Narrators list for filter drawer
  const overlayNarratorsList = useMemo(() => {
    const map = new Map<string, number>();
    books.filter((b) => !b.isArchived).forEach((b) => {
      const n = b.audioNarrator?.trim();
      if (n) map.set(n, (map.get(n) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'kk'));
  }, [books]);

  // Active filter count badge
  const headerActiveFilterCount = [
    headerFilters.selectedAuthors.length > 0,
    headerFilters.selectedNarrators.length > 0,
    headerFilters.formatFilter !== 'all',
    headerFilters.accessFilter !== 'all',
    headerFilters.sortBy !== 'default',
  ].filter(Boolean).length;

  // Filtered overlay results
  const overlayResults = useMemo(() => {
    const activeBooks = books.filter((b) => {
      const isArchived = Boolean(b.isArchived) || (b.isArchived as unknown) === 'true';
      return !isArchived;
    });

    let list = activeBooks.filter((b) => {
      if (headerSearch.trim()) {
        const q = headerSearch.toLowerCase();
        const matches =
          (b.title || '').toLowerCase().includes(q) ||
          (b.author || '').toLowerCase().includes(q) ||
          (b.category || '').toLowerCase().includes(q) ||
          (b.description || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (headerFilters.selectedAuthors.length > 0) {
        const al = (b.author || '').trim().toLowerCase();
        if (!headerFilters.selectedAuthors.some((a) => a.toLowerCase() === al)) return false;
      }
      if (headerFilters.selectedNarrators.length > 0) {
        const nl = (b.audioNarrator || '').trim().toLowerCase();
        if (!headerFilters.selectedNarrators.some((n) => n.toLowerCase() === nl)) return false;
      }
      if (headerFilters.formatFilter === 'audio' && !b.hasAudio && !b.audioUrl && (!b.audioChapters || b.audioChapters.length === 0)) return false;
      if (headerFilters.formatFilter === 'ebook' && !b.hasEbook && !b.content && !b.pages && !b.ebookUrl && !b.pdfUrl && !b.epubUrl) return false;
      if (headerFilters.accessFilter === 'free' && !b.isFree) return false;
      if (headerFilters.accessFilter === 'premium' && b.isFree !== false) return false;
      return true;
    });

    if (headerFilters.sortBy === 'popular') {
      list.sort((a, b) => ((b.readsCount || 0) + (b.viewsCount || 0)) - ((a.readsCount || 0) + (a.viewsCount || 0)));
    } else if (headerFilters.sortBy === 'newest') {
      list.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    } else if (headerFilters.sortBy === 'alpha-asc') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'kk'));
    } else if (headerFilters.sortBy === 'alpha-desc') {
      list.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'kk'));
    }

    return list;
  }, [books, headerSearch, headerFilters]);


  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (profileWrapRef.current && !profileWrapRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
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
    if (isAuthor) {
      navigate('/author/books');
      return;
    }
    if (isStaffOrAuthor) {
      navigate('/admin');
      return;
    }
    navigate(`/book/${book.id}`);
  };

  const handleLogout = () => {
    logout();
    showToast('Жүйеден сәтті шықтыңыз', 'info');
    navigate('/', { replace: true });
  };

  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const { data: systemSettings } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: systemApi.getSettings,
    staleTime: 60_000,
  });

  const isUserPremium = Boolean(user?.isPremium);
  const isPremiumSystemDisabled = systemSettings?.premiumEnabled === false || Boolean(systemSettings?.openAccessMode);

  const isReader = Boolean(
    isAuthenticated &&
    user &&
    !isStaffOrAuthor &&
    !isAuthor &&
    (role === 'client' || user.role === 'client' || !user.role)
  );

  const isBannerEnabled = systemSettings?.headerBannerEnabled !== false;
  const bannerText = systemSettings?.headerBannerText || 'Tanda Premium: 100+ кітапты шектеусіз әрі 0% жарнамасыз тыңдаңыз!';
  const bannerButtonText = systemSettings?.headerBannerButtonText ?? 'Премиумға жазылу →';

  // Marketing Promo Banner: STRICTLY for authenticated readers without Premium only
  const shouldShowBanner = Boolean(
    isAuthenticated &&
    user &&
    isReader &&
    !isStaffOrAuthor &&
    !isAuthor &&
    !isUserPremium &&
    !isPremiumSystemDisabled &&
    isBannerEnabled
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full max-w-full">
        <nav className="tanda-nav" style={{ position: 'relative', top: 'auto', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          
          {/* Left: Sidebar Toggle, Logo & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', minWidth: 0, maxWidth: '540px' }}>
            {/* Sidebar Toggle Button */}
            <button
              type="button"
              className={`nav-sidebar-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
              onClick={toggleSidebar}
              title={isSidebarOpen ? 'Сайдбарды жабу' : 'Сайдбарды ашу'}
              aria-label="Сайдбарды ашу/жабу"
              style={{
                width: '38px',
                height: '38px',
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
              to={homeRoute}
              className="nav-logo"
              style={{
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                height: '38px',
                margin: 0,
                padding: 0,
              }}
            >
              <img
                src={tandaLogo}
                alt="Tanda"
                style={{ height: '32px', width: 'auto', display: 'block', objectFit: 'contain' }}
              />
            </Link>

            {/* Header Search Trigger — click opens fullscreen overlay */}
            <div
              ref={searchWrapRef}
              style={{
                position: 'relative',
                flex: '1 1 auto',
                minWidth: 0,
                maxWidth: '320px',
                display: 'flex',
                alignItems: 'center',
                height: '38px',
              }}
            >
              <button
                type="button"
                onClick={openSearch}
                className="w-full flex items-center gap-2 text-left"
                style={{
                  height: '38px',
                  padding: '0 10px 0 34px',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '50px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: '#F8FAFC',
                  color: '#94A3B8',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  width: '100%',
                  position: 'relative',
                }}
              >
                <svg
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                Кітап іздеу...
              </button>
            </div>
          </div>

          {/* Middle: Links */}
          <ul className="nav-links">
            {isStaffOrAuthor ? (
              <>
                {isAuthor ? (
                  <>
                    <li>
                      <Link
                        to="/news"
                        className={location.pathname.startsWith('/news') ? 'active' : ''}
                        style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                      >
                        Жаңалықтар
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/author/stats"
                        className={location.pathname.startsWith('/author/stats') ? 'active' : ''}
                        style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                      >
                        Авторлық статистика
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/author/books"
                        className={location.pathname.startsWith('/author/books') ? 'active' : ''}
                        style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                      >
                        Кітаптарым
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/author/home"
                        className={location.pathname === '/author/home' || location.pathname === '/author' ? 'active' : ''}
                        style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 700, color: 'var(--blue)' }}
                      >
                        Жеке кабинет
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    {hasAdminPermission(user, 'news_manage') && (
                      <li>
                        <Link
                          to="/admin/news"
                          className={location.pathname.startsWith('/admin/news') ? 'active' : ''}
                          style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                        >
                          Жаңалықтар
                        </Link>
                      </li>
                    )}
                    {canViewReaders && (
                      <li>
                        <Link
                          to="/admin/readers"
                          className={location.pathname.startsWith('/admin/readers') ? 'active' : ''}
                          style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                        >
                          Оқырмандар
                        </Link>
                      </li>
                    )}
                    {hasAdminPermission(user, 'analytics_view') && (
                      <li>
                        <Link
                          to="/admin/stats"
                          className={location.pathname.startsWith('/admin/stats') ? 'active' : ''}
                          style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                        >
                          Статистика
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link
                        to="/admin/home"
                        className={location.pathname === '/admin/home' ? 'active' : ''}
                        style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 700, color: 'var(--blue)' }}
                      >
                        Жеке кабинет
                      </Link>
                    </li>
                  </>
                )}
              </>
            ) : (
              <>
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
                  <Link
                    to="/news"
                    className={location.pathname.startsWith('/news') ? 'active' : ''}
                    style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                  >
                    Жаңалықтар
                  </Link>
                </li>
                <li>
                  <Link
                    to="/catalog"
                    className={location.pathname.startsWith('/catalog') ? 'active' : ''}
                    style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Кітаптар қоры
                  </Link>
                </li>
                {isAuthenticated && (
                  <li>
                    <Link
                      to="/my-books"
                      className={location.pathname === '/my-books' ? 'active' : ''}
                      style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
                    >
                      Менің сөрем
                    </Link>
                  </li>
                )}
              </>
            )}
          </ul>

          {/* Right: Auth & Profile Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {isAuthenticated && user ? (
              <div className="nav-profile-wrap" ref={profileWrapRef}>
                {/* Profile Icon / Avatar */}
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className={`nav-profile-icon-btn ${profileOpen ? 'active' : ''}`}
                  title={user.name || 'Жеке профиль'}
                  aria-label="Жеке профиль"
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  style={{ padding: 0, overflow: 'hidden' }}
                >
                  {(user.avatarUrl || (user.role === 'client' ? '/default-reader-avatar.jpg' : undefined)) ? (
                    <img
                      src={user.avatarUrl || '/default-reader-avatar.jpg'}
                      alt={user.name || 'Avatar'}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
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
                  <>
                    <div
                      className="fixed inset-0 z-[250] bg-black/25 md:hidden"
                      onClick={() => setProfileOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="nav-profile-dropdown z-[300]">
                    {/* User Info Header: Name, Email & Role */}
                    <div className="profile-card-header">
                      <div className="profile-card-avatar" style={{ overflow: 'hidden' }}>
                        {(user.avatarUrl || (user.role === 'client' ? '/default-reader-avatar.jpg' : undefined)) ? (
                          <img
                            src={user.avatarUrl || '/default-reader-avatar.jpg'}
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', marginTop: '3px' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              color: '#0F172A',
                              letterSpacing: '0.02em',
                            }}
                          >
                            ID: {user.idNumber || '—'}
                          </span>
                          {(!user.role || user.role === 'client') && user.username && (
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#0F172A',
                              }}
                            >
                              @{user.username.replace(/^@/, '')}
                            </span>
                          )}
                        </div>
                        <div className="profile-card-email" title={user.email} style={{ marginTop: '2px' }}>
                          {user.email}
                        </div>
                      </div>
                    </div>

                    {/* Quick Navigation Links */}
                    <div className="profile-card-actions">
                      {!isStaffOrAuthor ? (
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
                      ) : isAuthor ? (
                        <>
                          <Link
                            to="/author/home"
                            className="profile-menu-item"
                            onClick={() => setProfileOpen(false)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="7" height="7"></rect>
                              <rect x="14" y="3" width="7" height="7"></rect>
                              <rect x="14" y="14" width="7" height="7"></rect>
                              <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                            <span>Жеке кабинет</span>
                          </Link>

                          <Link
                            to="/author/books"
                            className="profile-menu-item"
                            onClick={() => setProfileOpen(false)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                              <path d="M6 6h10"></path>
                              <path d="M6 10h10"></path>
                            </svg>
                            <span>Кітаптарым</span>
                          </Link>

                          <Link
                            to="/author/stats"
                            className="profile-menu-item"
                            onClick={() => setProfileOpen(false)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="20" x2="18" y2="10"></line>
                              <line x1="12" y1="20" x2="12" y2="4"></line>
                              <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                            <span>Авторлық статистика</span>
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
                            <span>Баптаулар</span>
                          </Link>
                        </>
                      ) : user.role === 'admin' ? (
                        <>
                          <Link
                            to="/admin/home"
                            className="profile-menu-item"
                            onClick={() => setProfileOpen(false)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="7" height="7"></rect>
                              <rect x="14" y="3" width="7" height="7"></rect>
                              <rect x="14" y="14" width="7" height="7"></rect>
                              <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                            Жеке кабинет
                          </Link>

                          {hasAdminPermission(user, 'analytics_view') && (
                            <Link
                              to="/admin/stats"
                              className="profile-menu-item"
                              onClick={() => setProfileOpen(false)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                              </svg>
                              Статистика
                            </Link>
                          )}

                          {hasAdminPermission(user, 'managers_manage') && (
                            <Link
                              to="/admin/managers"
                              className="profile-menu-item"
                              onClick={() => setProfileOpen(false)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              </svg>
                              <span>Басқару</span>
                            </Link>
                          )}

                          <Link
                            to="/settings"
                            className="profile-menu-item"
                            onClick={() => setProfileOpen(false)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>Баптаулар</span>
                          </Link>
                        </>
                      ) : null}

                      <button
                        type="button"
                        className="profile-menu-item logout"
                        onClick={() => {
                          setProfileOpen(false);
                          setShowLogoutConfirm(true);
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
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-nav-login"
                  style={{
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Кіру
                </Link>
                <Link
                  to="/signup"
                  className="btn-nav-reg"
                  style={{
                    padding: '6px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Тіркелу
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
        {/* Marketing Promo Banner for Non-Premium users (positioned directly under header) */}
        {shouldShowBanner && (
          <div 
            onClick={() => setShowPremiumModal(true)}
            className="bg-gradient-to-r from-[#F08000] via-orange-500 to-[#F08000] text-white text-xs font-bold py-2 px-4 cursor-pointer hover:opacity-95 transition shadow-sm flex items-center justify-center z-30 relative w-full max-w-full box-border"
          >
            <div className="flex items-center justify-center gap-2 text-center">
              <Crown className="w-3.5 h-3.5 text-orange-100 shrink-0" />
              <span>
                {bannerText}
              </span>
              {bannerButtonText && (
                <span className="hidden sm:inline-block underline decoration-orange-200 font-black ml-1 text-white">
                  {bannerButtonText}
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '400px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              color: '#0F172A',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>
              Аккаунттан шығу
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: '1.5', margin: '0 0 24px' }}>
              Сіз шынымен өз аккаунтыңыздан шыққыңыз келе ме?
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Бас тарту
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                  transition: 'all 0.15s ease',
                }}
              >
                Шығу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Subscription Modal */}
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />

      {/* ===== FULLSCREEN SEARCH OVERLAY (PORTAL TO BODY) ===== */}
      {isSearchOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[900] flex flex-col bg-white overflow-hidden">
          {/* Header row replacement — fixed at top */}
          <div
            className="w-full shrink-0 flex items-center gap-2 px-4 bg-white"
            style={{
              height: '60px',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            {/* ← Back */}
            <button
              type="button"
              onClick={closeSearch}
              className="shrink-0 flex items-center justify-center active:opacity-60 transition-opacity"
              style={{
                width: '38px',
                height: '38px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#1E293B',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Search input */}
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Кітап немесе автор іздеу..."
                autoComplete="off"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 36px 0 40px',
                  borderRadius: '14px',
                  border: '1.5px solid #005494',
                  background: '#F8FAFC',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1E293B',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 0 0 3px rgba(0,84,148,0.1)',
                }}
              />
              <svg
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              {headerSearch && (
                <button
                  type="button"
                  onClick={() => setHeaderSearch('')}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: '#E2E8F0', border: 'none', borderRadius: '50%',
                    width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#64748B', fontSize: '10px', fontWeight: 800,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* ⚙ Filter button */}
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              className="relative shrink-0 flex items-center justify-center active:scale-95 transition-all"
              style={{
                width: '42px', height: '42px', borderRadius: '12px',
                border: headerActiveFilterCount > 0 ? '1.5px solid #005494' : '1.5px solid #E2E8F0',
                background: headerActiveFilterCount > 0 ? '#005494' : '#FFFFFF',
                color: headerActiveFilterCount > 0 ? '#FFFFFF' : '#64748B',
                cursor: 'pointer',
                boxShadow: headerActiveFilterCount > 0 ? '0 4px 12px rgba(0,84,148,0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {headerActiveFilterCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: '#EF7E00', color: '#FFFFFF' }}
                >
                  {headerActiveFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* White area below — smoothly scrolls */}
          <div
            className="flex-1 overflow-y-auto bg-white"
            style={{
              animation: 'searchOverlayIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >

            {/* Results count row */}
            {(headerSearch.trim() || headerActiveFilterCount > 0) && (
              <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid #F1F5F9' }}>
                <p className="text-sm font-semibold" style={{ color: '#64748B' }}>
                  {overlayResults.length > 0
                    ? `${overlayResults.length} кітап табылды`
                    : 'Кітап табылмады'}
                </p>
              </div>
            )}

            {/* No results */}
            {(headerSearch.trim() || headerActiveFilterCount > 0) && overlayResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <p className="text-base font-bold" style={{ color: '#1E293B' }}>Нәтиже жоқ</p>
                <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Басқа сөздермен немесе фильтрлерсіз іздеп көріңіз</p>
              </div>
            )}

            {/* Book results list */}
            {overlayResults.length > 0 && (
              <div>
                {overlayResults.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      closeSearch();
                      navigate(`/book/${b.id}`);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-slate-50 transition-colors text-left"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #F8FAFC' }}
                  >
                    {/* Cover */}
                    <div
                      style={{
                        width: '44px', height: '60px', borderRadius: '8px', flexShrink: 0,
                        background: b.gradient || '#0057A8',
                        position: 'relative', overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                    >
                      {b.coverImage && (
                        <img
                          src={b.coverImage}
                          alt={b.title}
                          referrerPolicy="no-referrer"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-snug" style={{ color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.author}
                        {b.category ? <span style={{ color: '#005494' }}> · {b.category}</span> : null}
                      </p>
                    </div>
                    {/* Chevron */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
                {/* bottom padding for safe area */}
                <div style={{ height: '120px' }} />
              </div>
            )}
          </div>

          {/* FilterDrawer */}
          <FilterDrawer
            isOpen={filterDrawerOpen}
            onClose={() => setFilterDrawerOpen(false)}
            filters={headerFilters}
            onApply={(f) => setHeaderFilters(f)}
            authorsList={overlayAuthorsList}
            narratorsList={overlayNarratorsList}
          />
        </div>,
        document.body
      )}
    </>
  );
};

