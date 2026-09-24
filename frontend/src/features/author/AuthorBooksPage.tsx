import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { Book } from '../../types';

export const AuthorBooksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, isAuthInitialized } = useAuthStore();
  const { books, fetchBooks } = useBookStore();
  const { showToast } = useToastStore();

  const isAuthor = Boolean(role === 'author' || user?.isAuthor || user?.role === 'author');
  const isSuperAdmin = Boolean(user?.isSuperAdmin || (role === 'admin' && !user?.duty));

  useEffect(() => {
    if (isAuthInitialized && user && (isAuthor || isSuperAdmin)) {
      fetchBooks({ includeArchived: true });
    }
  }, [isAuthInitialized, user, isAuthor, isSuperAdmin, fetchBooks]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Бәрі');

  const authorName = useMemo(() => {
    return (user?.assignedAuthorName?.trim() || user?.name?.trim() || '').toLowerCase();
  }, [user]);

  const assignedIds = useMemo(() => {
    return new Set(user?.assignedBookIds || []);
  }, [user?.assignedBookIds]);

  // Filter ONLY this author's books
  const myBooks = useMemo(() => {
    if (!authorName && assignedIds.size === 0) return [];
    return books.filter((b) => {
      if (assignedIds.has(b.id)) return true;
      if (!b.author) return false;
      const bAuthor = b.author.toLowerCase().trim();
      return bAuthor === authorName || bAuthor.includes(authorName) || authorName.includes(bAuthor);
    });
  }, [books, assignedIds, authorName]);

  // Filtered by search & category
  const filteredBooks = useMemo(() => {
    return myBooks.filter((book) => {
      if (selectedCategory !== 'Бәрі' && book.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = book.title.toLowerCase().includes(q);
        const matchCategory = book.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchCategory) return false;
      }
      return true;
    });
  }, [myBooks, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    myBooks.forEach((b) => {
      if (b.category?.trim()) set.add(b.category.trim());
    });
    return ['Бәрі', ...Array.from(set)];
  }, [myBooks]);

  if (!isAuthInitialized || !user) {
    return null;
  }

  return (
    <section className="author-books-section" style={{ minHeight: '80vh', padding: '32px 16px', background: '#F8FAFC' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1.5px solid #E2E8F0',
            padding: '28px 32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <span
                  style={{
                    background: '#EFF6FF',
                    color: 'var(--blue)',
                    padding: '4px 12px',
                    borderRadius: '50px',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  АВТОРЛЫҚ КІТАПТАР
                </span>
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Кітаптарым
              </h1>
              <p style={{ fontSize: '13.5px', color: '#64748B', marginTop: '6px', margin: 0 }}>
                Сізге бекітілген кітаптар саны: <strong style={{ color: 'var(--blue)' }}>{myBooks.length}</strong>
              </p>
            </div>

            {/* Quick Link to Stats */}
            <Link
              to="/author/stats"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '50px',
                background: '#FFF7ED',
                color: 'var(--orange)',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                border: '1px solid #FED7AA',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Авторлық статистиканы көру</span>
            </Link>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '24px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
              <input
                type="text"
                placeholder="Кітап атын іздеу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 36px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#F8FAFC',
                  boxSizing: 'border-box',
                }}
              />
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2.5"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>

            {categories.length > 2 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      border: `1.5px solid ${selectedCategory === cat ? 'var(--blue)' : '#CBD5E1'}`,
                      background: selectedCategory === cat ? 'var(--blue)' : '#FFFFFF',
                      color: selectedCategory === cat ? '#FFFFFF' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Books Content */}
        {filteredBooks.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.5px solid #E2E8F0',
              padding: '60px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 8px 0' }}>
              {searchQuery ? 'Іздеу бойынша кітап табылмады' : 'Сізге әлі кітап бекітілмеген'}
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '440px', margin: '0 auto' }}>
              {searchQuery ? 'Басқа атаумен іздеп көріңіз.' : 'Кітаптар жүйеге қосылып, сіздің профиліңізге бекітілген соң осы жерден көре аласыз.'}
            </p>
          </div>
        ) : (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.5px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>№</th>
                    <th style={{ width: '60px' }}>Мұқаба</th>
                    <th>Кітап атауы</th>
                    <th>Жанры</th>
                    <th>Беттер саны</th>
                    <th>Аудио</th>
                    <th>Қолжетімділік</th>
                    <th style={{ textAlign: 'right' }}>Көрінуі</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book, idx) => (
                    <tr key={book.id}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12.5px' }}>
                        {idx + 1}
                      </td>

                      {/* Cover Thumbnail */}
                      <td>
                        <div
                          style={{
                            width: '44px',
                            height: '58px',
                            borderRadius: '6px',
                            background: book.gradient || '#0057A8',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFF',
                            fontSize: '8px',
                            fontWeight: 800,
                            textAlign: 'center',
                            padding: '2px',
                            overflow: 'hidden',
                          }}
                        >
                          {book.coverImage ? (
                            <img src={book.coverImage} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                          ) : (
                            <span>{book.title}</span>
                          )}
                        </div>
                      </td>

                      {/* Title */}
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '14px' }}>
                          {book.title}
                        </div>
                        <div style={{ color: 'var(--text-mid)', fontSize: '12px', marginTop: '2px' }}>
                          {book.author}
                        </div>
                      </td>

                      {/* Genre */}
                      <td>
                        <span className="book-category">{book.category}</span>
                      </td>

                      {/* Pages */}
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 600 }}>
                          {book.pages ? `${book.pages} бет` : '—'}
                        </div>
                      </td>

                      {/* Audio */}
                      <td>
                        {book.hasAudio ? (
                          <div style={{ fontSize: '12px', color: 'var(--orange)', fontWeight: 700 }}>
                            {book.audioDuration ? book.audioDuration : 'Аудио бар'}
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: '#94A3B8' }}>—</div>
                        )}
                      </td>

                      {/* Free / Premium */}
                      <td>
                        <span
                          className={`cover-badge ${book.isFree ? 'badge-free' : 'badge-premium'}`}
                          style={{ position: 'static', display: 'inline-block', fontSize: '11px', padding: '3px 8px' }}
                        >
                          {book.isFree ? 'Тегін' : 'Премиум'}
                        </span>
                      </td>

                      {/* Visibility */}
                      <td style={{ textAlign: 'right' }}>
                        {book.isArchived ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#64748B',
                              background: '#F1F5F9',
                              padding: '4px 10px',
                              borderRadius: '50px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }}></span>
                            Архивте
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#047857',
                              background: '#ECFDF5',
                              padding: '4px 10px',
                              borderRadius: '50px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                            Белсенді
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
