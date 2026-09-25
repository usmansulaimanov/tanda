import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book as EpubBookInstance, Rendition } from 'epubjs';
import { ChevronLeft, ChevronRight, List, ZoomIn, ZoomOut, Sun, Moon, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';

interface EpubReaderProps {
  url: string;
  bookTitle?: string;
  bookAuthor?: string;
  onProgressChange?: (progressPercent: number, locationCfi: string) => void;
  initialLocation?: string;
}

interface TocItem {
  id: string;
  label: string;
  href: string;
}

export const EpubReader: React.FC<EpubReaderProps> = ({
  url,
  bookTitle,
  bookAuthor,
  onProgressChange,
  initialLocation,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBookInstance | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [currentLocationText, setCurrentLocationText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const themeStyles = {
    light: {
      bg: '#FFFFFF',
      text: '#0F172A',
      containerBg: '#F8FAFC',
      border: '#E2E8F0',
      headerBg: '#FFFFFF',
    },
    sepia: {
      bg: '#FBF0D9',
      text: '#433422',
      containerBg: '#F4E8CD',
      border: '#EAD7B5',
      headerBg: '#FBF0D9',
    },
    dark: {
      bg: '#0F172A',
      text: '#F1F5F9',
      containerBg: '#020617',
      border: '#1E293B',
      headerBg: '#0F172A',
    },
  };

  const activeTheme = themeStyles[theme];

  // Apply themes to rendition
  const applyThemeToRendition = useCallback((rendition: Rendition, selectedTheme: 'light' | 'sepia' | 'dark', size: number) => {
    try {
      const errorSuppression = {
        display: 'none !important',
        visibility: 'hidden !important',
        opacity: '0 !important',
        height: '0 !important',
        width: '0 !important',
        margin: '0 !important',
        padding: '0 !important',
        border: 'none !important',
        overflow: 'hidden !important',
        position: 'absolute !important',
        'pointer-events': 'none !important',
      };

      const themes = rendition.themes;
      themes.register('light', {
        body: {
          background: '#FFFFFF !important',
          color: '#0F172A !important',
          'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
          'line-height': '1.7 !important',
          padding: '0 16px !important',
        },
        'p, div, span, h1, h2, h3, h4, h5, h6, li': {
          color: '#0F172A !important',
        },
        parsererror: errorSuppression,
        'parsererror *': errorSuppression,
      });

      themes.register('sepia', {
        body: {
          background: '#FBF0D9 !important',
          color: '#433422 !important',
          'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
          'line-height': '1.7 !important',
          padding: '0 16px !important',
        },
        'p, div, span, h1, h2, h3, h4, h5, h6, li': {
          color: '#433422 !important',
        },
        parsererror: errorSuppression,
        'parsererror *': errorSuppression,
      });

      themes.register('dark', {
        body: {
          background: '#0F172A !important',
          color: '#F1F5F9 !important',
          'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
          'line-height': '1.7 !important',
          padding: '0 16px !important',
        },
        'p, div, span, h1, h2, h3, h4, h5, h6, li': {
          color: '#F1F5F9 !important',
        },
        parsererror: errorSuppression,
        'parsererror *': errorSuppression,
      });

      themes.select(selectedTheme);
      themes.fontSize(`${size}px`);
    } catch (e) {
      console.warn('Error applying theme:', e);
    }
  }, []);

  const loadBook = useCallback(async () => {
    if (!viewerRef.current || !url) return;

    setIsLoading(true);
    setLoadError(null);

    // Clean up previous book instance
    if (renditionRef.current) {
      try {
        renditionRef.current.destroy();
      } catch {}
      renditionRef.current = null;
    }
    if (bookRef.current) {
      try {
        bookRef.current.destroy();
      } catch {}
      bookRef.current = null;
    }

    if (viewerRef.current) {
      viewerRef.current.innerHTML = '';
    }

    try {
      // Fetch binary ArrayBuffer to avoid any internal URL resolution / streaming quirks
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Файлды жүктеу мүмкін болмады (HTTP ${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();

      const book = ePub(arrayBuffer);
      bookRef.current = book;

      // Intercept and auto-fix unescaped XML entities before parsing
      if (book.spine && book.spine.hooks) {
        book.spine.hooks.serialize.register((output: string) => {
          if (typeof output === 'string') {
            return output.replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
          }
          return output;
        });
      }

      // Load table of contents
      book.loaded.navigation.then((nav) => {
        if (nav.toc) {
          setToc(
            nav.toc.map((item, idx) => ({
              id: item.id || `toc-${idx}`,
              label: item.label ? item.label.trim() : `Тарау ${idx + 1}`,
              href: item.href,
            }))
          );
        }
      });

      // Generate locations for accurate progress calculation
      book.ready.then(() => {
        book.locations.generate(1024).then(() => {
          if (renditionRef.current) {
            const loc = renditionRef.current.currentLocation() as any;
            if (loc && loc.start) {
              const progress = book.locations.percentageFromCfi(loc.start.cfi);
              setProgressPercent(Math.round(progress * 100));
            }
          }
        });
      });

      const rendition = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'auto',
        minSpreadWidth: 800,
      });
      renditionRef.current = rendition;

      applyThemeToRendition(rendition, theme, fontSize);

      // Clean up any browser parsererror elements from DOM and inject CSS overrides
      rendition.hooks.content.register((contents: any) => {
        try {
          const doc = contents.document || contents.window?.document;
          if (doc) {
            const parserErrors = doc.querySelectorAll('parsererror');
            parserErrors.forEach((el: Element) => el.remove());

            const style = doc.createElement('style');
            style.textContent = `
              parsererror, parsererror * {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
              }
            `;
            doc.head?.appendChild(style);
          }
        } catch {}
      });

      rendition.hooks.render.register((view: any) => {
        try {
          const doc = view.document || view.iframe?.contentDocument;
          if (doc) {
            const parserErrors = doc.querySelectorAll('parsererror');
            parserErrors.forEach((el: Element) => el.remove());
          }
        } catch {}
      });

      rendition.on('relocated', (location: any) => {
        if (location && location.start) {
          const cfi = location.start.cfi;
          if (book.locations && book.locations.length() > 0) {
            const progress = book.locations.percentageFromCfi(cfi);
            const pct = Math.round(progress * 100);
            setProgressPercent(pct);
            setCurrentLocationText(`${pct}% оқылды`);
            if (onProgressChange) {
              onProgressChange(pct, cfi);
            }
          } else {
            setCurrentLocationText(location.start.displayed?.page ? `Бет ${location.start.displayed.page}` : '');
          }
        }
      });

      // Keyboard listeners inside rendition iframe
      rendition.on('keyup', (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          rendition.next();
        } else if (e.key === 'ArrowLeft') {
          rendition.prev();
        }
      });

      await rendition.display(initialLocation || undefined);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to load EPUB:', err);
      setLoadError(err.message || 'Электронды кітапты ашу кезінде қате орын алды');
      setIsLoading(false);
    }
  }, [url, initialLocation, applyThemeToRendition, theme, fontSize, onProgressChange]);

  useEffect(() => {
    loadBook();

    return () => {
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch {}
      }
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch {}
      }
    };
  }, [loadBook]);

  // Global window keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!renditionRef.current) return;
      if (e.key === 'ArrowRight') {
        renditionRef.current.next();
      } else if (e.key === 'ArrowLeft') {
        renditionRef.current.prev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNextPage = () => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  };

  const handlePrevPage = () => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'sepia' | 'dark') => {
    setTheme(newTheme);
    if (renditionRef.current) {
      applyThemeToRendition(renditionRef.current, newTheme, fontSize);
    }
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(32, fontSize + delta));
    setFontSize(newSize);
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}px`);
    }
  };

  const handleTocSelect = (href: string) => {
    if (renditionRef.current) {
      renditionRef.current.display(href);
      setIsTocOpen(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: '620px',
        backgroundColor: activeTheme.containerBg,
        borderRadius: '16px',
        border: `1.5px solid ${activeTheme.border}`,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          backgroundColor: activeTheme.headerBg,
          borderBottom: `1px solid ${activeTheme.border}`,
          zIndex: 10,
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Table of Contents Button */}
          {toc.length > 0 && (
            <button
              onClick={() => setIsTocOpen(!isTocOpen)}
              title="Тараулар мазмұны"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: `1px solid ${activeTheme.border}`,
                backgroundColor: isTocOpen ? 'var(--blue)' : 'transparent',
                color: isTocOpen ? '#FFFFFF' : activeTheme.text,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <List size={16} />
              <span className="hidden sm:inline">Тараулар</span>
            </button>
          )}

          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: activeTheme.text, lineHeight: 1.2 }}>
              {bookTitle || 'Электронды кітап'}
            </div>
            {bookAuthor && (
              <div style={{ fontSize: '11px', opacity: 0.7, color: activeTheme.text }}>
                {bookAuthor}
              </div>
            )}
          </div>
        </div>

        {/* Right side controls: font, theme, progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Font Size Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: activeTheme.containerBg, padding: '3px', borderRadius: '8px', border: `1px solid ${activeTheme.border}` }}>
            <button
              onClick={() => handleFontSizeChange(-2)}
              disabled={fontSize <= 12}
              title="Қаріпті кішірейту"
              style={{
                padding: '4px 8px',
                border: 'none',
                background: 'transparent',
                color: activeTheme.text,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '4px',
              }}
            >
              A-
            </button>
            <span style={{ fontSize: '11px', fontWeight: 700, color: activeTheme.text, minWidth: '32px', textAlign: 'center' }}>
              {fontSize}px
            </span>
            <button
              onClick={() => handleFontSizeChange(2)}
              disabled={fontSize >= 32}
              title="Қаріпті үлкейту"
              style={{
                padding: '4px 8px',
                border: 'none',
                background: 'transparent',
                color: activeTheme.text,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '4px',
              }}
            >
              A+
            </button>
          </div>

          {/* Theme Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: activeTheme.containerBg, padding: '3px', borderRadius: '8px', border: `1px solid ${activeTheme.border}` }}>
            <button
              onClick={() => handleThemeChange('light')}
              title="Ашық режим"
              style={{
                padding: '4px 8px',
                border: 'none',
                borderRadius: '4px',
                background: theme === 'light' ? '#FFFFFF' : 'transparent',
                color: '#0F172A',
                fontWeight: theme === 'light' ? 700 : 500,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Ашық
            </button>
            <button
              onClick={() => handleThemeChange('sepia')}
              title="Сепия режимі"
              style={{
                padding: '4px 8px',
                border: 'none',
                borderRadius: '4px',
                background: theme === 'sepia' ? '#FBF0D9' : 'transparent',
                color: '#5F4B32',
                fontWeight: theme === 'sepia' ? 700 : 500,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: theme === 'sepia' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Сепия
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              title="Түнгі режим"
              style={{
                padding: '4px 8px',
                border: 'none',
                borderRadius: '4px',
                background: theme === 'dark' ? '#1E293B' : 'transparent',
                color: '#F1F5F9',
                fontWeight: theme === 'dark' ? 700 : 500,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              Түнгі
            </button>
          </div>
        </div>
      </div>

      {/* Main Reading Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: activeTheme.bg }}>
        {/* Loading Spinner */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeTheme.bg,
              zIndex: 20,
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '3.5px solid #CBD5E1',
                borderTopColor: 'var(--blue)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div style={{ fontSize: '14px', fontWeight: 700, color: activeTheme.text }}>
              Электронды кітап жүктелуде...
            </div>
          </div>
        )}

        {/* Load Error View */}
        {loadError && !isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeTheme.bg,
              zIndex: 20,
              padding: '24px',
              textAlign: 'center',
              gap: '16px',
            }}
          >
            <AlertCircle size={48} color="#DC2626" />
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#DC2626' }}>
              Кітапты ашу мүмкін болмады
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '400px' }}>
              {loadError}
            </div>
            <button
              onClick={loadBook}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              <RefreshCw size={16} />
              Қайта көру
            </button>
          </div>
        )}

        {/* EPUB Render Mount Point */}
        <div
          ref={viewerRef}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: activeTheme.bg,
          }}
        />

        {/* Table of Contents Drawer */}
        {isTocOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '300px',
              maxWidth: '80%',
              backgroundColor: activeTheme.headerBg,
              borderRight: `1.5px solid ${activeTheme.border}`,
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 20px rgba(0,0,0,0.12)',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: `1px solid ${activeTheme.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: activeTheme.text }}>
                Тараулар мазмұны
              </h4>
              <button
                onClick={() => setIsTocOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: activeTheme.text,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {toc.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTocSelect(item.href)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: activeTheme.text,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    marginBottom: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = activeTheme.containerBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Left / Right Page Flip Overlay Controls */}
        {!isLoading && !loadError && (
          <>
            <button
              onClick={handlePrevPage}
              title="Алдыңғы бет (←)"
              aria-label="Алдыңғы бет"
              style={{
                position: 'absolute',
                top: '50%',
                left: '12px',
                transform: 'translateY(-50%)',
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: activeTheme.headerBg,
                border: `1.5px solid ${activeTheme.border}`,
                color: activeTheme.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 15,
                transition: 'all 0.2s',
                opacity: 0.85,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.85';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <ChevronLeft size={22} />
            </button>

            <button
              onClick={handleNextPage}
              title="Келесі бет (→)"
              aria-label="Келесі бет"
              style={{
                position: 'absolute',
                top: '50%',
                right: '12px',
                transform: 'translateY(-50%)',
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: activeTheme.headerBg,
                border: `1.5px solid ${activeTheme.border}`,
                color: activeTheme.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 15,
                transition: 'all 0.2s',
                opacity: 0.85,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.85';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* Bottom Progress Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 20px',
          backgroundColor: activeTheme.headerBg,
          borderTop: `1px solid ${activeTheme.border}`,
          fontSize: '12px',
          color: activeTheme.text,
          opacity: 0.85,
          fontWeight: 600,
        }}
      >
        <div>
          {currentLocationText || (progressPercent > 0 ? `${progressPercent}%` : 'Басы')}
        </div>

        {/* Linear progress bar */}
        <div
          style={{
            flex: '0 0 160px',
            height: '5px',
            borderRadius: '10px',
            backgroundColor: activeTheme.border,
            overflow: 'hidden',
            margin: '0 16px',
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, progressPercent))}%`,
              height: '100%',
              backgroundColor: 'var(--blue)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ fontSize: '11px', opacity: 0.7 }}>
          Парақтау: ⬅ ➡
        </div>
      </div>
    </div>
  );
};
