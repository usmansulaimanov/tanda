import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebarStore } from '../../store/useSidebarStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { useQuoteStore } from '../../store/useQuoteStore';
import { useMessageStore } from '../../store/useMessageStore';
import { hasAdminPermission } from '../../utils/permissions';
import { api } from '../../lib/api';
import tandaLogo from '../../assets/tanda-logo.png';

export const AppSidebarDrawer: React.FC = () => {
  const { isOpen, closeSidebar } = useSidebarStore();
  const { user, role, isAuthenticated, logout } = useAuthStore();
  const { books } = useBookStore();
  const { savedBookIds } = useSavedBooksStore();
  const { currentShelf } = useMyBooksStore();
  const { quotes } = useQuoteStore();
  const { getUnreadCountForUser, messages } = useMessageStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [readersCount, setReadersCount] = React.useState<number>(() => {
    try {
      return useAuthStore.getState().getClientsCount();
    } catch {
      return 0;
    }
  });

  const unreadMessagesCount = React.useMemo(() => {
    if (!user) return 0;
    return getUnreadCountForUser(user.id);
  }, [user, messages, getUnreadCountForUser]);

  useEffect(() => {
    if (role === 'admin') {
      try {
        const localCount = useAuthStore.getState().getClientsCount();
        setReadersCount(localCount);
      } catch {}

      api.get('/api/admin/users', { params: { role: 'client' } })
        .then(({ data }) => {
          if (Array.isArray(data)) {
            setReadersCount(data.length);
          }
        })
        .catch(() => {});
    }
  }, [role, isOpen]);

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeSidebar]);

  const activeBooksCount = books.filter((b) => !b.isArchived).length;
  const archivedBooksCount = books.filter((b) => b.isArchived).length;
  const audioBooksCount = books.filter((b) => b.hasAudio).length;

  const canViewBooks = hasAdminPermission(user, 'books_view');
  const canCreateBooks = hasAdminPermission(user, 'books_create');
  const canViewReaders = hasAdminPermission(user, 'readers_view');
  const canManagePromos = hasAdminPermission(user, 'promocodes_manage');
  const canManageQuotes = hasAdminPermission(user, 'quotes_manage');
  const canManageManagers = hasAdminPermission(user, 'managers_manage');

  if (!isOpen) return null;

  return (
    <div className="sidebar-drawer-overlay" onClick={closeSidebar}>
      <div
        className="sidebar-drawer-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="sidebar-drawer-header">
          <Link
            to="/"
            onClick={closeSidebar}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              padding: 0,
              margin: 0,
            }}
          >
            <img
              src={tandaLogo}
              alt="Tanda"
              style={{ height: '34px', width: 'auto', display: 'block', objectFit: 'contain' }}
            />
          </Link>

          <button
            type="button"
            className="sidebar-drawer-close"
            onClick={closeSidebar}
            aria-label="Жабу"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* User Card */}
        {isAuthenticated && user && (
          <div className="sidebar-user-box">
            <div className="sidebar-user-avatar" style={{ overflow: 'hidden' }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'Avatar'}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                user.name ? user.name.trim().charAt(0).toUpperCase() : (role === 'admin' ? 'А' : 'О')
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={user.name}>
                {user.role === 'admin' ? user.name || 'Әкімші' : (user.name || 'Оқырман')}
              </div>
              <div className="sidebar-user-email" title={user.email}>
                {user.email}
              </div>
            </div>
          </div>
        )}

        <div className="sidebar-drawer-body">
          {/* Admin Management Section */}
          {role === 'admin' && (
            <div className="sidebar-nav-group">
              <div className="sidebar-nav-group-title">Басқару бөлімдері</div>
              
              {canViewBooks && (
                <Link
                  to="/admin"
                  className={`sidebar-nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                    <path d="M6 6h10"></path>
                    <path d="M6 10h10"></path>
                  </svg>
                  <span>Кітаптар қоры (Панель)</span>
                  <span className="sidebar-badge">{books.length}</span>
                </Link>
              )}

              {canCreateBooks && (
                <Link
                  to="/admin/books/new"
                  className={`sidebar-nav-link add-book ${location.pathname === '/admin/books/new' ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Жаңа кітап қосу</span>
                </Link>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <div className="sidebar-nav-group">
            <div className="sidebar-nav-group-title">Негізгі мәзір</div>

            <Link
              to="/"
              className={`sidebar-nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Басты бет</span>
            </Link>

            <a
              href="/#catalog"
              className={`sidebar-nav-link ${location.pathname === '/' && location.hash === '#catalog' ? 'active' : ''}`}
              onClick={(e) => {
                closeSidebar();
                if (location.pathname === '/') {
                  e.preventDefault();
                  const el = document.getElementById('catalog');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    window.history.replaceState(null, '', '/#catalog');
                  }
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <span>Кітаптар қоры (Каталог)</span>
            </a>

            {isAuthenticated && role !== 'admin' && (
              <>
                <Link
                  to="/my-books"
                  className={`sidebar-nav-link ${location.pathname === '/my-books' ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                    <path d="M6 6h10"></path>
                    <path d="M6 10h10"></path>
                  </svg>
                  <span>Менің сөрем</span>
                </Link>

                <Link
                  to="/quotes"
                  className={`sidebar-nav-link ${location.pathname === '/quotes' ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                  </svg>
                  <span>Цитаталар</span>
                </Link>

                <Link
                  to="/messages"
                  className={`sidebar-nav-link ${location.pathname === '/messages' ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>Хабарламалар</span>
                  {unreadMessagesCount > 0 && (
                    <span className="sidebar-badge">{unreadMessagesCount}</span>
                  )}
                </Link>
              </>
            )}

            {role === 'admin' && (
              <>
                {canViewReaders && (
                  <Link
                    to="/admin/readers"
                    className={`sidebar-nav-link ${location.pathname === '/admin/readers' ? 'active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span>Оқырмандар</span>
                    <span className="sidebar-badge">{readersCount}</span>
                  </Link>
                )}

                {canManagePromos && (
                  <Link
                    to="/admin/promocodes"
                    className={`sidebar-nav-link ${location.pathname.startsWith('/admin/promocodes') ? 'active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                      <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                    <span>Промокодтар</span>
                  </Link>
                )}

                {canManageQuotes && (
                  <Link
                    to="/admin/quotes"
                    className={`sidebar-nav-link ${location.pathname.startsWith('/admin/quotes') ? 'active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                    </svg>
                    <span>Цитаталар</span>
                    {quotes.length > 0 && <span className="sidebar-badge">{quotes.length}</span>}
                  </Link>
                )}

                <Link
                  to="/admin/messages"
                  className={`sidebar-nav-link ${location.pathname.startsWith('/admin/messages') ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>Хабарламалар</span>
                </Link>

                {canManageManagers && (
                  <Link
                    to="/admin/managers"
                    className={`sidebar-nav-link ${location.pathname === '/admin/managers' ? 'active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span>Басқару (Управление)</span>
                  </Link>
                )}
              </>
            )}

            {isAuthenticated && role !== 'admin' && (
              <>
                <Link
                  to="/profile"
                  className={`sidebar-nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Сақталған кітаптар</span>
                </Link>

                <Link
                  to="/promocode"
                  className={`sidebar-nav-link ${location.pathname === '/promocode' ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                  <span>Промокод</span>
                </Link>

                <Link
                  to="/settings"
                  className={`sidebar-nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Баптаулар</span>
                </Link>
              </>
            )}
          </div>

          {/* Quick Stats for Admin */}
          {role === 'admin' && (
            <div className="sidebar-stats-widget">
              <div className="sidebar-stats-title">Қор статистикасы</div>
              <div className="sidebar-stats-grid">
                <div className="sidebar-stat-cell">
                  <span className="stat-name">Барлығы</span>
                  <span className="stat-val">{books.length}</span>
                </div>
                <div className="sidebar-stat-cell">
                  <span className="stat-name">Аудио</span>
                  <span className="stat-val">{audioBooksCount}</span>
                </div>
                <div className="sidebar-stat-cell">
                  <span className="stat-name">Белсенді</span>
                  <span className="stat-val text-green">{activeBooksCount}</span>
                </div>
                <div className="sidebar-stat-cell">
                  <span className="stat-name">Архивте</span>
                  <span className="stat-val text-slate">{archivedBooksCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="sidebar-drawer-footer">
          {isAuthenticated ? (
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={() => {
                logout();
                closeSidebar();
                if (
                  location.pathname.startsWith('/admin') ||
                  location.pathname.startsWith('/promocode') ||
                  location.pathname.startsWith('/profile') ||
                  location.pathname.startsWith('/settings')
                ) {
                  navigate('/');
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Аккаунттан шығу
            </button>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
              Tanda &bull; Таңдаулы қазақша кітаптар қоры
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
