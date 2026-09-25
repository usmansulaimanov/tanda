import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book as EpubBookInstance, Rendition } from 'epubjs';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Sun, Moon, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';

export interface EpubReaderProps {
  url: string;
  bookTitle?: string;
  bookAuthor?: string;
  onProgressChange?: (progressPercent: number, locationCfi: string) => void;
  initialLocation?: string;
  theme?: 'light' | 'sepia' | 'dark';
  onThemeChange?: (theme: 'light' | 'sepia' | 'dark') => void;
  colorTemperature?: number;
  onColorTemperatureChange?: (temp: number) => void;
}

export function getLightBgByTemp(temp: number): { bg: string; containerBg: string; border: string; headerBg: string } {
  if (!temp || temp === 0) {
    return {
      bg: '#FFFFFF',
      containerBg: '#F8FAFC',
      border: '#E2E8F0',
      headerBg: '#FFFFFF',
    };
  }
  if (temp > 0) {
    // Warm: soft warm ivory/cream (0 to +50)
    const r = Math.min(1, Math.max(0, temp / 50));
    const red = Math.round(255 - r * 3);
    const green = Math.round(255 - r * 11);
    const blue = Math.round(255 - r * 32);
    const bg = `rgb(${red}, ${green}, ${blue})`;
    const contBg = `rgb(${red - 8}, ${green - 10}, ${blue - 13})`;
    const border = `rgb(${red - 20}, ${green - 24}, ${blue - 28})`;
    return {
      bg,
      containerBg: contBg,
      border,
      headerBg: bg,
    };
  } else {
    // Cool: soft crisp cool blue-white (0 to -50)
    const r = Math.min(1, Math.max(0, Math.abs(temp) / 50));
    const red = Math.round(255 - r * 16);
    const green = Math.round(255 - r * 8);
    const blue = 255;
    const bg = `rgb(${red}, ${green}, ${blue})`;
    const contBg = `rgb(${red - 8}, ${green - 6}, ${blue - 3})`;
    const border = `rgb(${red - 22}, ${green - 18}, ${blue - 14})`;
    return {
      bg,
      containerBg: contBg,
      border,
      headerBg: bg,
    };
  }
}

export const EpubReader: React.FC<EpubReaderProps> = ({
  url,
  bookTitle,
  bookAuthor,
  onProgressChange,
  initialLocation,
  theme: propTheme,
  onThemeChange,
  colorTemperature: propColorTemperature,
  onColorTemperatureChange,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBookInstance | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(18);
  const [internalTheme, setInternalTheme] = useState<'light' | 'sepia' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_reader_theme');
      if (saved === 'sepia' || saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });
  const theme = propTheme !== undefined ? propTheme : internalTheme;

  const [internalColorTemperature, setInternalColorTemperature] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_reader_temp');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= -50 && parsed <= 50) return parsed;
      }
    }
    return 0;
  });
  const colorTemperature = propColorTemperature !== undefined ? propColorTemperature : internalColorTemperature;

  const [currentLocationText, setCurrentLocationText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const lightBgInfo = getLightBgByTemp(colorTemperature);

  const themeStyles = {
    light: {
      bg: lightBgInfo.bg,
      text: '#0F172A',
      containerBg: lightBgInfo.containerBg,
      border: lightBgInfo.border,
      headerBg: lightBgInfo.headerBg,
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
  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const colorTempRef = useRef(colorTemperature);
  useEffect(() => {
    colorTempRef.current = colorTemperature;
  }, [colorTemperature]);

  const getThemeCss = (selectedTheme: 'light' | 'sepia' | 'dark', temp: number) => {
    const lightDynamic = getLightBgByTemp(temp);
    const current = selectedTheme === 'light' ? { ...themeStyles.light, ...lightDynamic } : themeStyles[selectedTheme];
    return `
      html, body {
        background-color: ${current.bg} !important;
        background: ${current.bg} !important;
        color: ${current.text} !important;
        -webkit-text-fill-color: ${current.text} !important;
      }
      *, *::before, *::after {
        color: ${current.text} !important;
        -webkit-text-fill-color: ${current.text} !important;
        background-color: transparent !important;
      }
      img, svg, video, audio {
        background-color: transparent !important;
      }
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
  };

  const applyDirectThemeStyleToDoc = useCallback((doc: Document | null | undefined, selectedTheme: 'light' | 'sepia' | 'dark', temp: number) => {
    if (!doc) return;
    try {
      const lightDynamic = getLightBgByTemp(temp);
      const current = selectedTheme === 'light' ? { ...themeStyles.light, ...lightDynamic } : themeStyles[selectedTheme];
      let style = doc.getElementById('tanda-reader-theme-style') as HTMLStyleElement | null;
      if (!style) {
        style = doc.createElement('style');
        style.id = 'tanda-reader-theme-style';
      }
      style.textContent = getThemeCss(selectedTheme, temp);
      if (doc.head) {
        doc.head.appendChild(style);
      } else if (doc.body) {
        doc.body.appendChild(style);
      }

      if (doc.body) {
        doc.body.style.setProperty('background-color', current.bg, 'important');
        doc.body.style.setProperty('color', current.text, 'important');
        doc.body.style.setProperty('-webkit-text-fill-color', current.text, 'important');
      }
      if (doc.documentElement) {
        doc.documentElement.style.setProperty('background-color', current.bg, 'important');
        doc.documentElement.style.setProperty('color', current.text, 'important');
        doc.documentElement.style.setProperty('-webkit-text-fill-color', current.text, 'important');
      }
    } catch (e) {
      console.warn('Error applying direct theme style to doc:', e);
    }
  }, []);

  // Apply themes to rendition
  const applyThemeToRendition = useCallback((rendition: Rendition, _selectedTheme: 'light' | 'sepia' | 'dark', size: number) => {
    try {
      rendition.themes.fontSize(`${size}px`);
    } catch (e) {
      console.warn('Error applying theme:', e);
    }
  }, []);

  const onProgressChangeRef = useRef(onProgressChange);
  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

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

      const updateProgressFromLocation = (location: any) => {
        if (!location || !location.start || !book) return;
        const start = location.start;
        const cfi = start.cfi;

        let pct = 0;
        const dispPage = start.displayed?.page;
        const dispTotal = start.displayed?.total;

        if (dispPage === 1) {
          pct = 0;
        } else if (typeof dispPage === 'number' && typeof dispTotal === 'number' && dispTotal > 0) {
          if (dispPage >= dispTotal) {
            pct = 100;
          } else if (dispTotal > 1) {
            pct = Math.max(1, Math.min(99, Math.round(((dispPage - 1) / (dispTotal - 1)) * 100)));
          } else {
            pct = 100;
          }
        } else if (book.locations && book.locations.length() > 0 && cfi) {
          try {
            const locIdx = book.locations.locationFromCfi(cfi);
            const totLocs = (book.locations as any).total || book.locations.length();
            if (typeof locIdx === 'number' && locIdx >= 0 && totLocs > 1) {
              pct = Math.max(0, Math.min(100, Math.round((locIdx / (totLocs - 1)) * 100)));
            } else {
              const rawPct = book.locations.percentageFromCfi(cfi);
              if (typeof rawPct === 'number' && !isNaN(rawPct) && rawPct > 0) {
                pct = Math.max(0, Math.min(100, Math.round(rawPct * 100)));
              }
            }
          } catch (e) {
            console.warn('Error computing location percentage:', e);
          }
        } else if (typeof start.percentage === 'number' && !isNaN(start.percentage) && start.percentage > 0) {
          pct = Math.max(0, Math.min(100, Math.round(start.percentage * 100)));
        } else if (book.spine && (book.spine as any).length > 1) {
          const spineLen = (book.spine as any).length;
          const spineIdx = typeof start.index === 'number' ? start.index : 0;
          pct = Math.max(0, Math.min(100, Math.round((spineIdx / (spineLen - 1)) * 100)));
        } else if (typeof dispPage === 'number' && dispPage > 1) {
          const tot = dispTotal || (book.locations?.length() > 0 ? book.locations.length() : undefined);
          if (tot && tot >= dispPage) {
            pct = tot > 1 ? Math.max(1, Math.min(100, Math.round(((dispPage - 1) / (tot - 1)) * 100))) : 100;
          }
        }

        // Guarantee 0% on first page and 100% on last page
        if (dispPage === 1 || (start.index === 0 && (!dispPage || dispPage <= 1))) {
          pct = 0;
        } else if (dispPage && dispTotal && dispPage >= dispTotal) {
          pct = 100;
        }

        setProgressPercent(pct);
        const pageText = dispPage ? ` • Бет ${dispPage}${dispTotal ? ` / ${dispTotal}` : ''}` : '';
        setCurrentLocationText(`${pct}% оқылды${pageText}`);
        onProgressChangeRef.current?.(pct, cfi);
      };

      // Generate locations for accurate progress calculation
      book.ready.then(async () => {
        try {
          await book.locations.generate(600);
          if (renditionRef.current) {
            const loc = (renditionRef.current as any).currentLocation();
            if (loc) {
              updateProgressFromLocation(loc);
            }
          }
        } catch (err) {
          console.warn('Locations generation failed:', err);
        }
      });

      const rendition = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'none',
      });
      renditionRef.current = rendition;

      applyThemeToRendition(rendition, themeRef.current, fontSize);

      // Clean up any browser parsererror elements from DOM and inject CSS overrides
      rendition.hooks.content.register((contents: any) => {
        try {
          const doc = contents.document || contents.window?.document;
          if (doc) {
            const parserErrors = doc.querySelectorAll('parsererror');
            parserErrors.forEach((el: Element) => el.remove());
            applyDirectThemeStyleToDoc(doc, themeRef.current, colorTempRef.current);
          }
        } catch {}
      });

      rendition.hooks.render.register((view: any) => {
        try {
          const doc = view.document || view.iframe?.contentDocument;
          if (doc) {
            const parserErrors = doc.querySelectorAll('parsererror');
            parserErrors.forEach((el: Element) => el.remove());
            applyDirectThemeStyleToDoc(doc, themeRef.current, colorTempRef.current);
          }
        } catch {}
      });

      rendition.on('relocated', (location: any) => {
        updateProgressFromLocation(location);
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
  }, [url, initialLocation]);

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
    setInternalTheme(newTheme);
    onThemeChange?.(newTheme);
    themeRef.current = newTheme;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanda_reader_theme', newTheme);
      } catch {}
    }
    if (renditionRef.current) {
      applyThemeToRendition(renditionRef.current, newTheme, fontSize);
      try {
        const contents = (renditionRef.current as any).getContents?.() || [];
        contents.forEach((content: any) => {
          const doc = content.document || content.window?.document;
          if (doc) {
            applyDirectThemeStyleToDoc(doc, newTheme, colorTempRef.current);
          }
        });
        if (viewerRef.current) {
          const iframes = viewerRef.current.querySelectorAll('iframe');
          iframes.forEach((iframe) => {
            try {
              if (iframe.contentDocument) {
                applyDirectThemeStyleToDoc(iframe.contentDocument, newTheme, colorTempRef.current);
              }
            } catch {}
          });
        }
      } catch (err) {
        console.warn('Failed to update open iframe themes:', err);
      }
    }
  };

  const handleColorTempChange = (temp: number) => {
    setInternalColorTemperature(temp);
    onColorTemperatureChange?.(temp);
    colorTempRef.current = temp;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanda_reader_temp', String(temp));
      } catch {}
    }
    if (renditionRef.current && themeRef.current === 'light') {
      try {
        const contents = (renditionRef.current as any).getContents?.() || [];
        contents.forEach((content: any) => {
          const doc = content.document || content.window?.document;
          if (doc) {
            applyDirectThemeStyleToDoc(doc, 'light', temp);
          }
        });
        if (viewerRef.current) {
          const iframes = viewerRef.current.querySelectorAll('iframe');
          iframes.forEach((iframe) => {
            try {
              if (iframe.contentDocument) {
                applyDirectThemeStyleToDoc(iframe.contentDocument, 'light', temp);
              }
            } catch {}
          });
        }
      } catch (err) {
        console.warn('Failed to update color temperature in iframe:', err);
      }
    }
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(32, fontSize + delta));
    setFontSize(newSize);
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}px`);
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
        transition: 'background-color 0.25s ease, border-color 0.25s ease',
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
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

        {/* Right side controls: White balance slider, font size, theme switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* 1. White Balance / Color Temperature Slider (Only in Light mode) */}
          {theme === 'light' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: activeTheme.containerBg,
                padding: '6px 12px',
                borderRadius: '8px',
                border: `1px solid ${activeTheme.border}`,
                transition: 'all 0.2s',
              }}
              title="Ақ түс балансы: солға — салқын, оңға — жылы"
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '80px' }}>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={colorTemperature}
                  onChange={(e) => handleColorTempChange(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: '#CBD5E1',
                    accentColor: '#0F172A',
                    appearance: 'auto',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                {/* Center marker dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '2px',
                    height: '8px',
                    backgroundColor: '#0F172A',
                    borderRadius: '1px',
                    pointerEvents: 'none',
                    opacity: 0.5,
                    zIndex: 0,
                  }}
                />
              </div>
            </div>
          )}

          {/* 2. Font Size Controls */}
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

          {/* 3. Theme Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: activeTheme.containerBg, padding: '3px', borderRadius: '8px', border: `1px solid ${activeTheme.border}` }}>
            <button
              onClick={() => handleThemeChange('light')}
              title="Ашық режим"
              style={{
                padding: '4px 8px',
                border: 'none',
                borderRadius: '4px',
                background: theme === 'light' ? '#FFFFFF' : 'transparent',
                color: theme === 'light' ? '#0F172A' : activeTheme.text,
                fontWeight: theme === 'light' ? 700 : 600,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                opacity: theme === 'light' ? 1 : 0.85,
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
                color: theme === 'sepia' ? '#433422' : activeTheme.text,
                fontWeight: theme === 'sepia' ? 700 : 600,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: theme === 'sepia' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                opacity: theme === 'sepia' ? 1 : 0.85,
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
                color: theme === 'dark' ? '#F1F5F9' : activeTheme.text,
                fontWeight: theme === 'dark' ? 700 : 600,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                opacity: theme === 'dark' ? 1 : 0.85,
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
