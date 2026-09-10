import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebarStore } from '../../store/useSidebarStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';

export const AppSidebarDrawer: React.FC = () => {
  const { isOpen, closeSidebar } = useSidebarStore();
  const { user, role, isAuthenticated, users, logout } = useAuthStore();
  const { books } = useBookStore();
  const { savedBookIds } = useSavedBooksStore();
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  // Close on Escape key
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
  const readersCount = users.filter((u) => u.role === 'client').length;

  if (!isOpen) return null;

  return (
    <div className="sidebar-drawer-overlay" onClick={closeSidebar}>
      <div
        className="sidebar-drawer-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="sidebar-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-drawer-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <div>
              <h3 className="sidebar-drawer-title">
                {role === 'admin' ? 'Басқару панелі' : 'Tanda Мәзірі'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span className="sidebar-id-pill">
                  ID: {user?.idNumber || (role === 'admin' ? '000 001' : '001 001')}
                </span>
              </div>
            </div>
          </div>

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
            <div className="sidebar-user-avatar">
              {user.name ? user.name.trim().charAt(0).toUpperCase() : (role === 'admin' ? 'А' : 'О')}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={user.name}>
                {user.role === 'admin' ? 'Админ' : (user.name || 'Оқырман')}
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

            <Link
              to="/catalog"
              className={`sidebar-nav-link ${location.pathname === '/catalog' ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <span>Кітаптар қоры (Каталог)</span>
            </Link>

            {isAuthenticated && role !== 'admin' && (
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
                {savedBookIds.length > 0 && (
                  <span className="sidebar-badge orange">{savedBookIds.length}</span>
                )}
              </Link>
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
