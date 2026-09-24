import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { useToastStore } from '../../store/useToastStore';
import { TandaPremiumBadge } from '../../components/ui/TandaPremiumBadge';

export const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books } = useBookStore();
  const { role, isAuthenticated, openAuthModal } = useAuthStore();
  const { playBook, playChapter, togglePlay, currentBook, currentChapter, isPlaying } = useAudioPlayerStore();

  const book = books.find((b) => b.id === id);
  const { isBookSaved, toggleSavedBook } = useSavedBooksStore();
  const { markAsReading, markAsWantToRead, markAsCompleted, removeBookFromShelf, getBookStatus, currentShelf } = useMyBooksStore();
  const { showToast } = useToastStore();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [id]);

  if (!book || (book.isArchived && role !== 'admin')) {
    return (
      <div style={{ maxWidth: '800px', margin: '80px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)' }}>Кітап табылмады немесе архивтелген</h2>
        <p style={{ color: 'var(--text-mid)', marginTop: '8px' }}>
          Бұл кітап әкімші тарапынан архивке қойылған немесе өшірілген.
        </p>
        <button
          onClick={() => navigate('/catalog')}
          className="btn-primary"
          style={{ marginTop: '20px' }}
        >
          Каталогқа оралу
        </button>
      </div>
    );
  }

  const isCurrentPlaying = currentBook?.id === book.id && isPlaying;
  const isSaved = isBookSaved(book.id);
  const bookStatus = getBookStatus(book.id);
  const isCompleted = bookStatus === 'completed';

  const handleReadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Кітапты оқу үшін тіркеліңіз немесе аккаунтқа кіріңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/read/${book.id}`)}`);
      return;
    }
    markAsReading(book.id, 1, book.pages ? parseInt(String(book.pages)) : undefined);
    navigate(`/read/${book.id}`);
  };

  const handleAudioClick = () => {
    if (!isAuthenticated) {
      showToast('Аудионы тыңдау үшін тіркеліңіз немесе аккаунтқа кіріңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/listen/${book.id}`)}`);
      return;
    }
    markAsReading(book.id, 1, book.pages ? parseInt(String(book.pages)) : undefined);
    if (currentBook?.id !== book.id) {
      playBook(book);
    }
    navigate(`/listen/${book.id}`);
  };

  const handleChapterClick = (idx: number) => {
    if (!isAuthenticated) {
      showToast('Аудионы тыңдау үшін тіркеліңіз немесе аккаунтқа кіріңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/listen/${book.id}`)}`);
      return;
    }
    markAsReading(book.id, 1, book.pages ? parseInt(String(book.pages)) : undefined);
    if (currentBook?.id !== book.id) {
      playBook(book, idx);
    } else {
      playChapter(idx);
    }
    navigate(`/listen/${book.id}`);
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      showToast('Кітапты сақтау үшін аккаунтқа кіріңіз немесе тіркеліңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/book/${book.id}`)}`);
      return;
    }
    const nowSaved = await toggleSavedBook(book.id);
    if (nowSaved) {
      if (!isCompleted && bookStatus !== 'reading') {
        markAsWantToRead(book.id);
      }
    } else {
      if (bookStatus === 'want_to_read') {
        removeBookFromShelf(book.id);
      }
    }
  };

  const handleToggleCompleted = () => {
    if (!isAuthenticated) {
      showToast('Кітапты белгілеу үшін тіркеліңіз немесе аккаунтқа кіріңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/book/${book.id}`)}`);
      return;
    }
    if (isCompleted) {
      if (isSaved) {
        markAsWantToRead(book.id);
      } else {
        removeBookFromShelf(book.id);
      }
    } else {
      markAsCompleted(book.id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto my-4 sm:my-8 px-3 sm:px-6">
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

      {/* Book details container */}
      <div
        className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 md:gap-10"
      >
        {/* Cover */}
        <div className="flex justify-center md:justify-start">
          <div
            className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[300px] aspect-[3/4] rounded-2xl relative shadow-xl overflow-hidden flex flex-col justify-end p-5 text-white"
            style={{
              background: book.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
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
            {!book.isFree && (
              <TandaPremiumBadge size="lg" position="left" style={{ top: '16px', left: '16px' }} />
            )}
            <div style={{ position: 'relative', zIndex: 2 }}>
              {!book.coverImage && (
                <>
                  <div className="cover-title" style={{ fontSize: '20px' }}>{book.title}</div>
                  <div className="cover-author-text" style={{ fontSize: '13px' }}>{book.author}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ marginBottom: '10px' }}>
              <span className="book-category">{book.category}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-2 leading-tight">
              {book.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 font-semibold mb-4">
              Авторы: <span className="text-slate-900 font-bold">{book.author}</span>
            </p>

            <div className="flex flex-wrap gap-3 sm:gap-5 text-xs sm:text-sm text-slate-600 mb-5 pb-4 border-b border-slate-100">
              {book.pages && <div>Бет саны: <strong>{book.pages}</strong></div>}
              {book.ebookFormat && <div>Форматы: <strong>{book.ebookFormat}</strong></div>}
              {book.audioDuration && <div>Ұзақтығы: <strong>{book.audioDuration}</strong></div>}
              {book.audioNarrator && <div>Диктор: <strong>{book.audioNarrator}</strong></div>}
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mb-2">
              Кітап туралы
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {book.description || 'Сипаттамасы жоқ.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3 mt-6 sm:mt-8 items-stretch sm:items-center">
            <button
              type="button"
              onClick={handleReadClick}
              className="btn-primary w-full sm:w-auto text-center justify-center"
              style={{ padding: '12px 24px', fontSize: '14px', background: 'var(--blue)', cursor: 'pointer', border: 'none' }}
            >
              Кітапты оқу
            </button>

            {book.hasAudio && (
              <button
                type="button"
                onClick={handleAudioClick}
                className="btn-primary w-full sm:w-auto text-center justify-center"
                style={{ padding: '12px 24px', fontSize: '14px', background: 'var(--orange)', cursor: 'pointer', border: 'none' }}
              >
                {isCurrentPlaying ? 'Тоқтату (Пауза)' : 'Аудионы тыңдау'}
              </button>
            )}

            {/* Read later / Bookmark button - only for readers */}
            {role !== 'admin' && (
              <>
                <button
                  type="button"
                  onClick={handleToggleSave}
                  className="w-full sm:w-auto justify-center"
                  style={{
                    padding: '11px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '50px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    background: isSaved ? 'rgba(239, 126, 0, 0.12)' : '#FFFFFF',
                    color: isSaved ? 'var(--orange)' : 'var(--text-dark)',
                    border: isSaved ? '1.5px solid var(--orange)' : '1.5px solid #CBD5E1',
                    boxShadow: isSaved ? '0 2px 8px rgba(239, 126, 0, 0.2)' : 'none',
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill={isSaved ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                  </svg>
                  <span>Кейін оқимын</span>
                </button>

                {/* Mark as Completed (Оқылған) button */}
                <button
                  type="button"
                  onClick={handleToggleCompleted}
                  className="w-full sm:w-auto justify-center"
                  style={{
                    padding: '11px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '50px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    background: isCompleted ? '#ECFDF5' : '#FFFFFF',
                    color: isCompleted ? '#059669' : 'var(--text-dark)',
                    border: isCompleted ? '1.5px solid #10B981' : '1.5px solid #CBD5E1',
                    boxShadow: isCompleted ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none',
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
                  <span>{isCompleted ? 'Оқылған ✓' : 'Оқылған'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chapters list if audiobook */}
      {book.hasAudio && book.audioChapters && book.audioChapters.length > 0 && (
        <div
          className="mt-6 sm:mt-8 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm"
        >
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '14px' }}>
            Тараулар: {book.audioChapters.length}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {book.audioChapters.map((ch, idx) => (
              <div
                key={ch.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 8px',
                  borderBottom: idx === book.audioChapters!.length - 1 ? 'none' : '1px solid #F1F5F9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleChapterClick(idx)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(0, 84, 148, 0.1)',
                      color: 'var(--blue)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      paddingLeft: '2px',
                    }}
                  >
                    ▶
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                    {ch.title}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-mid)', fontWeight: 600 }}>
                  {ch.duration}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
