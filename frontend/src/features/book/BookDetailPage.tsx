import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useToastStore } from '../../store/useToastStore';

export const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books } = useBookStore();
  const { role } = useAuthStore();
  const { playBook, playChapter, togglePlay, currentBook, currentChapter, isPlaying } = useAudioPlayerStore();

  const book = books.find((b) => b.id === id);
  const { isBookSaved, toggleSavedBook } = useSavedBooksStore();
  const { showToast } = useToastStore();

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

  const handleToggleSave = async () => {
    const nowSaved = await toggleSavedBook(book.id);
    if (nowSaved) {
      showToast(`«${book.title}» сақталғандарға қосылды! Профиль бетінен таба аласыз.`, 'success');
    } else {
      showToast(`«${book.title}» сақталғандардан өшірілді`, 'info');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto 80px', padding: '0 24px' }}>
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

      {/* Book details container */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(0,87,168,0.08)',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
        }}
      >
        {/* Cover */}
        {/* Cover */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '300px',
              aspectRatio: '3/4',
              borderRadius: '12px',
              background: book.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '24px',
              position: 'relative',
              color: '#FFF',
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
            <span
              className={`cover-badge ${book.isFree ? 'badge-free' : 'badge-premium'}`}
              style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2 }}
            >
              {book.isFree ? 'Тегін' : 'Премиум'}
            </span>
            <div style={{ position: 'relative', zIndex: 2 }}>
              {!book.coverImage && (
                <>
                  <div className="cover-title" style={{ fontSize: '22px' }}>{book.title}</div>
                  <div className="cover-author-text" style={{ fontSize: '14px' }}>{book.author}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ marginBottom: '12px' }}>
              <span className="book-category">{book.category}</span>
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '8px', lineHeight: 1.2 }}>
              {book.title}
            </h1>

            <p style={{ fontSize: '18px', color: 'var(--text-mid)', fontWeight: 600, marginBottom: '20px' }}>
              Авторы: <span style={{ color: 'var(--text-dark)' }}>{book.author}</span>
            </p>

            <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-mid)', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
              {book.pages && <div>Бет саны: <strong>{book.pages}</strong></div>}
              {book.audioDuration && <div>Ұзақтығы: <strong>{book.audioDuration}</strong></div>}
              {book.audioNarrator && <div>Диктор: <strong>{book.audioNarrator}</strong></div>}
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
              Кітап туралы
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {book.description || 'Сипаттамасы жоқ.'}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to={`/read/${book.id}`}
              className="btn-primary"
              style={{ padding: '14px 28px', fontSize: '15px', background: 'var(--blue)' }}
            >
              Кітапты оқу
            </Link>

            {book.hasAudio && (
              <button
                type="button"
                onClick={() => {
                  if (currentBook?.id === book.id) {
                    togglePlay();
                  } else {
                    playBook(book);
                  }
                }}
                className="btn-primary"
                style={{ padding: '14px 28px', fontSize: '15px', background: 'var(--orange)', cursor: 'pointer' }}
              >
                {isCurrentPlaying ? 'Тоқтату (Пауза)' : 'Аудионы тыңдау'}
              </button>
            )}

            {/* Read later / Bookmark button - only for readers */}
            {role !== 'admin' && (
              <button
                type="button"
                onClick={handleToggleSave}
                style={{
                  padding: '13px 24px',
                  fontSize: '14px',
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
                onMouseEnter={(e) => {
                  if (!isSaved) {
                    e.currentTarget.style.borderColor = 'var(--blue)';
                    e.currentTarget.style.color = 'var(--blue)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaved) {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.color = 'var(--text-dark)';
                  }
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={isSaved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                </svg>
                <span>{isSaved ? 'Сақталды (Кейін оқимын)' : 'Кейін оқимын'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chapters list if audiobook */}
      {book.hasAudio && book.audioChapters && book.audioChapters.length > 0 && (
        <div
          style={{
            marginTop: '32px',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #CBD5E1',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '16px' }}>
            Тараулар ({book.audioChapters.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {book.audioChapters.map((ch, idx) => (
              <div
                key={ch.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentBook?.id !== book.id) playBook(book, idx);
                      else playChapter(idx);
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--blue)',
                      color: '#FFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
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
