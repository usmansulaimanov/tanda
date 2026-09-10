import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';

interface AdminSidebarProps {
  currentFilter?: 'all' | 'active' | 'archived';
  onFilterChange?: (filter: 'all' | 'active' | 'archived') => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentFilter = 'all',
  onFilterChange,
}) => {
  const location = useLocation();
  const { books } = useBookStore();
  const { user } = useAuthStore();

  const totalCount = books.length;
  const activeCount = books.filter((b) => !b.isArchived).length;
  const archivedCount = books.filter((b) => b.isArchived).length;
  const audioCount = books.filter((b) => b.hasAudio).length;

  const isFormPage = location.pathname.includes('/admin/books');
  const isNewBookPage = location.pathname === '/admin/books/new';
  const isDashboard = location.pathname === '/admin';

  return (
    <aside className="admin-sidebar">
      {/* Sidebar Header: Brand & Title */}
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-title-row">
          <div className="admin-sidebar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <div>
            <h2 className="admin-sidebar-heading">Басқару панелі</h2>
            <div className="admin-sidebar-badge-row">
              <span className="admin-sidebar-id-badge">ID: {user?.idNumber || '000 001'}</span>
              <span className="admin-sidebar-role-badge">Бас Әкімші</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin User Info Card */}
      <div className="admin-sidebar-user-card">
        <div className="admin-sidebar-avatar">
          {user?.name ? user.name.trim().charAt(0).toUpperCase() : 'А'}
        </div>
        <div className="admin-sidebar-user-details">
          <div className="admin-sidebar-user-name">{user?.name || 'Бас Администратор'}</div>
          <div className="admin-sidebar-user-email">{user?.email || 'admin@tanda.kz'}</div>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <div className="admin-sidebar-section">
        <div className="admin-sidebar-section-title">Кітаптар қоры</div>
        <nav className="admin-sidebar-nav">
          {/* All Books */}
          {isDashboard && onFilterChange ? (
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className={`admin-sidebar-nav-item ${currentFilter === 'all' ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                <path d="M6 6h10"></path>
                <path d="M6 10h10"></path>
              </svg>
              <span>Барлық кітаптар</span>
              <span className="admin-sidebar-nav-count">{totalCount}</span>
            </button>
          ) : (
            <Link
              to="/admin"
              className={`admin-sidebar-nav-item ${isDashboard && currentFilter === 'all' ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                <path d="M6 6h10"></path>
                <path d="M6 10h10"></path>
              </svg>
              <span>Барлық кітаптар</span>
              <span className="admin-sidebar-nav-count">{totalCount}</span>
            </Link>
          )}

          {/* Active Books */}
          {isDashboard && onFilterChange ? (
            <button
              type="button"
              onClick={() => onFilterChange('active')}
              className={`admin-sidebar-nav-item ${currentFilter === 'active' ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Белсенді кітаптар</span>
              <span className="admin-sidebar-nav-count active-badge">{activeCount}</span>
            </button>
          ) : (
            <Link
              to="/admin"
              className="admin-sidebar-nav-item"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Белсенді кітаптар</span>
              <span className="admin-sidebar-nav-count active-badge">{activeCount}</span>
            </Link>
          )}

          {/* Archived Books */}
          {isDashboard && onFilterChange ? (
            <button
              type="button"
              onClick={() => onFilterChange('archived')}
              className={`admin-sidebar-nav-item ${currentFilter === 'archived' ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="5" x="2" y="3" rx="1"></rect>
                <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path>
                <path d="M10 12h4"></path>
              </svg>
              <span>Архивтелгендер</span>
              <span className="admin-sidebar-nav-count archived-badge">{archivedCount}</span>
            </button>
          ) : (
            <Link
              to="/admin"
              className="admin-sidebar-nav-item"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="5" x="2" y="3" rx="1"></rect>
                <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path>
                <path d="M10 12h4"></path>
              </svg>
              <span>Архивтелгендер</span>
              <span className="admin-sidebar-nav-count archived-badge">{archivedCount}</span>
            </Link>
          )}

          {/* Add Book Button in Sidebar */}
          <Link
            to="/admin/books/new"
            className={`admin-sidebar-nav-item add-book-item ${isNewBookPage ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Жаңа кітап қосу</span>
          </Link>
        </nav>
      </div>

      {/* Quick Links Section */}
      <div className="admin-sidebar-section">
        <div className="admin-sidebar-section-title">Жылдам сілтемелер</div>
        <nav className="admin-sidebar-nav">
          <Link to="/catalog" className="admin-sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <span>Каталогты қарау</span>
          </Link>

          <Link to="/" className="admin-sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Басты бетке өту</span>
          </Link>
        </nav>
      </div>

      {/* Stats Summary Widget */}
      <div className="admin-sidebar-stats-card">
        <div className="admin-sidebar-stats-title">Қор статистикасы</div>
        <div className="admin-sidebar-stats-grid">
          <div className="admin-sidebar-stat-box">
            <span className="admin-sidebar-stat-label">Барлығы</span>
            <span className="admin-sidebar-stat-value">{totalCount}</span>
          </div>
          <div className="admin-sidebar-stat-box">
            <span className="admin-sidebar-stat-label">Аудио</span>
            <span className="admin-sidebar-stat-value">{audioCount}</span>
          </div>
          <div className="admin-sidebar-stat-box">
            <span className="admin-sidebar-stat-label">Белсенді</span>
            <span className="admin-sidebar-stat-value" style={{ color: '#047857' }}>{activeCount}</span>
          </div>
          <div className="admin-sidebar-stat-box">
            <span className="admin-sidebar-stat-label">Архивте</span>
            <span className="admin-sidebar-stat-value" style={{ color: '#64748B' }}>{archivedCount}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
