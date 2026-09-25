import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { api } from '../../lib/api';
import { Book } from '../../types';
import { EpubReader, getLightBgByTemp } from './EpubReader';

export const ReaderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books, fetchBookById } = useBookStore();
  const { role, isAuthenticated, openAuthModal } = useAuthStore();
  const { markAsReading, updateReadingProgress } = useMyBooksStore();

  const [book, setBook] = useState<Book | null>(books.find((b) => b.id === id) || null);
  const [isBookLoading, setIsBookLoading] = useState<boolean>(!books.find((b) => b.id === id));
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(17);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_reader_theme');
      if (saved === 'sepia' || saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });
  const [colorTemperature, setColorTemperature] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_reader_temp');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= -50 && parsed <= 50) return parsed;
      }
    }
    return 0;
  });

  const handleThemeChange = (newTheme: 'light' | 'sepia' | 'dark') => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanda_reader_theme', newTheme);
      } catch {}
    }
  };

  const handleColorTempChange = (temp: number) => {
    setColorTemperature(temp);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanda_reader_temp', String(temp));
      } catch {}
    }
  };

  const handleProgressChange = React.useCallback(
    (pct: number) => {
      if (!book) return;
      const totPages = book.pages ? parseInt(String(book.pages)) : 100;
      const calculatedPage = Math.max(1, Math.round((pct / 100) * totPages));
      setCurrentPage((prev) => (prev !== calculatedPage ? calculatedPage : prev));
      if (isAuthenticated) {
        updateReadingProgress(book.id, calculatedPage, totPages);
      }
    },
    [book, isAuthenticated, updateReadingProgress]
  );

  useEffect(() => {
    if (!book && id) {
      setIsBookLoading(true);
      fetchBookById(id)
        .then((b) => {
          setBook(b || null);
          setIsBookLoading(false);
        })
        .catch(() => {
          setIsBookLoading(false);
        });
    } else {
      setIsBookLoading(false);
    }
  }, [book, id, fetchBookById]);

  useEffect(() => {
    if (book && isAuthenticated) {
      const totPages = book.pages ? parseInt(String(book.pages)) : undefined;
      markAsReading(book.id, currentPage, totPages);
    }
  }, [book, isAuthenticated, markAsReading]);

  useEffect(() => {
    if (id && isAuthenticated) {
      api.get(`/api/v1/progress/${id}`)
        .then(({ data }) => {
          if (data.currentPage) {
            setCurrentPage(data.currentPage);
            if (book) {
              const totPages = book.pages ? parseInt(String(book.pages)) : undefined;
              updateReadingProgress(book.id, data.currentPage, totPages);
            }
          }
        })
        .catch(() => {});
    }
  }, [id, isAuthenticated, book, updateReadingProgress]);

  if (isBookLoading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '3.5px solid #CBD5E1',
              borderTopColor: 'var(--blue)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>
            Кітап жүктелуде...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: '0 12px 36px rgba(0,0,0,0.08)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(0,87,168,0.1)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '8px' }}>
            Кітапты оқу үшін тіркеліңіз
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '28px' }}>
            Кітаптарды толық оқу және аудиосын тыңдау тек тіркелген қолданушыларға қолжетімді. Сайтқа кіріңіз немесе жаңа аккаунт ашыңыз.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate(`/signup?redirect=${encodeURIComponent(`/read/${id}`)}`)}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              Тіркелу
            </button>
            <button
              type="button"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/read/${id}`)}`)}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '50px',
                border: '1.5px solid var(--blue)',
                background: '#FFF',
                color: 'var(--blue)',
                cursor: 'pointer',
              }}
            >
              Кіру
            </button>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{ background: 'none', border: 'none', color: 'var(--text-mid)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
            >
              ← Артқа қайту
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!book || (book.isArchived && role !== 'admin')) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2>Кітап табылмады немесе архивтелген</h2>
        <button onClick={() => navigate('/catalog')} className="btn-primary" style={{ marginTop: '20px' }}>
          Каталогқа оралу
        </button>
      </div>
    );
  }

  const lightBgInfo = getLightBgByTemp(colorTemperature);
  const pageBg = theme === 'dark' ? '#020617' : theme === 'sepia' ? '#F4E8CD' : lightBgInfo.containerBg;
  const pageTextColor = theme === 'dark' ? '#F1F5F9' : theme === 'sepia' ? '#433422' : '#0F172A';
  const pageBorderColor = theme === 'dark' ? '#1E293B' : theme === 'sepia' ? '#EAD7B5' : lightBgInfo.border;
  const topBarBg = theme === 'dark' ? '#0F172A' : theme === 'sepia' ? '#FBF0D9' : lightBgInfo.headerBg;

  const isEpub = Boolean(
    book?.ebookUrl &&
      (book.ebookFormat?.toUpperCase() === 'EPUB' ||
        book.ebookUrl.toLowerCase().includes('.epub') ||
        (!book.ebookFormat?.toUpperCase().includes('PDF') && !book.ebookUrl.toLowerCase().includes('.pdf')))
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: pageBg,
        color: pageTextColor,
        transition: 'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          backgroundColor: topBarBg,
          borderBottom: `1px solid ${pageBorderColor}`,
          color: pageTextColor,
          transition: 'background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: pageTextColor,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Артқа
          </button>

          <div className="text-center order-first sm:order-none w-full sm:w-auto">
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: pageTextColor }}>{book.title}</h3>
            <span style={{ fontSize: '12px', opacity: 0.75, color: pageTextColor }}>
              {book.author} {isEpub ? '' : `(Бет: ${currentPage})`}
            </span>
          </div>

          {/* Controls - shown for standard text mode or PDF */}
          {!isEpub && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
              <button
                className="reader-theme-btn"
                onClick={() => setFontSize((f) => Math.max(13, f - 2))}
              >
                A -
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, width: '32px', textAlign: 'center' }}>
                {fontSize}px
              </span>
              <button
                className="reader-theme-btn"
                onClick={() => setFontSize((f) => Math.min(26, f + 2))}
              >
                A +
              </button>

              {/* Theme buttons */}
              <button
                className={`reader-theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Ашық
              </button>
              <button
                className={`reader-theme-btn ${theme === 'sepia' ? 'active' : ''}`}
                onClick={() => setTheme('sepia')}
              >
                Сепия
              </button>
              <button
                className={`reader-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Түнгі
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reader Body */}
      <main className="max-w-5xl mx-auto my-3 sm:my-6 px-3 sm:px-6 mb-20">
        {book.ebookUrl ? (
          isEpub ? (
            <EpubReader
              url={book.ebookUrl}
              bookTitle={book.title}
              bookAuthor={book.author}
              theme={theme}
              onThemeChange={handleThemeChange}
              colorTemperature={colorTemperature}
              onColorTemperatureChange={handleColorTempChange}
              onProgressChange={handleProgressChange}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(0, 84, 148, 0.1)',
                      color: '#005494',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {book.ebookFormat || 'PDF'}
                  </span>
                  <span style={{ fontSize: '13px', opacity: 0.8 }}>Электронды құжат</span>
                </div>

                <a
                  href={book.ebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Толық экранда ашу ↗
                </a>
              </div>

              <div
                style={{
                  width: '100%',
                  height: 'calc(100vh - 180px)',
                  minHeight: '600px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  background: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}
              >
                <iframe
                  src={book.ebookUrl}
                  title={book.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                />
              </div>
            </div>
          )
        ) : (
          <article className="reader-content" style={{ fontSize: `${fontSize}px` }}>
            <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '24px' }}>
              <span className="book-category">{book.category}</span>
              <h1 style={{ fontSize: `${fontSize + 10}px`, fontWeight: 900, marginTop: '12px', marginBottom: '8px' }}>
                {book.title}
              </h1>
              <div style={{ fontSize: '15px', opacity: 0.8 }}>{book.author}</div>
            </div>

            <p>
              {book.description || 'Бұл кітаптың мәтіні электронды кітапхана қорына жүктелген.'}
            </p>

            <p>
              Кітап адам өміріндегі ең адал дос әрі жолбасшы. Бұл туынды оқырманның жан дүниесіне рухани нәр беріп, өмірлік сауалдарына жауап табуына септігін тигізеді. Әрбір бетін парақтаған сайын жаңа ой, терең пайым мен парасатты көзқарас ашыла түседі.
            </p>

            <p>
              Қазақ даласының кеңдігі мен рухани байлығы бабадан балаға осындай құнды шығармалар арқылы жеткен. Сөз өнері – адамзаттың ең ұлы жетістіктерінің бірі. Әрбір тараудағы сөз саптау, ой толғау мен кейіпкерлер бейнесі терең психологиялық және тарихи мазмұнға ие.
            </p>

            <p>
              Tanda платформасы арқылы оқырман кез келген уақытта және кез келген жерде өз ана тіліндегі сапалы әдебиетке қол жеткізе алады. Оқу залындағы қолайлы параметрлер көзіңізді шаршатпай, мазмұнға толықтай енуге мүмкіндік береді.
            </p>
          </article>
        )}
      </main>
    </div>
  );
};
