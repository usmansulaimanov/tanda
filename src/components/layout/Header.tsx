import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { Book } from '../../types';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, setRole } = useAuthStore();
  const { books, searchQuery, setSearchQuery } = useBookStore();
  const [headerSearch, setHeaderSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchInput = (val: string) => {
    setHeaderSearch(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const q = val.toLowerCase();
    const matches = books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 6));
    setShowResults(true);
  };

  const handleSelectBook = (book: Book) => {
    setShowResults(false);
    setHeaderSearch('');
    if (role === 'admin') {
      navigate(`/admin/books/${book.id}/edit`);
    } else {
      navigate(`/book/${book.id}`);
    }
  };

  const toggleRole = () => {
    const nextRole = role === 'admin' ? 'client' : 'admin';
    setRole(nextRole);
    if (nextRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="tanda-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, maxWidth: '580px' }}>
        {/* Logo */}
        <Link to="/" className="nav-logo">
          tanda<span>.</span>
        </Link>

        {/* Search with dropdown (Exactly as in original design) */}
        <div ref={searchWrapRef} id="navSearchWrap" style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              id="adminHeaderSearch"
              value={headerSearch}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Кітап атын іздеу..."
              autoComplete="off"
              style={{
                width: '100%',
                padding: '9px 14px 9px 36px',
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
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          {/* Autocomplete dropdown */}
          {showResults && (
            <div
              id="navSearchResults"
              style={{
                position: 'absolute',
                left: 0,
                top: 'calc(100% + 8px)',
                width: '360px',
                maxHeight: '380px',
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
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      style={{
                        width: '30px',
                        height: '40px',
                        borderRadius: '4px',
                        background: b.coverImage ? `url(${b.coverImage}) center/cover` : (b.gradient || '#0057A8'),
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

      {/* Nav links */}
      <ul className="nav-links">
        <li>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Басты бет
          </Link>
        </li>
        <li>
          <Link to="/catalog" className={location.pathname === '/catalog' ? 'active' : ''}>
            Кітаптар қоры
          </Link>
        </li>
      </ul>

      {/* Nav actions */}
      <div className="nav-actions" id="navAuthArea">
        {role === 'admin' ? (
          <>
            <span className="user-badge">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
              Әкімші
            </span>
            <Link to="/admin" className="btn-admin-pill">
              Басқару панелі
            </Link>
            <button
              onClick={() => {
                setRole('client');
                navigate('/');
              }}
              className="btn-nav-login"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Оқырман режимі
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setRole('admin');
                navigate('/admin');
              }}
              className="btn-admin-pill"
              style={{ background: '#0057A8' }}
            >
              Әкімшіге өту
            </button>
            <Link to="/catalog" className="btn-nav-reg">
              Кітап оқу
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
