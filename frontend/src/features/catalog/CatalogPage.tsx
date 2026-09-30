import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useBookStore } from '../../store/useBookStore';
import { BookCard } from '../../components/ui/BookCard';
import { Book } from '../../types';
import { BookOpen, RotateCcw, X, Sparkles, SlidersHorizontal } from 'lucide-react';
import { FilterDrawer, FilterState } from './FilterDrawer';

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

export const CatalogPage: React.FC = () => {
  const { books, fetchBooks } = useBookStore();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('Бәрі');
  const [selectedAuthor, setSelectedAuthor] = useState('all');
  const [selectedNarrator, setSelectedNarrator] = useState('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'audio' | 'ebook'>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'popular' | 'newest' | 'alpha-asc' | 'alpha-desc'>('default');
  const [pageSize, setPageSize] = useState<number>(16);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    if (books.length === 0) {
      fetchBooks().catch(() => {});
    }
  }, [fetchBooks, books.length]);

  const checkScroll = () => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const amount = 240;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    setTimeout(checkScroll, 320);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCat, selectedAuthor, selectedNarrator, formatFilter, accessFilter, sortBy, search]);

  const activeBooks = useMemo<Book[]>(() => {
    return (Array.isArray(books) ? books : []).filter((b) => Boolean(b && !b.isArchived));
  }, [books]);

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

  const hasActiveFilters = Boolean(
    selectedCat !== 'Бәрі' ||
    selectedAuthor !== 'all' ||
    selectedNarrator !== 'all' ||
    formatFilter !== 'all' ||
    accessFilter !== 'all' ||
    sortBy !== 'default' ||
    search.trim()
  );

  const activeFilterCount = [
    selectedAuthor !== 'all',
    selectedNarrator !== 'all',
    formatFilter !== 'all',
    accessFilter !== 'all',
    sortBy !== 'default',
  ].filter(Boolean).length;

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

  const handleApplyFilters = (f: FilterState) => {
    setSelectedAuthor(f.selectedAuthor);
    setSelectedNarrator(f.selectedNarrator);
    setFormatFilter(f.formatFilter);
    setAccessFilter(f.accessFilter);
    setSortBy(f.sortBy);
    setCurrentPage(1);
  };

  const filteredBooks = useMemo(() => {
    const list = activeBooks.filter((book) => {
      if (!book) return false;

      // 1. Category
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

  return (
    <div className="max-w-7xl mx-auto my-4 sm:my-8 px-3 sm:px-6 w-full min-w-0 max-w-full overflow-hidden">
      
      {/* Top Header Banner */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 text-white mb-6 sm:mb-8 shadow-lg w-full max-w-full"
        style={{
          background: 'linear-gradient(135deg, #004377 0%, #005FA8 100%)',
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            top: '-50px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239, 126, 0, 0.25) 0%, rgba(239, 126, 0, 0) 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '120px',
            bottom: '-60px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '720px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Кітаптар қоры
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black m-0 mb-2 leading-tight">
            Каталог
          </h1>
          <p className="text-xs sm:text-sm text-white/85 m-0 leading-relaxed">
            Қазақ әдебиетінің інжу-маржандары мен әлемдік үздік аудармалар. Барлығы {activeBooks.length} кітап қолжетімді.
          </p>
        </div>
      </div>


      {/* Search Input + Filter Button Row */}
      <div className="flex items-center gap-2 w-full mb-6">
        {/* Search field */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Кітап немесе автор іздеу..."
            style={{
              width: '100%',
              height: '46px',
              padding: '0 40px 0 42px',
              borderRadius: '16px',
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

        {/* Filter Button */}
        <button
          type="button"
          onClick={() => setFilterDrawerOpen(true)}
          className="relative shrink-0 flex items-center justify-center active:scale-95 transition-all"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            border: activeFilterCount > 0 ? '1.5px solid #005494' : '1.5px solid #E2E8F0',
            background: activeFilterCount > 0 ? '#005494' : '#FFFFFF',
            color: activeFilterCount > 0 ? '#FFFFFF' : '#64748B',
            cursor: 'pointer',
            boxShadow: activeFilterCount > 0 ? '0 4px 12px rgba(0,84,148,0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {/* Active filter badge */}
          {activeFilterCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black"
              style={{ background: '#EF7E00', color: '#FFFFFF' }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Clean Horizontal Scrollable Genres Ribbon */}
      <div
        style={{
          position: 'relative',
          marginBottom: '20px',
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
          className="no-scrollbar"
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

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={{
          selectedAuthor,
          selectedNarrator,
          formatFilter,
          accessFilter,
          sortBy,
        }}
        onApply={handleApplyFilters}
        authorsList={authorsList}
        narratorsList={narratorsList}
      />

      {/* Books Content Grid */}
      {filteredBooks.length > 0 ? (
        <>
          <div className="books-grid w-full min-w-0 max-w-full">
            {paginatedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          {/* Pagination bar */}
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

            {/* Page navigation buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((prev) => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
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
                      window.scrollTo({ top: 0, behavior: 'smooth' });
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
                  window.scrollTo({ top: 0, behavior: 'smooth' });
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
        </>
      ) : (
        /* Empty State */
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '64px 24px',
            textAlign: 'center',
            border: '2px dashed #E2E8F0',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#F8FAFC',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <BookOpen className="w-8 h-8" />
          </div>

          <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
            Кітаптар табылмады
          </h3>

          <p style={{ color: 'var(--text-mid)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Іздеу сұранысын немесе таңдалған сүзгілерді өзгертіп көріңіз.
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RotateCcw size={16} />
            Сүзгілерді қайтару
          </button>
        </div>
      )}
    </div>
  );
};
