import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useMyBooksStore, BookShelfStatus } from '../../store/useMyBooksStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useToastStore } from '../../store/useToastStore';
import { Book } from '../../types';
import { TandaPremiumBadge } from '../../components/ui/TandaPremiumBadge';
import { LayoutGrid, List, BookOpen } from 'lucide-react';
import { ShelfGridView } from './components/ShelfGridView';
import { ShelfListView } from './components/ShelfListView';
import { ShelfSpineView } from './components/ShelfSpineView';

type ViewMode = 'grid' | 'list' | 'spine';

export const MyBooksPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as BookShelfStatus | null;

  const { user, isAuthenticated } = useAuthStore();
  const { books, fetchBooks } = useBookStore();
  const { activeTab, setActiveTab, setBookStatus, removeBookFromShelf, currentShelf, getBooksByStatus, fetchShelf } = useMyBooksStore();
  const { savedBookIds, fetchSavedBooks } = useSavedBooksStore();
  const { playBook } = useAudioPlayerStore();
  const { showToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuBookId, setActiveMenuBookId] = useState<string | null>(null);

  // 3-in-1 View Mode for Mobile (Grid, List, Bookshelf Spine)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_my_books_view_mode') as ViewMode | null;
      if (saved && ['grid', 'list', 'spine'].includes(saved)) {
        return saved;
      }
    }
    return 'grid';
  });

  const cycleViewMode = () => {
    setViewMode((prev) => {
      const next: ViewMode = prev === 'grid' ? 'list' : prev === 'list' ? 'spine' : 'grid';
      localStorage.setItem('tanda_my_books_view_mode', next);
      return next;
    });
  };

  useEffect(() => {
    if (tabParam && ['reading', 'completed', 'want_to_read'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    fetchBooks();
    fetchSavedBooks();
    fetchShelf();
  }, [fetchBooks, fetchSavedBooks, fetchShelf, setActiveTab, tabParam]);

  const handleTabChange = (tab: BookShelfStatus) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Close status dropdown menu when clicked outside
  useEffect(() => {
    const handleClick = () => setActiveMenuBookId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Build a map of valid, non-archived books currently available in the system
  const validBookMap = useMemo(() => {
    return new Map(books.filter((b) => !b.isArchived).map((b) => [String(b.id), b]));
  }, [books]);

  // Compute records for all three tabs strictly for existing, non-deleted books
  const readingRecords = useMemo(() => {
    return getBooksByStatus('reading').filter((rec) => validBookMap.has(String(rec.bookId)));
  }, [currentShelf, getBooksByStatus, validBookMap]);

  const completedRecords = useMemo(() => {
    return getBooksByStatus('completed').filter((rec) => validBookMap.has(String(rec.bookId)));
  }, [currentShelf, getBooksByStatus, validBookMap]);

  const wantToReadRecords = useMemo(() => {
    return getBooksByStatus('want_to_read').filter((rec) => validBookMap.has(String(rec.bookId)));
  }, [currentShelf, savedBookIds, getBooksByStatus, validBookMap]);

  const activeRecords = useMemo(() => {
    switch (activeTab) {
      case 'reading':
        return readingRecords;
      case 'completed':
        return completedRecords;
      case 'want_to_read':
        return wantToReadRecords;
      default:
        return readingRecords;
    }
  }, [activeTab, readingRecords, completedRecords, wantToReadRecords]);

  // Map shelf records to full book objects
  const shelfBooksWithRecords = useMemo(() => {
    return activeRecords
      .map((rec) => {
        const book = validBookMap.get(String(rec.bookId));
        if (!book) return null;
        return { book, record: rec };
      })
      .filter((item): item is { book: Book; record: typeof activeRecords[0] } => item !== null);
  }, [activeRecords, validBookMap]);

  // Apply search query filter
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return shelfBooksWithRecords;
    const q = searchQuery.toLowerCase().trim();
    return shelfBooksWithRecords.filter(
      ({ book }) =>
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.category.toLowerCase().includes(q)
    );
  }, [shelfBooksWithRecords, searchQuery]);

  const handleChangeStatus = (bookId: string, status: BookShelfStatus, title: string) => {
    setBookStatus(bookId, status);
    const statusLabels: Record<BookShelfStatus, string> = {
      reading: '«Оқып жатқандарым» бөліміне қосылды',
      completed: '«Оқып болғандар» бөліміне қосылды',
      want_to_read: '«Енді оқимын» бөліміне қосылды',
    };
    showToast(`«${title}» — ${statusLabels[status]}`, 'success');
  };

  const handleRemove = (bookId: string, title: string) => {
    removeBookFromShelf(bookId);
    showToast(`«${title}» сөреден өшірілді`, 'info');
  };

  const isStaffOrAuthor = Boolean(
    isAuthenticated && user && (user.role === 'admin' || user.role === 'author' || user.isSuperAdmin || user.isAuthor || Boolean(user.duty))
  );

  if (isStaffOrAuthor) {
    return <Navigate to="/admin/home" replace />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div style={{ maxWidth: '640px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '52px 36px',
            boxShadow: '0 12px 40px rgba(0, 84, 148, 0.08)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(0, 84, 148, 0.1)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '12px' }}>
            «Менің сөрем» бөлімін көру үшін жүйеге кіріңіз
          </h2>
          <p style={{ color: 'var(--text-mid)', fontSize: '15px', marginBottom: '28px', lineHeight: 1.6 }}>
            Қазір оқып жатқан, оқып болған және енді оқимын деп сақтаған кітаптарыңызды қадағалап отыру үшін аккаунтыңызға кіріңіз немесе жаңадан тіркеліңіз.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to={`/login?redirect=${encodeURIComponent('/my-books')}`}
              className="btn-primary"
              style={{ padding: '12px 32px', fontSize: '14px', textDecoration: 'none' }}
            >
              Кіру
            </Link>
            <Link
              to={`/signup?redirect=${encodeURIComponent('/my-books')}`}
              style={{
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '50px',
                border: '1.5px solid var(--blue)',
                color: 'var(--blue)',
                background: '#FFF',
                textDecoration: 'none',
              }}
            >
              Тіркелу
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
            </svg>
            Жеке сөре
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black m-0 mb-2 leading-tight">
            Менің сөрем
          </h1>
          <p className="text-xs sm:text-sm text-white/85 m-0 leading-relaxed">
            Сіздің жеке сөреңіз: қазір оқылып жатқан, толық аяқталған және кейінге сақталған таңдаулы қазақша кітаптар.
          </p>
        </div>
      </div>

      {/* Tabs & Search Bar Row */}
      <div
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-6 pb-4 border-b border-slate-200 w-full min-w-0 max-w-full"
      >
        {/* The 3 Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar w-full min-w-0 max-w-full">
          {/* Tab 1: Оқып жатқандарым */}
          <button
            type="button"
            onClick={() => handleTabChange('reading')}
            style={{
              padding: '8px 16px',
              borderRadius: '50px',
              border: 'none',
              background: activeTab === 'reading' ? 'var(--blue)' : '#F1F5F9',
              color: activeTab === 'reading' ? '#FFFFFF' : 'var(--text-dark)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'reading' ? '0 4px 14px rgba(0, 84, 148, 0.25)' : 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span>Оқып жатқандарым</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '50px',
                background: activeTab === 'reading' ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
                color: activeTab === 'reading' ? '#FFFFFF' : '#334155',
              }}
            >
              {readingRecords.length}
            </span>
          </button>

          {/* Tab 2: Оқығандарым */}
          <button
            type="button"
            onClick={() => handleTabChange('completed')}
            style={{
              padding: '8px 16px',
              borderRadius: '50px',
              border: 'none',
              background: activeTab === 'completed' ? 'var(--blue)' : '#F1F5F9',
              color: activeTab === 'completed' ? '#FFFFFF' : 'var(--text-dark)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'completed' ? '0 4px 14px rgba(0, 84, 148, 0.25)' : 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Оқығандарым</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '50px',
                background: activeTab === 'completed' ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
                color: activeTab === 'completed' ? '#FFFFFF' : '#334155',
              }}
            >
              {completedRecords.length}
            </span>
          </button>

          {/* Tab 3: Оқитындарым */}
          <button
            type="button"
            onClick={() => handleTabChange('want_to_read')}
            style={{
              padding: '8px 16px',
              borderRadius: '50px',
              border: 'none',
              background: activeTab === 'want_to_read' ? 'var(--orange)' : '#F1F5F9',
              color: activeTab === 'want_to_read' ? '#FFFFFF' : 'var(--text-dark)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'want_to_read' ? '0 4px 14px rgba(239, 126, 0, 0.3)' : 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
            </svg>
            <span>Оқитындарым</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '50px',
                background: activeTab === 'want_to_read' ? 'rgba(255,255,255,0.28)' : '#CBD5E1',
                color: activeTab === 'want_to_read' ? '#FFFFFF' : '#334155',
              }}
            >
              {wantToReadRecords.length}
            </span>
          </button>
        </div>

        {/* Filter / Search input & Mobile 3-in-1 View Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-auto sm:min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Сөреден іздеу..."
              style={{
                width: '100%',
                padding: '9px 14px 9px 36px',
                borderRadius: '50px',
                border: '1.5px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 500,
                background: '#FFFFFF',
                color: 'var(--text-dark)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <svg
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          {/* 3-in-1 View Mode Switcher: Тор (Grid) ➔ Тізім (List) ➔ Сөре (Spine) */}
          <button
            type="button"
            onClick={cycleViewMode}
            className="flex items-center justify-center gap-1.5 h-[38px] px-3 rounded-full bg-white border border-slate-200 shadow-xs hover:border-slate-300 active:scale-95 transition-all text-xs font-bold shrink-0"
            title="Көріністі ауыстыру: Тор / Тізім / Сөре"
          >
            {viewMode === 'grid' && (
              <>
                <LayoutGrid className="w-4 h-4 text-[#005494]" />
                <span className="text-[11px] font-bold text-[#005494]">Тор</span>
              </>
            )}
            {viewMode === 'list' && (
              <>
                <List className="w-4 h-4 text-[#005494]" />
                <span className="text-[11px] font-bold text-[#005494]">Тізім</span>
              </>
            )}
            {viewMode === 'spine' && (
              <>
                <BookOpen className="w-4 h-4 text-[#005494]" />
                <span className="text-[11px] font-bold text-[#005494]">Сөре</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Books Content */}
      {filteredBooks.length > 0 ? (
        viewMode === 'list' ? (
          <ShelfListView
            items={filteredBooks}
            activeMenuBookId={activeMenuBookId}
            setActiveMenuBookId={setActiveMenuBookId}
            handleChangeStatus={handleChangeStatus}
            handleRemove={handleRemove}
            onPlayAudio={(b) => playBook(b)}
          />
        ) : viewMode === 'spine' ? (
          <ShelfSpineView
            items={filteredBooks}
            handleChangeStatus={handleChangeStatus}
            handleRemove={handleRemove}
            onPlayAudio={(b) => playBook(b)}
          />
        ) : (
          <ShelfGridView
            items={filteredBooks}
            activeMenuBookId={activeMenuBookId}
            setActiveMenuBookId={setActiveMenuBookId}
            handleChangeStatus={handleChangeStatus}
            handleRemove={handleRemove}
            onPlayAudio={(b) => playBook(b)}
          />
        )
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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
          </div>

          <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
            {activeTab === 'reading' && 'Оқып жатқан кітаптарыңыз жоқ'}
            {activeTab === 'completed' && 'Әзірге оқып болған кітаптар жоқ'}
            {activeTab === 'want_to_read' && '«Енді оқимын» бөлімінде кітап жоқ'}
          </h3>

          <p style={{ color: 'var(--text-mid)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            {activeTab === 'reading' &&
              'Кітаптар қорынан өзіңізге ұнаған кітапты таңдап, оқуды бастаңыз. Бастаған кітаптарыңыз автоматты түрде осы тізімге түседі.'}
            {activeTab === 'completed' &&
              'Кітапты соңына дейін оқып шыққанда немесе күйін «Оқып болдым» деп белгілегенде, ол осы бөлімде сақталады.'}
            {activeTab === 'want_to_read' &&
              'Кітаптар қорындағы кез келген кітаптың «Кейін оқимын» батырмасын басыңыз. Олар автоматты түрде осы сөреге жиналады.'}
          </p>

          <Link
            to="/#catalog"
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Кітаптар қорынан кітап таңдау
          </Link>
        </div>
      )}
    </div>
  );
};
