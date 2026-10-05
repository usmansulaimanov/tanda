import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { useToastStore } from '../../store/useToastStore';
import { TandaPremiumBadge } from './TandaPremiumBadge';
import { resolveMediaUrl } from '../../utils/mediaUtils';

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const navigate = useNavigate();
  const { role, isAuthenticated, openAuthModal } = useAuthStore();
  const { playBook } = useAudioPlayerStore();
  const { isBookSaved, toggleSavedBook } = useSavedBooksStore();
  const { toggleBookStatus, hasStatus } = useMyBooksStore();
  const { showToast } = useToastStore();

  const isCompleted = hasStatus(book.id, 'completed');
  const isSaved = hasStatus(book.id, 'want_to_read') || isBookSaved(book.id);

  const hasAudio = Boolean(
    book.hasAudio ||
    (book.audioUrl && book.audioUrl.trim()) ||
    (book.audioChapters && book.audioChapters.length > 0)
  );

  const hasText = Boolean(
    book.hasEbook ||
    (book.ebookUrl && book.ebookUrl.trim()) ||
    (book.pdfUrl && book.pdfUrl.trim()) ||
    (book.epubUrl && book.epubUrl.trim()) ||
    (book.content && book.content.trim())
  );

  const handleReadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Кітапты оқу үшін тіркеліңіз немесе аккаунтқа кіріңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/read/${book.id}`)}`);
      return;
    }
    navigate(`/read/${book.id}`);
  };

  const handleListenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Аудионы тыңдау үшін тіркеліңіз немесе аккаунтқа кіріңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/listen/${book.id}`)}`);
      return;
    }
    playBook(book);
    navigate(`/listen/${book.id}`);
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Кітапты сақтау үшін аккаунтқа кіріңіз немесе тіркеліңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/book/${book.id}`)}`);
      return;
    }
    await toggleBookStatus(book.id, 'want_to_read');
  };

  const handleCompletedClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Кітапты белгілеу үшін аккаунтқа кіріңіз немесе тіркеліңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/book/${book.id}`)}`);
      return;
    }
    await toggleBookStatus(book.id, 'completed');
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
            src={resolveMediaUrl(book.coverImage)}
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

        {/* Premium badge */}
        {!book.isFree && <TandaPremiumBadge position="left" />}

        {/* Quick actions top-right - only for readers */}
        {role !== 'admin' && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 3,
            }}
          >
            {/* Quick bookmark toggle on card */}
            <button
              type="button"
              onClick={handleBookmarkClick}
              title={isSaved ? "Сақталғандардан өшіру" : "Кейін оқимын"}
              style={{
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

            {/* Quick completed toggle button */}
            <button
              type="button"
              onClick={handleCompletedClick}
              title={isCompleted ? "Оқылғаннан өшіру" : "Оқып болдым"}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isCompleted ? '#10B981' : 'rgba(0, 20, 45, 0.55)',
                backdropFilter: 'blur(4px)',
                border: isCompleted ? 'none' : '1px solid rgba(255,255,255,0.3)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginTop: '4px' }}>
          <span className="book-category">{book.category}</span>
          {book.averageRating !== undefined && book.averageRating > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#D97706',
                background: '#FEF3C7',
                padding: '1px 5px',
                borderRadius: '6px',
              }}
            >
              ★ {book.averageRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <div className="book-actions" onClick={(e) => e.stopPropagation()}>
        {hasText ? (
          <button
            type="button"
            onClick={handleReadClick}
            className="btn-book-action btn-read"
            title="Кітапты оқу"
          >
            Оқу
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="btn-book-action btn-disabled"
            title="Электронды кітап нұсқасы жүктелмеген"
          >
            Оқу
          </button>
        )}

        {hasAudio ? (
          <button
            type="button"
            onClick={handleListenClick}
            className="btn-book-action btn-listen"
            title="Аудионы тыңдау"
          >
            Тыңдау
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="btn-book-action btn-disabled"
            title="Аудио нұсқасы жүктелмеген"
          >
            Тыңдау
          </button>
        )}
      </div>
    </div>
  );
};
