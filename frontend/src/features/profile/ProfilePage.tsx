import React, { useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useToastStore } from '../../store/useToastStore';
import { TandaPremiumBadge } from '../../components/ui/TandaPremiumBadge';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { books, fetchBooks } = useBookStore();
  const { savedBookIds, fetchSavedBooks, removeSavedBook, getSavedBookIds } = useSavedBooksStore();
  const { currentShelf } = useMyBooksStore();
  const { playBook } = useAudioPlayerStore();
  const { showToast } = useToastStore();

  // Fetch books & saved list
  useEffect(() => {
    fetchBooks();
    fetchSavedBooks();
  }, [fetchBooks, fetchSavedBooks]);

  // Filter saved books that exist and are not archived
  const savedBooks = useMemo(() => {
    const savedIds = getSavedBookIds();
    const savedSet = new Set(savedIds.map(String));
    return books.filter((b) => savedSet.has(String(b.id)) && !b.isArchived);
  }, [books, savedBookIds, currentShelf, getSavedBookIds]);

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
            Сақталған кітаптарды көру үшін кіріңіз
          </h2>
          <p style={{ color: 'var(--text-mid)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            Сақталған кітаптарыңызды көру үшін жүйеге кіріңіз немесе жаңа аккаунт ашыңыз.
          </p>
          <Link to="/" className="btn-primary" style={{ padding: '12px 32px', fontSize: '14px', textDecoration: 'none' }}>
            Басты бетке оралу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto my-4 sm:my-8 px-3 sm:px-6">
      
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
          marginBottom: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        ← Артқа оралу
      </button>

      {/* Saved Books (Кейін оқимын) Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '26px', margin: 0 }}>
              Сақталған кітаптар: {savedBooks.length}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              to="/my-books"
              className="btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                textDecoration: 'none',
              }}
            >
              Менің сөрем
            </Link>
            <Link
              to="/catalog"
              className="btn-outline"
              style={{
                borderColor: 'var(--blue)',
                color: 'var(--blue)',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              + Жаңа кітап қосу
            </Link>
          </div>
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
                    background: book.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {book.coverImage && (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 1,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  {!book.isFree && <TandaPremiumBadge />}
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    {!book.coverImage && (
                      <>
                        <div className="cover-title">{book.title}</div>
                        <div className="cover-author-text">{book.author}</div>
                      </>
                    )}
                  </div>
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
                      onClick={() => {
                        playBook(book);
                        navigate(`/listen/${book.id}`);
                      }}
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
