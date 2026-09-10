import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useToastStore } from '../../store/useToastStore';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { books } = useBookStore();
  const { savedBookIds, removeSavedBook } = useSavedBooksStore();
  const { playBook } = useAudioPlayerStore();
  const { showToast } = useToastStore();

  // Filter saved books that exist and are not archived
  const savedBooks = useMemo(() => {
    return books.filter((b) => savedBookIds.includes(b.id) && !b.isArchived);
  }, [books, savedBookIds]);

  const handleLogout = () => {
    logout();
    showToast('Жүйеден сәтті шықтыңыз', 'info');
    navigate('/');
  };

  const handleRemoveSaved = (bookId: string, bookTitle: string) => {
    removeSavedBook(bookId);
    showToast(`«${bookTitle}» сақталғандардан өшірілді`, 'info');
  };

  if (!isAuthenticated || !user) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '48px 32px',
            boxShadow: '0 12px 36px rgba(0, 84, 148, 0.08)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(0, 84, 148, 0.1)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '10px' }}>
            Профильді көру үшін кіріңіз
          </h2>
          <p style={{ color: 'var(--text-mid)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            Сақталған кітаптарыңыз бен жеке деректеріңізді көру үшін жүйеге кіріңіз немесе жаңа аккаунт ашыңыз.
          </p>
          <Link to="/" className="btn-primary" style={{ padding: '12px 32px', fontSize: '14px', textDecoration: 'none' }}>
            Басты бетке оралу
          </Link>
        </div>
      </div>
    );
  }

  const initialLetter = user.name ? user.name.trim().charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'О');

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto 80px', padding: '0 24px' }}>
      
      {/* Top back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-mid)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '24px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        ← Артқа оралу
      </button>

      {/* Profile Header Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '32px 36px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 30px rgba(0, 45, 80, 0.05)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          marginBottom: '40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '280px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #005494 0%, #EF7E00 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 900,
              boxShadow: '0 6px 18px rgba(0, 84, 148, 0.25)',
              flexShrink: 0,
              textTransform: 'uppercase',
            }}
          >
            {initialLetter}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                {user.name || 'Оқырман'}
              </h1>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '50px',
                  background: user.role === 'admin' ? 'rgba(0, 84, 148, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: user.role === 'admin' ? 'var(--blue)' : '#047857',
                }}
              >
                {user.role === 'admin' ? 'Әкімшілік (Админ)' : 'Оқырман'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', color: 'var(--text-mid)', fontSize: '14px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
              <span>{user.email}</span>
            </div>

            <div style={{ marginTop: '8px', fontSize: '13px', color: '#64748B' }}>
              Сақталған кітаптар: <strong style={{ color: 'var(--orange)' }}>{savedBooks.length} кітап</strong>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {user.role === 'admin' && (
            <Link
              to="/admin"
              className="btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                textDecoration: 'none',
                background: 'var(--blue)',
              }}
            >
              Басқару панелі
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              color: '#DC2626',
              padding: '10px 20px',
              borderRadius: '50px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FEE2E2';
              e.currentTarget.style.borderColor = '#F87171';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FEF2F2';
              e.currentTarget.style.borderColor = '#FCA5A5';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Аккаунттан шығу
          </button>
        </div>
      </div>

      {/* Saved Books (Кейін оқимын) Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="section-tag">Менің жинағым</span>
            <h2 className="section-title" style={{ fontSize: '26px', margin: '6px 0 4px' }}>
              Сақталған кітаптар ({savedBooks.length})
            </h2>
            <p className="section-sub" style={{ margin: 0, fontSize: '14px' }}>
              «Кейін оқимын» батырмасы арқылы сақталған жеке кітаптар жинағыңыз
            </p>
          </div>

          <Link
            to="/catalog"
            className="btn-outline"
            style={{
              borderColor: 'var(--blue)',
              color: 'var(--blue)',
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            + Жаңа кітап қосу
          </Link>
        </div>

        {/* Books Grid */}
        {savedBooks.length > 0 ? (
          <div className="books-grid">
            {savedBooks.map((book) => (
              <div
                key={book.id}
                className="book-card"
                onClick={() => navigate(`/book/${book.id}`)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <div
                  className="book-cover"
                  style={{
                    background: book.coverImage
                      ? `url(${book.coverImage}) center/cover`
                      : (book.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)'),
                  }}
                >
                  <span className={`cover-badge ${book.isFree ? 'badge-free' : 'badge-premium'}`}>
                    {book.isFree ? 'Тегін' : 'Премиум'}
                  </span>
                  <div className="cover-title">{book.title}</div>
                  <div className="cover-author-text">{book.author}</div>
                </div>

                <div className="book-meta">
                  <div className="book-title">{book.title}</div>
                  <div className="book-author">{book.author}</div>
                  <span className="book-category">{book.category}</span>
                </div>

                <div className="book-actions" onClick={(e) => e.stopPropagation()}>
                  <Link to={`/read/${book.id}`} className="btn-book-action btn-read">
                    Оқу
                  </Link>

                  {book.hasAudio && (
                    <button
                      type="button"
                      onClick={() => playBook(book)}
                      className="btn-book-action btn-listen"
                    >
                      Тыңдау
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveSaved(book.id, book.title)}
                    className="btn-book-action"
                    title="Сақталғандардан өшіру"
                    style={{
                      background: '#FEF2F2',
                      color: '#DC2626',
                      borderColor: '#FCA5A5',
                    }}
                  >
                    Өшіру
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '60px 24px',
              textAlign: 'center',
              border: '2px dashed #E2E8F0',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#F8FAFC',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
              Әзірге сақталған кітаптар жоқ
            </h3>
            <p style={{ color: 'var(--text-mid)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              Кітаптар қорына өтіп, өзіңізге ұнаған кез келген кітаптағы <strong>«Кейін оқимын»</strong> батырмасын басыңыз. Олар осы бетке сақталады.
            </p>
            <Link
              to="/catalog"
              className="btn-primary"
              style={{ padding: '12px 28px', fontSize: '14px', textDecoration: 'none' }}
            >
              Кітаптар қорына өту
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
