import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useToastStore } from '../../store/useToastStore';

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const { playBook } = useAudioPlayerStore();
  const { isBookSaved, toggleSavedBook } = useSavedBooksStore();
  const { showToast } = useToastStore();

  const isSaved = isBookSaved(book.id);

  const handleListenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playBook(book);
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggleSavedBook(book.id);
    if (nowSaved) {
      showToast(`«${book.title}» сақталғандарға қосылды`, 'success');
    } else {
      showToast(`«${book.title}» сақталғандардан өшірілді`, 'info');
    }
  };

  return (
    <div
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

        <span className={`cover-badge ${book.isFree ? 'badge-free' : 'badge-premium'}`} style={{ zIndex: 3 }}>
          {book.isFree ? 'Тегін' : 'Премиум'}
        </span>

        {/* Quick bookmark toggle on card - only for readers */}
        {role !== 'admin' && (
          <button
            type="button"
            onClick={handleBookmarkClick}
            title={isSaved ? 'Сақталғандардан өшіру' : 'Кейін оқимын (Сақтау)'}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isSaved ? 'var(--orange)' : 'rgba(0, 20, 45, 0.55)',
              backdropFilter: 'blur(4px)',
              border: isSaved ? 'none' : '1px solid rgba(255,255,255,0.3)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              zIndex: 3,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
            </svg>
          </button>
        )}

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
        {book.hasAudio ? (
          <button
            type="button"
            onClick={handleListenClick}
            className="btn-book-action btn-listen"
          >
            Тыңдау
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/book/${book.id}`)}
            className="btn-book-action"
            style={{ background: '#F1F5F9', color: 'var(--text-mid)' }}
          >
            Қарау
          </button>
        )}
      </div>
    </div>
  );
};
