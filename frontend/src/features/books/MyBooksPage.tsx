import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useMyBooksStore, BookShelfStatus } from '../../store/useMyBooksStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useToastStore } from '../../store/useToastStore';
import { Book } from '../../types';

export const MyBooksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { books } = useBookStore();
  const { activeTab, setActiveTab, setBookStatus, removeBookFromShelf, currentShelf, getBooksByStatus } = useMyBooksStore();
  const { playBook } = useAudioPlayerStore();
  const { showToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuBookId, setActiveMenuBookId] = useState<string | null>(null);

  // Close status dropdown menu when clicked outside
  React.useEffect(() => {
    const handleClick = () => setActiveMenuBookId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Compute records for all three tabs
  const readingRecords = useMemo(() => getBooksByStatus('reading'), [currentShelf, getBooksByStatus]);
  const completedRecords = useMemo(() => getBooksByStatus('completed'), [currentShelf, getBooksByStatus]);
  const wantToReadRecords = useMemo(() => getBooksByStatus('want_to_read'), [currentShelf, getBooksByStatus]);

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
        const book = books.find((b) => b.id === rec.bookId);
        if (!book || book.isArchived) return null;
        return { book, record: rec };
      })
      .filter((item): item is { book: Book; record: typeof activeRecords[0] } => item !== null);
  }, [activeRecords, books]);

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
      reading: '«Қазір оқып жатқандар» бөліміне қосылды',
      completed: '«Оқып болғандар» бөліміне қосылды',
      want_to_read: '«Енді оқимын» бөліміне қосылды',
    };
    showToast(`«${title}» — ${statusLabels[status]}`, 'success');
  };

  const handleRemove = (bookId: string, title: string) => {
    removeBookFromShelf(bookId);
    showToast(`«${title}» сөреден өшірілді`, 'info');
  };

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
    <div style={{ maxWidth: '1280px', margin: '36px auto 90px', padding: '0 24px' }}>
      
      {/* Top Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #004377 0%, #005FA8 100%)',
          borderRadius: '24px',
          padding: '40px 44px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 14px 36px rgba(0, 67, 119, 0.18)',
          marginBottom: '36px',
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)', padding: '4px 14px', borderRadius: '50px', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
            </svg>
            Жеке сөре
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Менің сөрем
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.6 }}>
            Сіздің жеке сөреңіз: қазір оқылып жатқан, толық аяқталған және кейінге сақталған таңдаулы қазақша кітаптар.
          </p>
        </div>
      </div>

      {/* Tabs & Search Bar Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '32px',
          borderBottom: '1.5px solid #E2E8F0',
          paddingBottom: '16px',
        }}
      >
        {/* The 3 Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Tab 1: Қазір оқып жатқан кітаптарым */}
          <button
            type="button"
            onClick={() => setActiveTab('reading')}
            style={{
              padding: '10px 20px',
              borderRadius: '50px',
              border: 'none',
              background: activeTab === 'reading' ? 'var(--blue)' : '#F1F5F9',
              color: activeTab === 'reading' ? '#FFFFFF' : 'var(--text-dark)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'reading' ? '0 4px 14px rgba(0, 84, 148, 0.25)' : 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span>Қазір оқып жатқан кітаптарым</span>
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

          {/* Tab 2: Оқып болған кітаптарым */}
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '10px 20px',
              borderRadius: '50px',
              border: 'none',
              background: activeTab === 'completed' ? 'var(--blue)' : '#F1F5F9',
              color: activeTab === 'completed' ? '#FFFFFF' : 'var(--text-dark)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'completed' ? '0 4px 14px rgba(0, 84, 148, 0.25)' : 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Оқып болған кітаптарым</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '50px',
                background: activeTab === 'completed' ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
                color: activeTab === 'completed' ? '#FFFFFF' : '#334155',
              }}
            >
              {completedRecords.length}
            </span>
          </button>

          {/* Tab 3: Енді оқимын деген кітаптарым */}
          <button
            type="button"
            onClick={() => setActiveTab('want_to_read')}
            style={{
              padding: '10px 20px',
              borderRadius: '50px',
              border: 'none',
              background: activeTab === 'want_to_read' ? 'var(--orange)' : '#F1F5F9',
              color: activeTab === 'want_to_read' ? '#FFFFFF' : 'var(--text-dark)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'want_to_read' ? '0 4px 14px rgba(239, 126, 0, 0.3)' : 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
            </svg>
            <span>Енді оқимын</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '50px',
                background: activeTab === 'want_to_read' ? 'rgba(255,255,255,0.28)' : '#CBD5E1',
                color: activeTab === 'want_to_read' ? '#FFFFFF' : '#334155',
              }}
            >
              {wantToReadRecords.length}
            </span>
          </button>
        </div>

        {/* Filter / Search input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
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
      </div>

      {/* Books Content */}
      {filteredBooks.length > 0 ? (
        <div className="books-grid">
          {filteredBooks.map(({ book, record }) => {
            const isMenuOpen = activeMenuBookId === book.id;

            return (
              <div
                key={book.id}
                className="book-card"
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

                  <span className={`cover-badge ${book.isFree ? 'badge-free' : 'badge-premium'}`} style={{ zIndex: 3 }}>
                    {book.isFree ? 'Тегін' : 'Премиум'}
                  </span>

                  {/* Status Options Menu Trigger Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveMenuBookId(isMenuOpen ? null : book.id);
                    }}
                    title="Күйін өзгерту"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
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
                        left: '12px',
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
                          handleChangeStatus(book.id, 'reading', book.title);
                          setActiveMenuBookId(null);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                          background: record.status === 'reading' ? 'rgba(0, 84, 148, 0.08)' : 'transparent',
                          color: record.status === 'reading' ? 'var(--blue)' : 'var(--text-dark)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)' }}></span>
                        Қазір оқып жатырмын
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleChangeStatus(book.id, 'completed', book.title);
                          setActiveMenuBookId(null);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                          background: record.status === 'completed' ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                          color: record.status === 'completed' ? '#10B981' : 'var(--text-dark)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                        Оқып болдым
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleChangeStatus(book.id, 'want_to_read', book.title);
                          setActiveMenuBookId(null);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                          background: record.status === 'want_to_read' ? 'rgba(239, 126, 0, 0.08)' : 'transparent',
                          color: record.status === 'want_to_read' ? 'var(--orange)' : 'var(--text-dark)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--orange)' }}></span>
                        Енді оқимын
                      </button>

                      <div style={{ height: '1px', background: '#E2E8F0', margin: '4px 0' }} />

                      <button
                        type="button"
                        onClick={() => {
                          handleRemove(book.id, book.title);
                          setActiveMenuBookId(null);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                          background: 'transparent',
                          color: '#DC2626',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Сөреден өшіру
                      </button>
                    </div>
                  )}

                  <div style={{ position: 'relative', zIndex: 2 }}>
                    {!book.coverImage && (
                      <>
                        <div className="cover-title">{book.title}</div>
                        <div className="cover-author-text">{book.author}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Book Metadata */}
                <div className="book-meta" style={{ flex: 1 }}>
                  <div className="book-title">{book.title}</div>
                  <div className="book-author">{book.author}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                    <span className="book-category">{book.category}</span>
                    
                    {/* Status Badge */}
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
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
                  <Link to={`/read/${book.id}`} className="btn-book-action btn-read">
                    Оқу
                  </Link>

                  {book.hasAudio && (
                    <button
                      type="button"
                      onClick={() => playBook(book)}
                      className="btn-book-action btn-listen"
                    >
                      Тыңдау
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="btn-book-action"
                    style={{ background: '#F1F5F9', color: 'var(--text-mid)' }}
                    title="Толық ақпарат"
                  >
                    Ақпарат
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
            {activeTab === 'reading' && 'Қазір оқып жатқан кітаптарыңыз жоқ'}
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
