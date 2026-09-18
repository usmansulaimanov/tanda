import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMessageStore } from '../../store/useMessageStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';

export const MessageNotificationPopup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activePopupMessage, dismissPopup, markAsRead } = useMessageStore();
  const { user } = useAuthStore();
  const { books } = useBookStore();
  const [isVisible, setIsVisible] = useState(false);

  // Check if active popup message is meant for this user
  const isTargeted = useMemo(() => {
    if (!activePopupMessage) return false;
    if (activePopupMessage.targetType === 'all') return true;
    if (user && activePopupMessage.targetUserIds?.includes(user.id)) return true;
    return false;
  }, [activePopupMessage, user]);

  const matchedBook = useMemo(() => {
    if (!activePopupMessage?.bookId) return null;
    return books.find((b) => b.id === activePopupMessage.bookId) || null;
  }, [activePopupMessage, books]);

  useEffect(() => {
    if (activePopupMessage && isTargeted && location.pathname !== '/messages') {
      setIsVisible(true);

      // Play soft chime sound
      if (typeof window !== 'undefined') {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.35);
          }
        } catch {}
      }

      // Auto dismiss after 16 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(dismissPopup, 300);
      }, 16000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [activePopupMessage, isTargeted, dismissPopup, location.pathname]);

  if (!activePopupMessage || !isTargeted || location.pathname === '/messages') return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(dismissPopup, 300);
  };

  const handleOpenMessages = () => {
    if (user && activePopupMessage) {
      markAsRead(activePopupMessage.id, user.id);
    }
    setIsVisible(false);
    setTimeout(dismissPopup, 150);
    navigate('/messages');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        zIndex: 9998,
        maxWidth: '400px',
        width: 'calc(100vw - 32px)',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
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
                background: 'rgba(59, 130, 246, 0.25)',
                border: '1px solid rgba(147, 197, 253, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#93C5FD',
              }}
            >
              ✉️
            </span>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#93C5FD',
                  display: 'block',
                }}
              >
                Жаңа хабарлама
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                {activePopupMessage.senderName || 'Tanda Әкімшілігі'}
              </span>
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

        {/* Message Content */}
        <div style={{ marginBottom: '14px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0' }}>
            {activePopupMessage.title}
          </h4>
          <p
            style={{
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#E2E8F0',
              margin: 0,
              maxHeight: '60px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {activePopupMessage.content}
          </p>
        </div>

        {/* Attached book notice */}
        {(matchedBook || activePopupMessage.bookTitle) && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#93C5FD',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '12px',
            }}
          >
            <span>📖</span>
            <span style={{ fontWeight: 700 }}>«{matchedBook ? matchedBook.title : activePopupMessage.bookTitle}» кітабы бекітілген</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '10px' }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'transparent',
              color: '#94A3B8',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Кейін
          </button>
          <button
            type="button"
            onClick={handleOpenMessages}
            style={{
              background: 'linear-gradient(135deg, var(--blue) 0%, #004070 100%)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 84, 148, 0.4)',
            }}
          >
            Хабарламаны ашу
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
