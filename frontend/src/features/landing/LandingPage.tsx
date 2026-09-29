import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { booksApi } from '../../shared/api/books.api';
import { systemApi } from '../../shared/api/system.api';
import { SystemSettings } from '../../types';
import { BookCard } from '../../components/ui/BookCard';
import { TopAudioSection } from './TopAudioSection';
import heroReadingImg from '../../assets/hero-reading.jpg';
import tandaLogoWhite from '../../assets/tanda-logo-white.png';
import { User, Mic, BookOpen, Headphones, Crown, ArrowUpDown, Filter, RotateCcw, X, SlidersHorizontal } from 'lucide-react';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { books } = useBookStore();
  const { user, isAuthenticated, restoreSession } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      restoreSession();
    }
  }, [isAuthenticated, restoreSession]);

  const [selectedCat, setSelectedCat] = useState('Бәрі');
  const [selectedAuthor, setSelectedAuthor] = useState('all');
  const [selectedNarrator, setSelectedNarrator] = useState('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'audio' | 'ebook'>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'alpha-asc' | 'alpha-desc' | 'popular' | 'newest'>('default');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(16);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCat, selectedAuthor, selectedNarrator, formatFilter, accessFilter, sortBy, search]);

  const personalMsg = user?.personalMessage;
  const messageText = typeof personalMsg === 'string'
    ? personalMsg
    : (personalMsg?.text || (user as any)?.personalMessageText || (user as any)?.personal_message);
  const isMsgActive = typeof personalMsg === 'object' && typeof personalMsg?.isActive === 'boolean'
    ? personalMsg.isActive
    : ((user as any)?.personalMessageActive !== false && (user as any)?.personal_message_active !== false);

  const isMessageValid = useMemo(() => {
    if (!messageText || !messageText.trim() || !isMsgActive) {
      return false;
    }
    if (typeof personalMsg === 'object' && personalMsg?.expiresAt) {
      const exp = new Date(personalMsg.expiresAt).getTime();
      if (exp < Date.now()) return false;
    }
    return true;
  }, [messageText, isMsgActive, personalMsg]);

  const remainingDays = useMemo(() => {
    if (typeof personalMsg === 'object' && personalMsg?.expiresAt) {
      const diffMs = new Date(personalMsg.expiresAt).getTime() - Date.now();
      if (diffMs <= 0) return 0;
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
    return null;
  }, [personalMsg]);

  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    systemApi.getSettings()
      .then((data) => {
        if (data) setSystemSettings(data);
      })
      .catch(() => {});
  }, []);

  const globalHeroMessage = useMemo(() => {
    if (!systemSettings || !systemSettings.heroMessageEnabled) return null;
    const text = systemSettings.heroMessageText?.trim();
    if (!text) return null;
    if (systemSettings.heroMessageExpiresAt) {
      const exp = new Date(systemSettings.heroMessageExpiresAt).getTime();
      if (!isNaN(exp) && exp < Date.now()) return null;
    }
    const target = systemSettings.heroMessageTarget || 'all';
    if (target === 'registered' && !isAuthenticated) return null;
    if (target === 'unregistered' && isAuthenticated) return null;
    return text;
  }, [systemSettings, isAuthenticated]);

  const displayHeroMessage = (isAuthenticated && isMessageValid && messageText)
    ? messageText
    : globalHeroMessage;

  const scrollToCatalog = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    navigate('/catalog');
  };

  useEffect(() => {
    if (books.length === 0) {
      useBookStore.getState().fetchBooks().catch(() => {});
    }
  }, [books.length]);

  // Active, non-archived books for catalog
  const activeBooks = useMemo(() => {
    return (Array.isArray(books) ? books : []).filter((b) => Boolean(b && !b.isArchived));
  }, [books]);

  // Dynamic statistics matching the active database exactly
  const booksCount = activeBooks.length;
  // Unique authors count from active books
  const authorsCount = useMemo(() => {
    return new Set(
      activeBooks
        .map((b) => b?.author?.trim())
        .filter((author): author is string => Boolean(author))
    ).size;
  }, [activeBooks]);

  const [readersCount, setReadersCount] = useState<number>(() => {
    try {
      return useAuthStore.getState().getClientsCount() || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    booksApi.getPublicStats()
      .then((res) => {
        if (res && typeof res.readersCount === 'number') {
          setReadersCount(res.readersCount);
        }
      })
      .catch(() => {});
  }, []);

  // Animated numbers from 0 up to target values
  const displayedBooks = useCountUp(booksCount, 1600);
  const displayedAuthors = useCountUp(authorsCount, 1600);
  const displayedReaders = useCountUp(readersCount, 1600);

  // Unique sorted authors with count
  const authorsList = useMemo(() => {
    const map = new Map<string, number>();
    activeBooks.forEach((b) => {
      const a = b.author?.trim();
      if (a) {
        map.set(a, (map.get(a) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'kk'));
  }, [activeBooks]);

  // Unique sorted narrators with count
  const narratorsList = useMemo(() => {
    const map = new Map<string, number>();
    activeBooks.forEach((b) => {
      const n = b.audioNarrator?.trim();
      if (n) {
        map.set(n, (map.get(n) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'kk'));
  }, [activeBooks]);

  const hasActiveFilters = Boolean(
    selectedCat !== 'Бәрі' ||
    selectedAuthor !== 'all' ||
    selectedNarrator !== 'all' ||
    formatFilter !== 'all' ||
    accessFilter !== 'all' ||
    sortBy !== 'default' ||
    search.trim()
  );

  const resetFilters = () => {
    setSelectedCat('Бәрі');
    setSelectedAuthor('all');
    setSelectedNarrator('all');
    setFormatFilter('all');
    setAccessFilter('all');
    setSortBy('default');
    setSearch('');
    setCurrentPage(1);
  };

  // Filtered and sorted books for catalog grid
  const filteredBooks = useMemo(() => {
    const list = activeBooks.filter((book) => {
      if (!book) return false;

      // 1. Category / Genre
      if (selectedCat !== 'Бәрі') {
        const bookCats = book.categories && book.categories.length > 0
          ? book.categories
          : (book.category ? book.category.split(',').map((c) => c.trim()) : []);
        if (!bookCats.includes(selectedCat)) {
          return false;
        }
      }

      // 2. Author
      if (selectedAuthor !== 'all') {
        if (!book.author || book.author.trim().toLowerCase() !== selectedAuthor.toLowerCase()) {
          return false;
        }
      }

      // 3. Narrator
      if (selectedNarrator !== 'all') {
        if (!book.audioNarrator || book.audioNarrator.trim().toLowerCase() !== selectedNarrator.toLowerCase()) {
          return false;
        }
      }

      // 4. Format
      if (formatFilter === 'audio' && !book.hasAudio && !book.audioUrl && (!book.audioChapters || book.audioChapters.length === 0)) {
        return false;
      }
      if (formatFilter === 'ebook' && !book.hasEbook && !book.content && !book.pages && !book.ebookUrl && !book.pdfUrl && !book.epubUrl) {
        return false;
      }

      // 5. Access
      if (accessFilter === 'free' && !book.isFree) {
        return false;
      }
      if (accessFilter === 'premium' && book.isFree !== false) {
        return false;
      }

      // 6. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (book.title || '').toLowerCase().includes(q);
        const matchesAuthor = (book.author || '').toLowerCase().includes(q);
        const matchesNarrator = (book.audioNarrator || '').toLowerCase().includes(q);
        const matchesCategory = (book.category || '').toLowerCase().includes(q);
        const matchesDesc = (book.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesAuthor && !matchesNarrator && !matchesCategory && !matchesDesc) {
          return false;
        }
      }

      return true;
    });

    // Apply Sorting
    if (sortBy === 'alpha-asc') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'kk'));
    } else if (sortBy === 'alpha-desc') {
      list.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'kk'));
    } else if (sortBy === 'popular') {
      list.sort((a, b) => ((b.readsCount || 0) + (b.viewsCount || 0)) - ((a.readsCount || 0) + (a.viewsCount || 0)));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return list;
  }, [activeBooks, selectedCat, selectedAuthor, selectedNarrator, formatFilter, accessFilter, sortBy, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / pageSize));
  const startIndex = filteredBooks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredBooks.length);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  // Dynamic category book counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Бәрі': activeBooks.length };
    CATEGORIES.forEach((cat) => {
      if (cat !== 'Бәрі') {
        counts[cat] = activeBooks.filter((b) => {
          if (!b) return false;
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
            {/* Hero Message: Personal message or global/site message */}
            {Boolean(displayHeroMessage) && (
              <div
                className="hero-personal-message"
                style={{
                  marginTop: '-70px',
                  marginBottom: '20px',
                  maxWidth: '780px',
                  width: '100%',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 'clamp(38px, 4.5vw, 64px)',
                    lineHeight: 1.15,
                    color: '#FFFFFF',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    textShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  {displayHeroMessage}
                </p>
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
              <span
                style={{
                  fontSize: 'clamp(32px, 4vw, 44px)',
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  color: '#FFFFFF',
                  lineHeight: 1,
                  display: 'inline-block',
                }}
              >
                tandamen<span style={{ color: 'var(--orange)' }}>.kz</span>
              </span>
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

          {/* FILTERS & SORTING TOOLBAR */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid #E2E8F0',
              padding: '14px 18px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              {/* 1. Author Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Автор бойынша
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedAuthor}
                    onChange={(e) => setSelectedAuthor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 30px 8px 34px',
                      borderRadius: '10px',
                      border: selectedAuthor !== 'all' ? '1.5px solid var(--blue)' : '1.5px solid #CBD5E1',
                      background: selectedAuthor !== 'all' ? '#F0F7FF' : '#FFFFFF',
                      color: selectedAuthor !== 'all' ? 'var(--blue)' : '#334155',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <option value="all">Барлық авторлар ({authorsList.length})</option>
                    {authorsList.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} ({item.count})
                      </option>
                    ))}
                  </select>
                  <User
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '15px',
                      height: '15px',
                      color: selectedAuthor !== 'all' ? 'var(--blue)' : '#94A3B8',
                      pointerEvents: 'none',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px', color: '#94A3B8' }}>▼</span>
                </div>
              </div>

              {/* 2. Narrator Filter */}
              {narratorsList.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Диктор бойынша
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedNarrator}
                      onChange={(e) => setSelectedNarrator(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 30px 8px 34px',
                        borderRadius: '10px',
                        border: selectedNarrator !== 'all' ? '1.5px solid #0284C7' : '1.5px solid #CBD5E1',
                        background: selectedNarrator !== 'all' ? '#F0F9FF' : '#FFFFFF',
                        color: selectedNarrator !== 'all' ? '#0284C7' : '#334155',
                        fontSize: '13px',
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer',
                        appearance: 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <option value="all">Барлық дикторлар ({narratorsList.length})</option>
                      {narratorsList.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.name} ({item.count})
                        </option>
                      ))}
                    </select>
                    <Mic
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '15px',
                        height: '15px',
                        color: selectedNarrator !== 'all' ? '#0284C7' : '#94A3B8',
                        pointerEvents: 'none',
                      }}
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px', color: '#94A3B8' }}>▼</span>
                  </div>
                </div>
              )}

              {/* 3. Format Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Форматы
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={formatFilter}
                    onChange={(e) => setFormatFilter(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 30px 8px 34px',
                      borderRadius: '10px',
                      border: formatFilter !== 'all' ? '1.5px solid #7C3AED' : '1.5px solid #CBD5E1',
                      background: formatFilter !== 'all' ? '#F5F3FF' : '#FFFFFF',
                      color: formatFilter !== 'all' ? '#7C3AED' : '#334155',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <option value="all">Барлық формат</option>
                    <option value="audio">Тек аудиокітаптар</option>
                    <option value="ebook">Тек электронды (оқуға)</option>
                  </select>
                  <Headphones
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '15px',
                      height: '15px',
                      color: formatFilter !== 'all' ? '#7C3AED' : '#94A3B8',
                      pointerEvents: 'none',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px', color: '#94A3B8' }}>▼</span>
                </div>
              </div>

              {/* 4. Access (Free / Premium) Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Қолжетімділік
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={accessFilter}
                    onChange={(e) => setAccessFilter(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 30px 8px 34px',
                      borderRadius: '10px',
                      border: accessFilter !== 'all' ? '1.5px solid #F08000' : '1.5px solid #CBD5E1',
                      background: accessFilter !== 'all' ? '#FFF7ED' : '#FFFFFF',
                      color: accessFilter !== 'all' ? '#F08000' : '#334155',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <option value="all">Барлық кітаптар</option>
                    <option value="free">Тек тегін кітаптар</option>
                    <option value="premium">Тек премиум кітаптар</option>
                  </select>
                  <Crown
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '15px',
                      height: '15px',
                      color: accessFilter !== 'all' ? '#F08000' : '#94A3B8',
                      pointerEvents: 'none',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px', color: '#94A3B8' }}>▼</span>
                </div>
              </div>

              {/* 5. Sorting Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Сұрыптау
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 30px 8px 34px',
                      borderRadius: '10px',
                      border: sortBy !== 'default' ? '1.5px solid #059669' : '1.5px solid #CBD5E1',
                      background: sortBy !== 'default' ? '#ECFDF5' : '#FFFFFF',
                      color: sortBy !== 'default' ? '#059669' : '#334155',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <option value="default">Әдепкі (Жаңалары)</option>
                    <option value="alpha-asc">Алфавит бойынша (А - Я)</option>
                    <option value="alpha-desc">Алфавит бойынша (Я - А)</option>
                    <option value="popular">Ең танымалдары</option>
                  </select>
                  <ArrowUpDown
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '15px',
                      height: '15px',
                      color: sortBy !== 'default' ? '#059669' : '#94A3B8',
                      pointerEvents: 'none',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px', color: '#94A3B8' }}>▼</span>
                </div>
              </div>
            </div>

            {/* Active filter pills & Reset Button */}
            {hasActiveFilters && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid #F1F5F9',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', marginRight: '2px' }}>
                    Нәтиже: <strong style={{ color: 'var(--text-dark)' }}>{filteredBooks.length}</strong> кітап
                  </span>

                  {selectedCat !== 'Бәрі' && (
                    <span
                      onClick={() => setSelectedCat('Бәрі')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: '#EFF6FF',
                        color: 'var(--blue)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #BFDBFE',
                      }}
                      title="Жанр сүзгісін алып тастау"
                    >
                      Жанр: {selectedCat} <X size={12} />
                    </span>
                  )}

                  {selectedAuthor !== 'all' && (
                    <span
                      onClick={() => setSelectedAuthor('all')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: '#EFF6FF',
                        color: 'var(--blue)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #BFDBFE',
                      }}
                      title="Автор сүзгісін алып тастау"
                    >
                      Автор: {selectedAuthor} <X size={12} />
                    </span>
                  )}

                  {selectedNarrator !== 'all' && (
                    <span
                      onClick={() => setSelectedNarrator('all')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: '#F0F9FF',
                        color: '#0284C7',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #BAE6FD',
                      }}
                      title="Диктор сүзгісін алып тастау"
                    >
                      Диктор: {selectedNarrator} <X size={12} />
                    </span>
                  )}

                  {formatFilter !== 'all' && (
                    <span
                      onClick={() => setFormatFilter('all')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: '#F5F3FF',
                        color: '#7C3AED',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #DDD6FE',
                      }}
                      title="Формат сүзгісін алып тастау"
                    >
                      {formatFilter === 'audio' ? 'Аудиокітаптар' : 'Электронды'} <X size={12} />
                    </span>
                  )}

                  {accessFilter !== 'all' && (
                    <span
                      onClick={() => setAccessFilter('all')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: '#FFF7ED',
                        color: '#F08000',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #FED7AA',
                      }}
                      title="Қолжетімділік сүзгісін алып тастау"
                    >
                      {accessFilter === 'free' ? 'Тегін' : 'Премиум'} <X size={12} />
                    </span>
                  )}

                  {sortBy !== 'default' && (
                    <span
                      onClick={() => setSortBy('default')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: '#ECFDF5',
                        color: '#059669',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #A7F3D0',
                      }}
                      title="Сұрыптауды қалпына келтіру"
                    >
                      {sortBy === 'alpha-asc' ? 'А-Я' : sortBy === 'alpha-desc' ? 'Я-А' : 'Танымал'} <X size={12} />
                    </span>
                  )}

                  {search.trim() && (
                    <span
                      onClick={() => setSearch('')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: '#F1F5F9',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #CBD5E1',
                      }}
                      title="Іздеуді өшіру"
                    >
                      «{search}» <X size={12} />
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--orange)',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'opacity 0.15s',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Сүзгілерді тазарту</span>
                </button>
              </div>
            )}
          </div>

          <div className="books-grid" id="booksGrid">
            {paginatedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-mid)' }}>
              Кітаптар табылмады.
            </div>
          )}

          {filteredBooks.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '32px',
                padding: '16px 20px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              {/* Page size selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                  Беттегі кітап саны:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                  <option value={64}>64</option>
                  <option value={128}>128</option>
                </select>
                <span style={{ fontSize: '13px', color: '#94A3B8', marginLeft: '4px' }}>
                  ({startIndex}-{endIndex} / Барлығы {filteredBooks.length})
                </span>
              </div>

              {/* Page navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: currentPage === 1 ? '#F8FAFC' : '#FFFFFF',
                    color: currentPage === 1 ? '#94A3B8' : 'var(--text-dark)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Алдыңғы
                </button>

                {/* Number buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    totalPages > 7 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - currentPage) > 1
                  ) {
                    if (pageNum === 2 && currentPage > 3) {
                      return (
                        <span key="dots-start" style={{ padding: '0 4px', color: '#94A3B8', fontSize: '12px' }}>
                          ...
                        </span>
                      );
                    }
                    if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                      return (
                        <span key="dots-end" style={{ padding: '0 4px', color: '#94A3B8', fontSize: '12px' }}>
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => {
                        setCurrentPage(pageNum);
                        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{
                        minWidth: '34px',
                        height: '34px',
                        padding: '0 8px',
                        borderRadius: '8px',
                        border: isActive ? '1.5px solid var(--blue)' : '1.5px solid #CBD5E1',
                        background: isActive ? 'var(--blue)' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : 'var(--text-dark)',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: currentPage === totalPages ? '#F8FAFC' : '#FFFFFF',
                    color: currentPage === totalPages ? '#94A3B8' : 'var(--text-dark)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Кейінгі
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
