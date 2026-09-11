import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api';
import { Book } from '../../types';

export const ReaderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books, fetchBookById } = useBookStore();
  const { role, isAuthenticated, openAuthModal } = useAuthStore();

  const [book, setBook] = useState<Book | null>(books.find((b) => b.id === id) || null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(17);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');

  useEffect(() => {
    if (!book && id) {
      fetchBookById(id)
        .then((b) => setBook(b || null))
        .catch(() => {});
    }
  }, [book, id, fetchBookById]);

  useEffect(() => {
    if (id && isAuthenticated) {
      api.get(`/api/progress/${id}`)
        .then(({ data }) => {
          if (data.currentPage) {
            setCurrentPage(data.currentPage);
          }
        })
        .catch(() => {});
    }
  }, [id, isAuthenticated]);

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
              onClick={() => openAuthModal('signup')}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              Тіркелу
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
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

  const themeClasses = {
    light: 'reader-mode-light',
    sepia: 'reader-mode-sepia',
    dark: 'reader-mode-dark',
  };

  return (
    <div className={themeClasses[theme]} style={{ minHeight: '100vh', transition: 'background 0.2s, color 0.2s' }}>
      {/* Top Bar */}
      <div
        style={{
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ← Артқа
        </button>

        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>{book.title}</h3>
          <span style={{ fontSize: '12px', opacity: 0.75 }}>{book.author} (Бет: {currentPage})</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="reader-theme-btn"
            onClick={() => setFontSize((f) => Math.max(13, f - 2))}
          >
            A -
          </button>
          <span style={{ fontSize: '12px', fontWeight: 700, width: '36px', textAlign: 'center' }}>
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
      </div>

      {/* Reader Body */}
      <main style={{ maxWidth: '780px', margin: '40px auto 80px', padding: '0 24px' }}>
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
      </main>
    </div>
  );
};
