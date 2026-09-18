import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuoteStore } from '../../store/useQuoteStore';
import { useBookStore } from '../../store/useBookStore';

export const QuoteNotificationPopup: React.FC = () => {
  const navigate = useNavigate();
  const { activeNotification, dismissNotification, settings } = useQuoteStore();
  const { books } = useBookStore();
  const [isVisible, setIsVisible] = useState(false);

  const matchedBook = useMemo(() => {
    if (!activeNotification) return null;
    if (activeNotification.bookId) {
      return books.find((b) => b.id === activeNotification.bookId) || null;
    }
    if (activeNotification.bookTitle) {
      return (
        books.find(
          (b) =>
            b.title.toLowerCase().trim() === activeNotification.bookTitle?.toLowerCase().trim()
        ) || null
      );
    }
    return null;
  }, [activeNotification, books]);

  useEffect(() => {
    if (activeNotification) {
      setIsVisible(true);

      // Play soft chime sound using Web Audio API if sound is enabled
      if (settings.soundEnabled && typeof window !== 'undefined') {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          }
        } catch {}
      }

      // Auto dismiss after 15 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(dismissNotification, 300);
      }, 15000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [activeNotification, dismissNotification, settings.soundEnabled]);

  if (!activeNotification) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(dismissNotification, 300);
  };

  const handleGoToBook = (bookId: string) => {
    setIsVisible(false);
    setTimeout(dismissNotification, 150);
    navigate(`/book/${bookId}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '88px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '420px',
        width: 'calc(100vw - 32px)',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0A192F 0%, #002D50 100%)',
          borderRadius: '18px',
          padding: '20px 22px',
          boxShadow: '0 20px 50px rgba(0, 45, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.12)',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Background decorative watermark */}
        <div
          style={{
            position: 'absolute',
            right: '-15px',
            bottom: '-25px',
            fontSize: '110px',
            fontFamily: 'serif',
            color: 'rgba(255, 255, 255, 0.04)',
            userSelect: 'none',
            pointerEvents: 'none',
            lineHeight: 1,
          }}
        >
          ❝
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(235, 130, 60, 0.2)',
                border: '1px solid rgba(235, 130, 60, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--orange, #EB823C)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              </svg>
            </span>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: 'var(--orange, #EB823C)',
                  display: 'block',
                }}
              >
                Күн цитатасы
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>Tanda • Даналық сөзі</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#94A3B8';
            }}
            aria-label="Жабу"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Quote Text */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '14px' }}>
          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              fontWeight: 600,
              fontStyle: 'italic',
              color: '#F8FAFC',
              margin: '0 0 10px 0',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            «{activeNotification.text}»
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--orange, #EB823C)',
              }}
            >
              — {activeNotification.author}
            </span>

            {/* Clickable Book Source Link / Badge */}
            {(matchedBook || activeNotification.bookTitle) && (
              <button
                type="button"
                onClick={() => {
                  if (matchedBook) {
                    handleGoToBook(matchedBook.id);
                  }
                }}
                title={matchedBook ? `«${matchedBook.title}» кітабына өту` : undefined}
                style={{
                  background: matchedBook ? 'rgba(0, 84, 148, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                  border: matchedBook ? '1px solid rgba(147, 197, 253, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: matchedBook ? '#93C5FD' : '#94A3B8',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: matchedBook ? 'pointer' : 'default',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (matchedBook) {
                    e.currentTarget.style.background = 'rgba(0, 84, 148, 0.7)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (matchedBook) {
                    e.currentTarget.style.background = 'rgba(0, 84, 148, 0.4)';
                    e.currentTarget.style.color = '#93C5FD';
                  }
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                  <path d="M6 6h10"></path>
                  <path d="M6 10h10"></path>
                </svg>
                <span>«{matchedBook ? matchedBook.title : activeNotification.bookTitle}»</span>
                {matchedBook && <span>→</span>}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '10px',
            marginTop: '6px',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'linear-gradient(135deg, #F08000 0%, #D96B00 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 18px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(240, 128, 0, 0.3)',
            }}
          >
            Керемет!
          </button>
        </div>
      </div>
    </div>
  );
};
