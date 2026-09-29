import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book } from '../../../types';
import { BookShelfStatus } from '../../../store/useMyBooksStore';
import { TandaPremiumBadge } from '../../../components/ui/TandaPremiumBadge';

interface ShelfGridViewProps {
  items: { book: Book; record: { bookId: string | number; status: BookShelfStatus } }[];
  activeMenuBookId: string | null;
  setActiveMenuBookId: (id: string | null) => void;
  handleChangeStatus: (bookId: string, status: BookShelfStatus, title: string) => void;
  handleRemove: (bookId: string, title: string) => void;
  onPlayAudio: (book: Book) => void;
}

export const ShelfGridView: React.FC<ShelfGridViewProps> = ({
  items,
  activeMenuBookId,
  setActiveMenuBookId,
  handleChangeStatus,
  handleRemove,
  onPlayAudio,
}) => {
  const navigate = useNavigate();

  return (
    <div className="books-grid w-full min-w-0 max-w-full">
      {items.map(({ book, record }) => {
        const isMenuOpen = activeMenuBookId === String(book.id);
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

        return (
          <div
            key={book.id}
            className="book-card w-full min-w-0 overflow-hidden"
            onClick={() => navigate(`/book/${book.id}`)}
            style={{ cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column' }}
          >
            {/* Book Cover */}
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

              {/* Premium badge */}
              {!book.isFree && <TandaPremiumBadge />}

              {/* Status Options Menu Trigger Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveMenuBookId(isMenuOpen ? null : String(book.id));
                }}
                title="Күйін өзгерту"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0, 20, 45, 0.65)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'all 0.2s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="2"></circle>
                  <circle cx="12" cy="5" r="2"></circle>
                  <circle cx="12" cy="19" r="2"></circle>
                </svg>
              </button>

              {/* Status Popover Menu */}
              {isMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '48px',
                    right: '12px',
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '6px',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.25)',
                    border: '1px solid #E2E8F0',
                    zIndex: 100,
                    minWidth: '190px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Күйді өзгерту
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleChangeStatus(String(book.id), 'reading', book.title);
                      setActiveMenuBookId(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      textAlign: 'left',
                      borderRadius: '8px',
                      border: 'none',
                      background: record.status === 'reading' ? '#F1F5F9' : 'transparent',
                      color: record.status === 'reading' ? 'var(--blue)' : 'var(--text-dark)',
                      fontWeight: record.status === 'reading' ? 800 : 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Қазір оқуда
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleChangeStatus(String(book.id), 'completed', book.title);
                      setActiveMenuBookId(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      textAlign: 'left',
                      borderRadius: '8px',
                      border: 'none',
                      background: record.status === 'completed' ? '#F1F5F9' : 'transparent',
                      color: record.status === 'completed' ? '#059669' : 'var(--text-dark)',
                      fontWeight: record.status === 'completed' ? 800 : 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Оқылып бітті
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleChangeStatus(String(book.id), 'want_to_read', book.title);
                      setActiveMenuBookId(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      textAlign: 'left',
                      borderRadius: '8px',
                      border: 'none',
                      background: record.status === 'want_to_read' ? '#F1F5F9' : 'transparent',
                      color: record.status === 'want_to_read' ? 'var(--orange)' : 'var(--text-dark)',
                      fontWeight: record.status === 'want_to_read' ? 800 : 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                    </svg>
                    Енді оқимын
                  </button>

                  <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 0' }} />

                  <button
                    type="button"
                    onClick={() => {
                      handleRemove(String(book.id), book.title);
                      setActiveMenuBookId(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      textAlign: 'left',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#EF4444',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                    Сөреден өшіру
                  </button>
                </div>
              )}
            </div>

            {/* Book Info */}
            <div className="book-info">
              <h3 className="book-title" title={book.title}>
                {book.title}
              </h3>
              <p className="book-author">{book.author}</p>

              {/* Status pill badge */}
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background:
                      record.status === 'reading'
                        ? 'rgba(0, 84, 148, 0.1)'
                        : record.status === 'completed'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(239, 126, 0, 0.12)',
                    color:
                      record.status === 'reading'
                        ? 'var(--blue)'
                        : record.status === 'completed'
                        ? '#059669'
                        : 'var(--orange)',
                  }}
                >
                  {record.status === 'reading' && 'Қазір оқуда'}
                  {record.status === 'completed' && 'Оқылып бітті'}
                  {record.status === 'want_to_read' && 'Енді оқимын'}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="book-actions" onClick={(e) => e.stopPropagation()}>
              {hasText ? (
                <Link to={`/read/${book.id}`} className="btn-book-action btn-read">
                  Оқу
                </Link>
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
                  onClick={() => {
                    onPlayAudio(book);
                    navigate(`/listen/${book.id}`);
                  }}
                  className="btn-book-action btn-listen"
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

              <button
                type="button"
                onClick={() => navigate(`/book/${book.id}`)}
                className="btn-book-action"
                style={{ background: '#F1F5F9', color: 'var(--text-mid)', gridColumn: 'span 2' }}
                title="Толық ақпарат"
              >
                Ақпарат
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
