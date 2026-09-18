import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuoteStore, QuoteItem } from '../../store/useQuoteStore';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';

export const ReaderQuotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { quotes, deliveredHistory } = useQuoteStore();
  const { books } = useBookStore();
  const { showToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_book'>('all');
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('all');

  // ONLY quotes that have been sent/delivered to readers
  const sentQuotes = useMemo(() => {
    return quotes
      .filter((q) => {
        const isSentInQuotes = (q.sentCount && q.sentCount > 0) || Boolean(q.lastSentAt);
        const isDeliveredInHistory = (deliveredHistory || []).some(
          (d) => d.quoteId === q.id || d.text.trim() === q.text.trim()
        );
        return isSentInQuotes || isDeliveredInHistory;
      })
      .sort((a, b) => {
        const timeA = a.lastSentAt ? new Date(a.lastSentAt).getTime() : 0;
        const timeB = b.lastSentAt ? new Date(b.lastSentAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [quotes, deliveredHistory]);

  // Available books from sent quotes
  const booksWithQuotes = useMemo(() => {
    const bookMap = new Map<string, { id: string; title: string; author: string }>();
    sentQuotes.forEach((q) => {
      if (q.bookId) {
        const found = books.find((b) => b.id === q.bookId);
        if (found) {
          bookMap.set(found.id, { id: found.id, title: found.title, author: found.author });
        }
      } else if (q.bookTitle) {
        const found = books.find((b) => b.title.toLowerCase().trim() === q.bookTitle?.toLowerCase().trim());
        if (found) {
          bookMap.set(found.id, { id: found.id, title: found.title, author: found.author });
        }
      }
    });
    return Array.from(bookMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [sentQuotes, books]);

  // Filtered quotes based on search and tabs
  const filteredQuotes = useMemo(() => {
    return sentQuotes.filter((quote) => {
      // Filter by tab type
      if (filterType === 'with_book' && !quote.bookId && !quote.bookTitle) {
        return false;
      }

      // Filter by specific book dropdown
      if (selectedBookFilter !== 'all') {
        if (quote.bookId) {
          if (quote.bookId !== selectedBookFilter) return false;
        } else if (quote.bookTitle) {
          const selBook = books.find((b) => b.id === selectedBookFilter);
          if (!selBook || selBook.title.toLowerCase().trim() !== quote.bookTitle.toLowerCase().trim()) {
            return false;
          }
        } else {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          quote.text.toLowerCase().includes(q) ||
          quote.author.toLowerCase().includes(q) ||
          (quote.bookTitle && quote.bookTitle.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [sentQuotes, filterType, selectedBookFilter, searchQuery, books]);

  const handleCopyQuote = (quote: QuoteItem) => {
    const textToCopy = `«${quote.text}»\n— ${quote.author}${quote.bookTitle ? ` (${quote.bookTitle})` : ''}\n\nTanda.kz арқылы оқыңыз`;
    navigator.clipboard.writeText(textToCopy);
    showToast('Цитата көшірілді!', 'success');
  };

  const handleShareQuote = (quote: QuoteItem) => {
    if (navigator.share) {
      navigator.share({
        title: 'Tanda • Цитата',
        text: `«${quote.text}» — ${quote.author}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopyQuote(quote);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
        <Link to="/" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>
          Басты бет
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>Цитаталар</span>
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A192F 0%, #002D50 100%)',
          borderRadius: '24px',
          padding: '36px 32px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 45, 80, 0.15)',
          marginBottom: '32px',
        }}
      >
        {/* Decorative background circle */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240, 128, 0, 0.25) 0%, rgba(240, 128, 0, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '50px',
              background: 'rgba(240, 128, 0, 0.2)',
              color: '#FDBA74',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              marginBottom: '14px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            </svg>
            ШАБЫТТАНДЫРАТЫН СӨЗДЕР
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 10px 0', lineHeight: 1.25 }}>
            Цитаталар қоры
          </h1>
          <p style={{ fontSize: '15px', color: '#CBD5E1', margin: 0, lineHeight: 1.6 }}>
            Платформадан жіберілген нақыл сөздер мен үзінділер. Кез келген цитатаның кітабына өтіп, толық нұсқасын бірден оқи аласыз.
          </p>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      {sentQuotes.length > 0 && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px 24px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Search bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Цитата, автор немесе кітап бойынша іздеу..."
              style={{
                width: '100%',
                padding: '12px 16px 12px 42px',
                borderRadius: '12px',
                border: '1.5px solid #CBD5E1',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                background: '#F8FAFC',
                boxSizing: 'border-box',
                color: 'var(--text-dark)',
              }}
            />
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2.5"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Tabs & Book Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '50px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: filterType === 'all' ? '1.5px solid var(--blue)' : '1.5px solid #CBD5E1',
                  background: filterType === 'all' ? 'var(--blue)' : '#FFFFFF',
                  color: filterType === 'all' ? '#FFFFFF' : 'var(--text-dark)',
                  transition: 'all 0.15s',
                }}
              >
                Барлығы ({sentQuotes.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('with_book')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '50px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: filterType === 'with_book' ? '1.5px solid var(--blue)' : '1.5px solid #CBD5E1',
                  background: filterType === 'with_book' ? 'var(--blue)' : '#FFFFFF',
                  color: filterType === 'with_book' ? '#FFFFFF' : 'var(--text-dark)',
                  transition: 'all 0.15s',
                }}
              >
                Кітаппен байланысты
              </button>
            </div>

            {/* Book Filter Dropdown */}
            {booksWithQuotes.length > 0 && (
              <div style={{ minWidth: '200px' }}>
                <select
                  value={selectedBookFilter}
                  onChange={(e) => setSelectedBookFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${selectedBookFilter !== 'all' ? 'var(--blue)' : '#CBD5E1'}`,
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    background: selectedBookFilter !== 'all' ? '#EFF6FF' : '#F8FAFC',
                    color: selectedBookFilter !== 'all' ? 'var(--blue)' : 'var(--text-dark)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">Барлық кітаптар бойынша</option>
                  {booksWithQuotes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.author})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quotes Cards Grid */}
      {filteredQuotes.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredQuotes.map((quote) => {
            const matchedBook = quote.bookId
              ? books.find((b) => b.id === quote.bookId)
              : quote.bookTitle
              ? books.find((b) => b.title.toLowerCase().trim() === quote.bookTitle?.toLowerCase().trim())
              : null;

            return (
              <div
                key={quote.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Top quote icon */}
                <div>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(0, 84, 148, 0.08)',
                      color: 'var(--blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                    </svg>
                  </div>

                  {/* Quote text */}
                  <p
                    style={{
                      fontSize: '15px',
                      lineHeight: 1.65,
                      fontWeight: 600,
                      color: 'var(--text-dark)',
                      margin: '0 0 14px 0',
                    }}
                  >
                    «{quote.text}»
                  </p>

                  {/* Author */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--blue)', marginBottom: '16px' }}>
                    — {quote.author}
                  </div>
                </div>

                {/* Bottom section (Linked book & Actions) */}
                <div>
                  {/* Linked Book Card */}
                  {(matchedBook || quote.bookTitle) && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '32px',
                            height: '42px',
                            borderRadius: '4px',
                            background: matchedBook?.coverImage ? `url(${matchedBook.coverImage}) center/cover` : 'var(--blue)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFF',
                            fontSize: '10px',
                            fontWeight: 800,
                          }}
                        >
                          {!matchedBook?.coverImage && '📖'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: 'var(--text-dark)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={matchedBook?.title || quote.bookTitle}
                          >
                            {matchedBook?.title || quote.bookTitle}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#64748B',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {matchedBook?.author || quote.author}
                          </div>
                        </div>
                      </div>

                      {matchedBook ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/book/${matchedBook.id}`)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'var(--blue)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0, 84, 148, 0.2)',
                          }}
                        >
                          Кітапты оқу
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Кітаптан</span>
                      )}
                    </div>
                  )}

                  {/* Actions (Copy & Share) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '8px',
                      paddingTop: '10px',
                      borderTop: '1px solid #F1F5F9',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleCopyQuote(quote)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      title="Цитатаны көшіру"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Көшіру
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareQuote(quote)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      title="Бөлісу"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                      Бөлісу
                    </button>
                  </div>
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
            borderRadius: '20px',
            padding: '60px 24px',
            textAlign: 'center',
            border: '1.5px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#F1F5F9',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
            Әзірге жіберілген цитаталар жоқ
          </h3>
          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '440px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
            {searchQuery
              ? 'Іздеу сұранысы бойынша ешқандай цитата табылмады.'
              : 'Әкімшілік тарапынан күнделікті цитаталар жіберілген кезде, олар осы жерде сақталады және кез келген уақытта сол кітапқа өтіп оқи аласыз.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setSelectedBookFilter('all');
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--blue)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Сүзгіні тазалау
            </button>
          )}
        </div>
      )}
    </div>
  );
};
