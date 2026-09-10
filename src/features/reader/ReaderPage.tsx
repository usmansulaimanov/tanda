import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';

export const ReaderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books } = useBookStore();
  const { role } = useAuthStore();

  const [fontSize, setFontSize] = useState<number>(17);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');

  const book = books.find((b) => b.id === id);

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
          <span style={{ fontSize: '12px', opacity: 0.75 }}>{book.author}</span>
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
