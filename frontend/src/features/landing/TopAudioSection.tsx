import React, { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useTopAudioStore } from '../../store/useTopAudioStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { useMyBooksStore } from '../../store/useMyBooksStore';

export const TopAudioSection: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { books } = useBookStore();
  const { listenHistory, getTop10AudioBooks } = useTopAudioStore();
  const { currentBook, isPlaying, playBook, togglePlay } = useAudioPlayerStore();
  const { isAuthenticated } = useAuthStore();
  const { showToast } = useToastStore();
  const { markAsReading } = useMyBooksStore();

  const activeBooks = useMemo(() => books.filter((b) => !b.isArchived), [books]);
  const top10 = useMemo(() => getTop10AudioBooks(activeBooks), [getTop10AudioBooks, activeBooks, listenHistory]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 340 * 2;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handlePlayClick = (e: React.MouseEvent, book: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('Аудионы тыңдау үшін тіркеліңіз немесе жүйеге кіріңіз', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/listen/${book.id}`)}`);
      return;
    }

    if (currentBook?.id === book.id) {
      togglePlay();
    } else {
      markAsReading(book.id, 1, book.pages ? parseInt(String(book.pages)) : undefined);
      playBook(book);
      navigate(`/listen/${book.id}`);
    }
  };

  if (!top10 || top10.length === 0) {
    return null;
  }

  return (
    <section
      className="top-audio-section tanda-section"
      id="top-audio"
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '50px 0 60px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div>
            <h2
              className="section-title"
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 6px 0',
              }}
            >
              Үздік кітаптар
            </h2>

            <p className="section-sub" style={{ margin: 0, color: '#64748B', fontSize: '15px' }}>
              Платформада бүгін оқырмандар ең көп тыңдаған 10 үздік аудиокітап
            </p>
          </div>

          {/* Carousel Arrows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => scroll('left')}
              aria-label="Алдыңғы кітаптар"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                border: '1.5px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--blue)';
                e.currentTarget.style.color = 'var(--blue)';
                e.currentTarget.style.transform = 'scale(1.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.color = '#0F172A';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>

            <button
              onClick={() => scroll('right')}
              aria-label="Келесі кітаптар"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                border: '1.5px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--blue)';
                e.currentTarget.style.color = 'var(--blue)';
                e.currentTarget.style.transform = 'scale(1.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.color = '#0F172A';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal Carousel */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '20px',
            overflowX: 'auto',
            paddingBottom: '16px',
            paddingTop: '6px',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="no-scrollbar"
        >
          {top10.map((item) => {
            const { book, rank, todayListens } = item;
            const isThisPlaying = isPlaying && currentBook?.id === book.id;

            // Badges styling based on rank
            let badgeBg = 'linear-gradient(135deg, #002D50, #005494)';
            let badgeBorder = 'rgba(255, 255, 255, 0.2)';
            let badgeColor = '#FFFFFF';
            let rankText = `#${rank}`;
            let cardBorder = '#E2E8F0';

            if (rank === 1) {
              badgeBg = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
              badgeBorder = '#FDE68A';
              badgeColor = '#FFFFFF';
              rankText = '🥇 #1';
              cardBorder = '#FCD34D';
            } else if (rank === 2) {
              badgeBg = 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)';
              badgeBorder = '#E2E8F0';
              badgeColor = '#FFFFFF';
              rankText = '🥈 #2';
              cardBorder = '#CBD5E1';
            } else if (rank === 3) {
              badgeBg = 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';
              badgeBorder = '#FFEDD5';
              badgeColor = '#FFFFFF';
              rankText = '🥉 #3';
              cardBorder = '#FDBA74';
            }

            return (
              <div
                key={book.id}
                onClick={() => navigate(`/book/${book.id}`)}
                style={{
                  flex: '0 0 260px',
                  scrollSnapAlign: 'start',
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  border: `1.5px solid ${cardBorder}`,
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: rank <= 3 ? '0 8px 20px -6px rgba(0, 84, 148, 0.08)' : '0 4px 12px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 14px 28px -6px rgba(0, 84, 148, 0.16)';
                  e.currentTarget.style.borderColor = 'var(--blue)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = rank <= 3 ? '0 8px 20px -6px rgba(0, 84, 148, 0.08)' : '0 4px 12px rgba(0,0,0,0.03)';
                  e.currentTarget.style.borderColor = cardBorder;
                }}
              >
                {/* Top Rank Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 3,
                    background: badgeBg,
                    color: badgeColor,
                    fontSize: '13px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: `1.5px solid ${badgeBorder}`,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {rankText}
                </div>

                {/* Cover Container */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1.35',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    position: 'relative',
                    marginBottom: '12px',
                    background: book.gradient || 'linear-gradient(135deg, #002D50, #005494)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#FFFFFF',
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px', lineHeight: 1.3 }}>
                        {book.title}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.85 }}>{book.author}</div>
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <button
                    onClick={(e) => handlePlayClick(e, book)}
                    aria-label={isThisPlaying ? 'Кідірту' : 'Тыңдау'}
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: isThisPlaying ? '#EA580C' : '#005494',
                      color: '#FFFFFF',
                      border: '2px solid rgba(255, 255, 255, 0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      transition: 'all 0.2s ease',
                      zIndex: 2,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.background = '#F97316';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.background = isThisPlaying ? '#EA580C' : '#005494';
                    }}
                  >
                    {isThisPlaying ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1.5" />
                        <rect x="14" y="4" width="4" height="16" rx="1.5" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Book Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Category */}
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--blue)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '4px',
                    }}
                  >
                    {book.category || 'Аудиокітап'}
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#0F172A',
                      margin: '0 0 4px 0',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '38px',
                    }}
                    title={book.title}
                  >
                    {book.title}
                  </h3>

                  {/* Author */}
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#64748B',
                      marginBottom: '10px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={book.author}
                  >
                    {book.author}
                  </div>

                  {/* Listens & Duration Metrics */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '8px',
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: '#EA580C',
                        fontWeight: 700,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                      </svg>
                      {todayListens} бүгін
                    </span>

                    {book.audioDuration && (
                      <span style={{ color: '#64748B', fontSize: '11px' }}>
                        ⏱ {book.audioDuration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
