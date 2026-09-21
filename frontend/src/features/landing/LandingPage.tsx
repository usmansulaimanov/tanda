import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { BookCard } from '../../components/ui/BookCard';
import { TopAudioSection } from './TopAudioSection';
import heroReadingImg from '../../assets/hero-reading.jpg';
import tandaLogo from '../../assets/tanda-logo.png';

const CATEGORIES = [
  'Бәрі',
  'Көркем әдебиет',
  'Детектив',
  'Романтика',
  'Фэнтези',
  'Фантастика',
  'Мистика және хоррор',
  'Психология',
  'Өзін-өзі дамыту',
  'Бизнес және қаржы',
  'Тарих',
  'Руханият және философия',
  'Білім және ғылым',
  'Балалар әдебиеті',
  'Жасөспірімдер әдебиеті',
  'Өмірбаян және мемуар',
];

function useCountUp(target: number, duration = 1800): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeOut * target);
      setCount(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [target, duration]);

  return count;
}

export const LandingPage: React.FC = () => {
  const location = useLocation();
  const { books } = useBookStore();
  const { role, user, isAuthenticated } = useAuthStore();

  if (role === 'admin' || user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const [selectedCat, setSelectedCat] = useState('Бәрі');
  const [search, setSearch] = useState('');

  const personalMsg = user?.personalMessage;
  const isMessageValid = useMemo(() => {
    if (!personalMsg || !personalMsg.text?.trim() || personalMsg.isActive === false) {
      return false;
    }
    if (personalMsg.expiresAt) {
      const exp = new Date(personalMsg.expiresAt).getTime();
      if (exp < Date.now()) return false;
    }
    return true;
  }, [personalMsg]);

  const remainingDays = useMemo(() => {
    if (!personalMsg?.expiresAt) return null;
    const diffMs = new Date(personalMsg.expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [personalMsg]);

  const scrollToCatalog = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const el = document.getElementById('catalog');
    if (el) {
      const headerOffset = 70;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // Clean any legacy hash from URL so refreshes stay in current scroll position
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Active, non-archived books for catalog
  const activeBooks = useMemo(() => {
    return books.filter((b) => !b.isArchived);
  }, [books]);

  // Dynamic statistics matching the active database exactly
  const booksCount = activeBooks.length;
  // 5 books by 1 author = 1 author (unique authors count)
  const authorsCount = useMemo(() => {
    return new Set(
      activeBooks
        .map((b) => b.author?.trim())
        .filter((author): author is string => Boolean(author))
    ).size;
  }, [activeBooks]);
  const readersCount = 1200 + booksCount;

  // Animated numbers from 0 up to target values
  const displayedBooks = useCountUp(booksCount, 1600);
  const displayedAuthors = useCountUp(authorsCount, 1600);
  const displayedReaders = useCountUp(readersCount, 2000);

  // Filtered books for catalog grid
  const filteredBooks = useMemo(() => {
    return activeBooks.filter((book) => {
      if (selectedCat !== 'Бәрі') {
        const bookCats = book.categories && book.categories.length > 0
          ? book.categories
          : (book.category ? book.category.split(',').map((c) => c.trim()) : []);
        if (!bookCats.includes(selectedCat)) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          book.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeBooks, selectedCat, search]);

  // Dynamic category book counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Бәрі': activeBooks.length };
    CATEGORIES.forEach((cat) => {
      if (cat !== 'Бәрі') {
        counts[cat] = activeBooks.filter((b) => {
          const bookCats = b.categories && b.categories.length > 0
            ? b.categories
            : (b.category ? b.category.split(',').map((c) => c.trim()) : []);
          return bookCats.includes(cat);
        }).length;
      }
    });
    return counts;
  }, [activeBooks]);

  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [activeBooks]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const offset = direction === 'left' ? -280 : 280;
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 250);
    }
  };

  return (
    <div>
      {/* HERO */}
      <section className="hero" id="hero">
        {/* Full right-side cover image with smooth left fade */}
        <div className="hero-bg-cover">
          <img
            src={heroReadingImg}
            alt="Tanda"
            className="hero-bg-cover-img"
            loading="eager"
          />
          <div className="hero-bg-cover-overlay" />
        </div>

        <div className="hero-container">
          <div className="hero-text">
            {/* Personal Message placed directly above the "Оқы. Тыңда." headline */}
            {isAuthenticated && isMessageValid && personalMsg && (
              <div
                className="hero-floating-message"
                style={{
                  marginBottom: '20px',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.96)',
                  border: '1.5px solid rgba(239, 126, 0, 0.35)',
                  boxShadow: '0 12px 32px rgba(0, 45, 80, 0.18)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  maxWidth: '520px',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--orange) 0%, #D96B00 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(239, 126, 0, 0.3)',
                  }}
                >
                  ✉️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Жеке хабарлама
                    </span>
                    {typeof remainingDays === 'number' && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '20px' }}>
                        {remainingDays > 0 ? `${remainingDays} күн қалды` : 'Бүгін соңғы күн'}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.5, color: '#1E293B', fontWeight: 600 }}>
                    {personalMsg.text}
                  </p>
                </div>
              </div>
            )}

            {/* Tanda Brand Logo */}
            <div
              className="hero-logo-wrap"
              style={{
                marginBottom: '16px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <img
                src={tandaLogo}
                alt="Tanda"
                style={{
                  height: '42px',
                  width: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1) drop-shadow(0 4px 14px rgba(0, 0, 0, 0.25))',
                }}
              />
            </div>

            <div className="hero-tag">Қазақша кітаптар қоры</div>
            <h1>Оқы. Тыңда. <span>Дамы.</span></h1>
            <p className="hero-desc">
              Мыңдаған қазақша электронды және аудиокітаптар бір жерде. Кез келген құрылғыдан оқыңыз, тыңдаңыз және біліміңізді молайтыңыз.
            </p>
            <div className="hero-buttons">
              <button type="button" onClick={scrollToCatalog} className="btn-primary">Кітаптарды көру</button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-num">{displayedBooks}</div>
                <div className="stat-label">Кітаптар</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">{displayedAuthors}</div>
                <div className="stat-label">Авторлар</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">{displayedReaders.toLocaleString()}</div>
                <div className="stat-label">Оқырмандар</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section tanda-section" id="features">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-header">
            <span className="section-tag">Мүмкіндіктер</span>
            <h2 className="section-title">Неге Tanda?</h2>
            <p className="section-sub">Сізге арналған ең ыңғайлы құралдар</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                </svg>
              </div>
              <h3>Сапалы аудиокітаптар</h3>
              <p>Кәсіби дикторлар дыбыстаған, фондық режимде тыңдау мүмкіндігі бар аудиокітаптар.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <h3>Бай кітап қоры</h3>
              <p>Қазақ әдебиетінің классикасынан бастап, заманауи бестселлерлер мен аудармаларға дейін.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3>Жылдамдық пен Таймер</h3>
              <p>0.75x-тен 2x-ке дейін жылдамдықты таңдаңыз. Ұйықтар алдында автоматты өшетін ұйқы таймерін қосыңыз.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TOP 10 AUDIO BOOKS SECTION */}
      <TopAudioSection />

      {/* CATALOG SECTION */}
      <section className="catalog-section tanda-section" id="catalog" style={{ backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Section Header with Title & Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            <div>
              <h2 className="section-title" style={{ marginTop: '0px', marginBottom: '6px' }}>Кітаптар қоры</h2>
              <p className="section-sub" style={{ margin: 0 }}>Қазақ әдебиетінің інжу-маржандары мен әлемдік үздік аудармалар</p>
            </div>

            {/* Search Input Box */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <input
                type="text"
                id="catalogSearch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Кітап немесе автор іздеу..."
                style={{
                  width: '100%',
                  height: '46px',
                  padding: '0 40px 0 42px',
                  borderRadius: '14px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-dark)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--blue)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 84, 148, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                }}
              />
              {/* Search Icon */}
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>

              {/* Clear Button */}
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Clean Horizontal Scrollable Genres Ribbon */}
          <div
            style={{
              position: 'relative',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {/* Left arrow scroll */}
            <button
              type="button"
              onClick={() => scrollTabs('left')}
              disabled={!canScrollLeft}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                boxShadow: canScrollLeft ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canScrollLeft ? 'pointer' : 'default',
                color: canScrollLeft ? 'var(--text-dark)' : '#CBD5E1',
                fontWeight: 800,
                fontSize: '16px',
                flexShrink: 0,
                opacity: canScrollLeft ? 1 : 0.3,
                transition: 'all 0.2s ease',
              }}
            >
              ‹
            </button>

            {/* Categories Scrollable Row */}
            <div
              ref={tabsContainerRef}
              onScroll={checkScroll}
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                padding: '4px 2px',
                flex: 1,
              }}
            >
              {CATEGORIES.map((cat) => {
                const isActive = selectedCat === cat;
                const count = categoryCounts[cat] || 0;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '50px',
                      fontSize: '13px',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border: isActive ? '1.5px solid var(--blue)' : '1.5px solid #E2E8F0',
                      background: isActive
                        ? 'linear-gradient(135deg, var(--blue) 0%, #002D50 100%)'
                        : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#334155',
                      boxShadow: isActive ? '0 4px 14px rgba(0, 84, 148, 0.25)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.background = '#F1F5F9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.background = '#FFFFFF';
                      }
                    }}
                  >
                    <span>{cat}</span>
                    {count > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '20px',
                          background: isActive ? 'rgba(255, 255, 255, 0.22)' : '#F1F5F9',
                          color: isActive ? '#FFFFFF' : '#64748B',
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right arrow scroll */}
            <button
              type="button"
              onClick={() => scrollTabs('right')}
              disabled={!canScrollRight}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                boxShadow: canScrollRight ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canScrollRight ? 'pointer' : 'default',
                color: canScrollRight ? 'var(--text-dark)' : '#CBD5E1',
                fontWeight: 800,
                fontSize: '16px',
                flexShrink: 0,
                opacity: canScrollRight ? 1 : 0.3,
                transition: 'all 0.2s ease',
              }}
            >
              ›
            </button>
          </div>

          {/* Active Filter Info / Reset Bar */}
          {(selectedCat !== 'Бәрі' || search.trim()) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                padding: '10px 16px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
                color: 'var(--text-mid)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                Таңдалған: <strong>{selectedCat}</strong> {search.trim() && `• Іздеу: «${search}»`} • <strong>{filteredBooks.length}</strong> кітап табылды
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCat('Бәрі');
                  setSearch('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--orange)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Барлығын қалпына келтіру ✕
              </button>
            </div>
          )}

          <div className="books-grid" id="booksGrid">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-mid)' }}>
              Кітаптар табылмады.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
