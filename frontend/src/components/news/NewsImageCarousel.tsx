import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NewsImageCarouselProps {
  images: string[];
  alt: string;
  height?: string | number;
  maxHeight?: string | number;
  borderRadius?: string;
  autoPlayInterval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  showThumbnails?: boolean;
  playOnHoverOnly?: boolean;
  isHovered?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const NewsImageCarousel: React.FC<NewsImageCarouselProps> = ({
  images,
  alt,
  height = '460px',
  maxHeight = '520px',
  borderRadius = '16px',
  autoPlayInterval = 3500,
  showArrows = true,
  showDots = true,
  showCounter = true,
  showThumbnails = false,
  playOnHoverOnly = false,
  isHovered,
  style,
}) => {
  const validImages = (images || []).filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [internalHover, setInternalHover] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const activeHover = isHovered !== undefined ? isHovered : internalHover;

  // Rotation timer
  useEffect(() => {
    if (validImages.length <= 1) return;

    if (playOnHoverOnly) {
      if (!activeHover) {
        // Reset to first/cover image immediately when mouse leaves
        setCurrentIndex(0);
        return;
      }

      // Rotate every 2s (or autoPlayInterval) while mouse is hovering
      const intervalMs = autoPlayInterval > 0 ? autoPlayInterval : 2000;
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % validImages.length);
      }, intervalMs);

      return () => clearInterval(timer);
    } else {
      if (isPaused || autoPlayInterval <= 0) return;

      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % validImages.length);
      }, autoPlayInterval);

      return () => clearInterval(timer);
    }
  }, [validImages.length, isPaused, autoPlayInterval, playOnHoverOnly, activeHover]);

  if (validImages.length === 0) return null;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  // If only 1 image, render single image view
  if (validImages.length === 1) {
    return (
      <div
        style={{
          borderRadius,
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
          height,
          maxHeight,
          background: '#F1F5F9',
          position: 'relative',
          ...style,
        }}
      >
        <img
          src={validImages[0]}
          alt={alt}
          referrerPolicy="no-referrer"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', ...style }}>
      {/* Main Carousel Frame */}
      <div
        onMouseEnter={() => {
          setInternalHover(true);
          if (!playOnHoverOnly) setIsPaused(true);
        }}
        onMouseLeave={() => {
          setInternalHover(false);
          if (!playOnHoverOnly) setIsPaused(false);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          borderRadius,
          overflow: 'hidden',
          boxShadow: playOnHoverOnly ? 'none' : '0 6px 24px rgba(0, 0, 0, 0.08)',
          height,
          maxHeight,
          background: '#0F172A',
          userSelect: 'none',
        }}
      >
        {/* Images with cross-fade transition */}
        {validImages.map((imgUrl, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: idx === currentIndex ? 1 : 0,
              transform: idx === currentIndex ? 'scale(1)' : 'scale(1.02)',
              transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: idx === currentIndex ? 'auto' : 'none',
            }}
          >
            <img
              src={imgUrl}
              alt={`${alt} - ${idx + 1}`}
              referrerPolicy="no-referrer"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ))}

        {/* Navigation Arrows */}
        {showArrows && validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 87, 168, 0.9)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
              aria-label="Алдыңғы сурет"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 87, 168, 0.9)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
              aria-label="Келесі сурет"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Counter Badge (e.g. 1/3) */}
        {showCounter && validImages.length > 1 && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 10,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              letterSpacing: '0.5px',
            }}
          >
            <span>{currentIndex + 1}/{validImages.length}</span>
          </div>
        )}

        {/* Dot Indicators at Bottom */}
        {showDots && validImages.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 7px',
              borderRadius: '20px',
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {validImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                style={{
                  width: idx === currentIndex ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '10px',
                  background: idx === currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                aria-label={`Сурет ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails Row (Optional, for detail pages) */}
      {showThumbnails && validImages.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '12px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
        >
          {validImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: '72px',
                height: '48px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: idx === currentIndex ? '2.5px solid var(--blue)' : '2px solid transparent',
                padding: 0,
                cursor: 'pointer',
                background: '#E2E8F0',
                flexShrink: 0,
                opacity: idx === currentIndex ? 1 : 0.6,
                transform: idx === currentIndex ? 'scale(1.04)' : 'scale(1)',
                transition: 'all 0.2s ease',
                boxShadow: idx === currentIndex ? '0 2px 8px rgba(0, 87, 168, 0.3)' : 'none',
              }}
            >
              <img
                src={imgUrl}
                alt={`Кіші сурет ${idx + 1}`}
                referrerPolicy="no-referrer"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
