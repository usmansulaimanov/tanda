import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book as EpubBookInstance, Rendition } from 'epubjs';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Sun, Moon, BookOpen, FileText, AlertCircle, RefreshCw, X, SlidersHorizontal, Type, ArrowLeft } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUtils';

export type ReaderTheme = 'light' | 'sepia' | 'gray' | 'dark';

export interface EpubReaderProps {
  url: string;
  bookTitle?: string;
  bookAuthor?: string;
  onProgressChange?: (progressPercent: number, locationCfi: string) => void;
  initialLocation?: string;
  theme?: ReaderTheme;
  onThemeChange?: (theme: ReaderTheme) => void;
  colorTemperature?: number;
  onColorTemperatureChange?: (temp: number) => void;
  onBack?: () => void;
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
  onBack,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBookInstance | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_reader_fontSize');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 32) return parsed;
      }
    }
    return 18;
  });
  const [internalTheme, setInternalTheme] = useState<ReaderTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_reader_theme');
      if (saved === 'sepia' || saved === 'dark' || saved === 'light' || saved === 'gray') return saved;
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
  const [spreadMode, setSpreadMode] = useState<'single' | 'double'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_reader_spread');
      if (saved === 'single' || saved === 'double') return saved;
      return window.innerWidth >= 1024 ? 'double' : 'single';
    }
    return 'single';
  });
  const spreadModeRef = useRef(spreadMode);
  useEffect(() => {
    spreadModeRef.current = spreadMode;
  }, [spreadMode]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [totalBookPages, setTotalBookPages] = useState<number>(0);
  const [sliderDragPercent, setSliderDragPercent] = useState<number | null>(null);
  const isDraggingSliderRef = useRef(false);
  const [isAtStart, setIsAtStart] = useState<boolean>(true);
  const [isAtEnd, setIsAtEnd] = useState<boolean>(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState<boolean>(false);
  const [showMobileControls, setShowMobileControls] = useState<boolean>(true);

  const isAtStartRef = useRef(true);
  useEffect(() => {
    isAtStartRef.current = isAtStart;
  }, [isAtStart]);

  const isAtEndRef = useRef(false);
  useEffect(() => {
    isAtEndRef.current = isAtEnd;
  }, [isAtEnd]);

  const lightBgInfo = getLightBgByTemp(colorTemperature);

  const themeStyles: Record<ReaderTheme, { bg: string; text: string; containerBg: string; border: string; headerBg: string }> = {
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
    gray: {
      bg: '#333742',
      text: '#E2E8F0',
      containerBg: '#262A32',
      border: '#475060',
      headerBg: '#333742',
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

  const getThemeCss = (selectedTheme: ReaderTheme, temp: number) => {
    const lightDynamic = getLightBgByTemp(temp);
    const current = selectedTheme === 'light' ? { ...themeStyles.light, ...lightDynamic } : themeStyles[selectedTheme];
    return `
      html, body {
        background-color: ${current.bg} !important;
        background: ${current.bg} !important;
        color: ${current.text} !important;
        -webkit-text-fill-color: ${current.text} !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      p, div, span, h1, h2, h3, h4, h5, h6, li {
        color: ${current.text} !important;
        -webkit-text-fill-color: ${current.text} !important;
        max-width: 100% !important;
        word-break: break-word !important;
      }
      img, svg {
        background-color: transparent !important;
        max-width: 95% !important;
        max-height: 45vh !important;
        height: auto !important;
        object-fit: contain !important;
        display: block !important;
        margin: 6px auto !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      video, audio {
        background-color: transparent !important;
        max-width: 100% !important;
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

  const applyDirectThemeStyleToDoc = useCallback((doc: Document | null | undefined, selectedTheme: ReaderTheme, temp: number) => {
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
  const applyThemeToRendition = useCallback((rendition: Rendition, _selectedTheme: ReaderTheme, size: number) => {
    try {
      rendition.themes.fontSize(`${size}px`);
    } catch (e) {
      console.warn('Error applying theme:', e);
    }
  }, []);

  const fontSizeRef = useRef(fontSize);
  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

  const isNavigatingRef = useRef(false);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);

  const handleNextPage = useCallback(() => {
    if (isNavigatingRef.current) return;
    if (renditionRef.current) {
      isNavigatingRef.current = true;
      renditionRef.current.next()
        .catch(() => {})
        .finally(() => {
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 80);
        });
    }
  }, []);

  const handlePrevPage = useCallback(() => {
    if (isNavigatingRef.current) return;
    if (renditionRef.current) {
      isNavigatingRef.current = true;
      renditionRef.current.prev()
        .catch(() => {})
        .finally(() => {
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 80);
        });
    }
  }, []);

  const lastTapTimeRef = useRef<number>(0);

  const handleReaderTap = useCallback((clientX: number, targetWidth: number) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) return; // Desktop unaffected
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) return; // Ignore duplicate synthetic events
    lastTapTimeRef.current = now;

    const width = targetWidth > 0 ? targetWidth : (typeof window !== 'undefined' ? window.innerWidth : 360);
    const leftZone = width * 0.22;
    const rightZone = width * 0.78;

    if (clientX < leftZone) {
      handlePrevPage();
    } else if (clientX > rightZone) {
      handleNextPage();
    } else {
      setShowMobileControls((prev) => !prev);
      setIsMobileSettingsOpen(false);
    }
  }, [handlePrevPage, handleNextPage]);

  const handleReaderTapRef = useRef(handleReaderTap);
  useEffect(() => {
    handleReaderTapRef.current = handleReaderTap;
  }, [handleReaderTap]);

  const executeSeek = useCallback(async (targetVal: number, isPageNumber = false) => {
    if (!bookRef.current || !renditionRef.current) {
      setSliderDragPercent(null);
      isDraggingSliderRef.current = false;
      return;
    }
    const book = bookRef.current;
    const rendition = renditionRef.current;
    const totalLocs = (book.locations as any)?.total || (book.locations ? book.locations.length() : 0);
    const hasTrueLocations = Boolean(
      totalLocs > 1 &&
      ((book.locations as any)?._locations?.length > 1 || (book.locations as any)?.total > 1 || book.locations?.length() > 1)
    );

    try {
      let targetPage = 1;
      let targetPct = 0;

      if (isPageNumber && hasTrueLocations) {
        targetPage = Math.max(1, Math.min(totalLocs, Math.round(targetVal)));
        targetPct = Math.max(0, Math.min(100, Math.round(((targetPage - 1) / (totalLocs - 1)) * 100)));
      } else if (hasTrueLocations) {
        targetPct = Math.max(0, Math.min(100, targetVal));
        targetPage = Math.max(1, Math.min(totalLocs, Math.round((targetPct / 100) * (totalLocs - 1)) + 1));
      } else {
        targetPct = Math.max(0, Math.min(100, targetVal));
      }

      setProgressPercent(targetPct);

      if (targetPct <= 0 || (hasTrueLocations && targetPage <= 1)) {
        const firstSpine = (book.spine as any)?.get?.(0);
        if (firstSpine && (firstSpine.cfiBase || firstSpine.href)) {
          await rendition.display(firstSpine.cfiBase || firstSpine.href);
        } else {
          await rendition.display(0);
        }
      } else if (targetPct >= 100 || (hasTrueLocations && targetPage >= totalLocs)) {
        if (hasTrueLocations && typeof (book.locations as any).cfiFromLocation === 'function') {
          const lastCfi = (book.locations as any).cfiFromLocation(totalLocs - 1);
          if (lastCfi) {
            await rendition.display(lastCfi);
            return;
          }
        }
        const spineLen = (book.spine as any)?.length || 0;
        if (spineLen > 0) {
          const lastSpine = (book.spine as any).get(spineLen - 1);
          if (lastSpine && (lastSpine.cfiBase || lastSpine.href)) {
            await rendition.display(lastSpine.cfiBase || lastSpine.href);
          }
        }
      } else if (hasTrueLocations && typeof (book.locations as any).cfiFromLocation === 'function') {
        const pageIdx = targetPage - 1;
        const cfi = (book.locations as any).cfiFromLocation(pageIdx);
        if (cfi) {
          await rendition.display(cfi);
        } else {
          const fallbackCfi = book.locations.cfiFromPercentage(targetPct / 100);
          if (fallbackCfi) await rendition.display(fallbackCfi);
        }
      } else if (book.locations && book.locations.length() > 0) {
        const cfi = book.locations.cfiFromPercentage(targetPct / 100);
        if (cfi) {
          await rendition.display(cfi);
        } else if (book.spine && (book.spine as any).length > 0) {
          const spineLen = (book.spine as any).length;
          const targetSpineIdx = Math.min(spineLen - 1, Math.max(0, Math.floor((targetPct / 100) * spineLen)));
          const spineItem = (book.spine as any).get(targetSpineIdx);
          if (spineItem && (spineItem.cfiBase || spineItem.href)) {
            await rendition.display(spineItem.cfiBase || spineItem.href);
          }
        }
      } else if (book.spine && (book.spine as any).length > 0) {
        const spineLen = (book.spine as any).length;
        const targetSpineIdx = Math.min(spineLen - 1, Math.max(0, Math.floor((targetPct / 100) * spineLen)));
        const spineItem = (book.spine as any).get(targetSpineIdx);
        if (spineItem && (spineItem.cfiBase || spineItem.href)) {
          await rendition.display(spineItem.cfiBase || spineItem.href);
        }
      }
    } catch (e) {
      console.warn('Seek error:', e);
    } finally {
      setTimeout(() => {
        setSliderDragPercent(null);
        isDraggingSliderRef.current = false;
      }, 50);
    }
  }, []);

  const handleFontSizeChange = useCallback((delta: number) => {
    if (!renditionRef.current) return;

    // Read current size from ref (avoids stale closure)
    const newSize = Math.max(12, Math.min(32, fontSizeRef.current + delta));
    if (newSize === fontSizeRef.current) return; // nothing changed

    // Save current position BEFORE any change
    let anchorCfi: string | null = null;
    try {
      const loc = (renditionRef.current as any)?.currentLocation?.();
      anchorCfi = loc?.start?.cfi ?? null;
    } catch {}

    // Apply font size outside the state updater (no side effects in pure updater)
    setFontSize(newSize);
    try { localStorage.setItem('tanda_reader_fontSize', String(newSize)); } catch {}
    renditionRef.current.themes.fontSize(`${newSize}px`);

    // Re-anchor after epub.js reflow settles (~300ms is reliable across books)
    if (anchorCfi) {
      const cfi = anchorCfi;
      setTimeout(() => {
        renditionRef.current?.display(cfi).catch(() => {});
      }, 300);
    }
  }, []);

  const handleThemeChange = useCallback((newTheme: ReaderTheme) => {
    setInternalTheme(newTheme);
    onThemeChange?.(newTheme);
    themeRef.current = newTheme;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanda_reader_theme', newTheme);
      } catch {}
    }
    if (renditionRef.current) {
      applyThemeToRendition(renditionRef.current, newTheme, fontSizeRef.current);
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
  }, [applyDirectThemeStyleToDoc, applyThemeToRendition, onThemeChange]);

  const handleColorTempChange = useCallback((temp: number) => {
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
  }, [applyDirectThemeStyleToDoc, onColorTemperatureChange]);

  const handleSpreadChange = useCallback((mode: 'single' | 'double') => {
    setSpreadMode(mode);
    spreadModeRef.current = mode;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanda_reader_spread', mode);
      } catch {}
    }
    if (renditionRef.current) {
      let anchorCfi: string | null = null;
      try {
        const loc = (renditionRef.current as any)?.currentLocation?.();
        anchorCfi = loc?.start?.cfi ?? null;
      } catch {}

      const spreadVal = mode === 'double' ? 'always' : 'none';
      try {
        (renditionRef.current as any).spread(spreadVal);
      } catch (e) {
        console.warn('Failed to switch rendition spread mode:', e);
      }

      if (anchorCfi) {
        const cfi = anchorCfi;
        setTimeout(() => {
          renditionRef.current?.display(cfi).catch(() => {});
        }, 150);
      }
    }
  }, []);

  const lastKeyTimeRef = useRef<number>(0);

  const processKeyAction = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;

    const target = e.target as HTMLInputElement | null;
    if (target) {
      if (target.tagName === 'TEXTAREA' || (target as any).isContentEditable) {
        return;
      }
      if (target.tagName === 'INPUT' && target.type !== 'range') {
        return;
      }
      if (target.tagName === 'INPUT' && target.type === 'range') {
        target.blur();
      }
    }

    // Always prevent native browser / iframe scrolling
    e.preventDefault();
    e.stopPropagation();

    // Ignore key repeat events (holding down a key)
    if (e.repeat) return;

    // Debounce rapid keyboard presses
    const now = Date.now();
    if (now - lastKeyTimeRef.current < 250) {
      return;
    }
    lastKeyTimeRef.current = now;

    const isRight = e.key === 'ArrowRight';
    const isShift = e.shiftKey;
    const isCtrl = e.ctrlKey || e.metaKey;
    const isAlt = e.altKey;

    // 1. Shift + Arrow: Color temperature / white balance (warm / cool)
    if (isShift && !isCtrl && !isAlt) {
      const currentTemp = colorTempRef.current;
      const nextTemp = isRight ? Math.min(50, currentTemp + 10) : Math.max(-50, currentTemp - 10);
      handleColorTempChange(nextTemp);
      return;
    }

    // 2. Control / Command + Arrow: Switch theme (light -> sepia -> gray -> dark)
    if (isCtrl && !isShift && !isAlt) {
      const themes: ReaderTheme[] = ['light', 'sepia', 'gray', 'dark'];
      const curIdx = themes.indexOf(themeRef.current);
      const nextIdx = isRight
        ? (curIdx + 1) % themes.length
        : (curIdx - 1 + themes.length) % themes.length;
      handleThemeChange(themes[nextIdx]);
      return;
    }

    // 3. Option / Alt + Arrow: Font size (increase / decrease)
    if (isAlt && !isCtrl && !isShift) {
      handleFontSizeChange(isRight ? 2 : -2);
      return;
    }

    // 4. Plain Arrow: Page navigation
    if (!isShift && !isCtrl && !isAlt) {
      if (isRight) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
  }, [handleColorTempChange, handleThemeChange, handleFontSizeChange, handleNextPage, handlePrevPage]);

  const processKeyActionRef = useRef(processKeyAction);
  useEffect(() => {
    processKeyActionRef.current = processKeyAction;
  }, [processKeyAction]);

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
      const resolvedUrl = resolveMediaUrl(url);
      const response = await fetch(resolvedUrl);
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

      // Try loading cached locations immediately for instant 0ms page rendering
      const locCacheKey = `tanda_epub_locs_${url}`;
      let cachedLoaded = false;
      try {
        const cached = localStorage.getItem(locCacheKey);
        if (cached) {
          book.locations.load(cached);
          const totalLocs = (book.locations as any).total || book.locations.length();
          if (typeof totalLocs === 'number' && totalLocs > 1) {
            setTotalBookPages(totalLocs);
            cachedLoaded = true;
          }
        }
      } catch (e) {
        console.warn('Failed to load cached locations:', e);
      }

      const updateProgressFromLocation = (location: any) => {
        if (!location || !location.start || !book) return;
        const start = location.start;
        const cfi = start.cfi;

        let pct = 0;
        let totalLocs = 0;
        let curPage = 1;

        // True locations exist if length > 1 or loaded from cache
        const hasTrueLocations = Boolean(
          book.locations &&
          ((book.locations as any)._locations?.length > 1 || (book.locations as any).total > 1 || book.locations.length() > 1)
        );

        if (hasTrueLocations) {
          totalLocs = (book.locations as any).total || book.locations.length();
          if (totalLocs > 1) {
            setTotalBookPages(totalLocs);
          }
        }

        // 1. Calculate true book-wide percentage and page number
        if (hasTrueLocations && cfi) {
          try {
            const rawPct = book.locations.percentageFromCfi(cfi);
            if (typeof rawPct === 'number' && !isNaN(rawPct)) {
              pct = Math.max(0, Math.min(100, Math.round(rawPct * 100)));
            }
            const locIdx = book.locations.locationFromCfi(cfi) as any;
            if (typeof locIdx === 'number' && locIdx >= 0 && totalLocs > 0) {
              curPage = Math.max(1, Math.min(totalLocs, locIdx + 1));
            } else if (totalLocs > 0) {
              curPage = Math.max(1, Math.min(totalLocs, Math.round((pct / 100) * totalLocs) || 1));
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
        }

        // Accurate boundary detection (never use rounded integer pct === 0)
        let atStart = false;
        if (location.atStart) {
          atStart = true;
        } else if (start.index === 0) {
          if (totalLocs > 0 && curPage <= 1) {
            atStart = true;
          } else if (hasTrueLocations && cfi) {
            const locIdx = book.locations.locationFromCfi(cfi) as any;
            atStart = typeof locIdx === 'number' && locIdx <= 0;
          } else {
            atStart = true;
          }
        }

        let atEnd = false;
        const spineLen = (book.spine as any)?.length || 0;
        if (location.atEnd) {
          atEnd = true;
        } else if (spineLen > 0 && typeof start.index === 'number' && start.index >= spineLen - 1) {
          if (totalLocs > 0 && curPage >= totalLocs) {
            atEnd = true;
          } else if (hasTrueLocations && cfi) {
            const locIdx = book.locations.locationFromCfi(cfi) as any;
            atEnd = typeof locIdx === 'number' && locIdx >= totalLocs - 1;
          }
        }

        setIsAtStart(atStart);
        setIsAtEnd(atEnd);

        setProgressPercent(pct);

        // Compute page text info
        let pageText = '';
        if (totalLocs > 1 && hasTrueLocations) {
          pageText = `${curPage} / ${totalLocs} бет`;
        } else if (book.spine && (book.spine as any).length > 1) {
          const curSpine = (start.index ?? 0) + 1;
          const totSpine = (book.spine as any).length;
          pageText = `${curSpine} / ${totSpine} бөлім`;
        }

        setCurrentLocationText(pageText || (pct > 0 ? `${pct}%` : ''));
        onProgressChangeRef.current?.(pct, cfi);
      };

      // Generate locations for accurate progress calculation (2400 chars per standard book page)
      book.ready.then(async () => {
        try {
          if (!cachedLoaded || !book.locations || book.locations.length() <= 1) {
            await book.locations.generate(2400);
            const totalLocs = (book.locations as any).total || book.locations.length();
            if (typeof totalLocs === 'number' && totalLocs > 1) {
              setTotalBookPages(totalLocs);
              try {
                const saved = book.locations.save();
                if (saved) {
                  localStorage.setItem(locCacheKey, saved);
                }
              } catch (e) {}
            }
          }
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

      const isLargeScreen = typeof window !== 'undefined' && window.innerWidth >= 1024;
      const initialSpread = isLargeScreen && spreadModeRef.current === 'double' ? 'always' : 'none';

      const rendition = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: initialSpread,
      });
      renditionRef.current = rendition;

      applyThemeToRendition(rendition, themeRef.current, fontSizeRef.current);

      // Clean up any browser parsererror elements from DOM and inject CSS overrides + touch/tap gestures
      rendition.hooks.content.register((contents: any) => {
        try {
          const doc = contents.document || contents.window?.document;
          if (doc) {
            const parserErrors = doc.querySelectorAll('parsererror');
            parserErrors.forEach((el: Element) => el.remove());
            applyDirectThemeStyleToDoc(doc, themeRef.current, colorTempRef.current);

            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartTime = 0;

            doc.addEventListener('touchstart', (e: TouchEvent) => {
              if (e.touches && e.touches.length === 1) {
                touchStartX = e.touches[0].screenX || e.touches[0].clientX;
                touchStartY = e.touches[0].screenY || e.touches[0].clientY;
                touchStartTime = Date.now();
              }
            }, { passive: true });

            doc.addEventListener('touchend', (e: TouchEvent) => {
              if (e.changedTouches && e.changedTouches.length === 1) {
                const endX = e.changedTouches[0].screenX || e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].screenY || e.changedTouches[0].clientY;
                const deltaX = endX - touchStartX;
                const deltaY = endY - touchStartY;
                const elapsed = Date.now() - touchStartTime;

                // Swipe gesture: horizontal movement >= 25px, more horizontal than vertical, under 800ms
                if (Math.abs(deltaX) >= 25 && Math.abs(deltaX) > Math.abs(deltaY) * 0.6 && elapsed < 800) {
                  if (deltaX < 0) {
                    handleNextPage();
                  } else {
                    handlePrevPage();
                  }
                  return;
                }

                // Tap gesture: minimal movement < 15px
                if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15 && elapsed < 450) {
                  const clientX = e.changedTouches[0].clientX;
                  const targetWidth = contents.window?.innerWidth || window.innerWidth;
                  handleReaderTapRef.current(clientX, targetWidth);
                }
              }
            }, { passive: true });

            doc.addEventListener('click', (e: MouseEvent) => {
              const selection = doc.getSelection()?.toString();
              if (!selection) {
                const clientX = e.clientX;
                const targetWidth = contents.window?.innerWidth || window.innerWidth;
                handleReaderTapRef.current(clientX, targetWidth);
              }
            });
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

      // Centralized keyboard listener for rendition iframe
      rendition.on('keydown', (e: KeyboardEvent) => {
        processKeyActionRef.current(e);
      });

      await rendition.display(initialLocation || undefined);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to load EPUB:', err);
      setLoadError(err.message || 'Электронды кітапты ашу кезінде қате орын алды');
      setIsLoading(false);
    }
  }, [url, initialLocation, applyDirectThemeStyleToDoc, applyThemeToRendition]);

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
      processKeyActionRef.current(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      style={{
        backgroundColor: activeTheme.containerBg,
        borderColor: activeTheme.border,
      }}
      className="w-full flex-1 flex flex-col h-full sm:h-[calc(100vh-120px)] sm:min-h-[480px] rounded-none sm:rounded-2xl border-0 sm:border-[1.5px] shadow-none sm:shadow-lg overflow-hidden relative transition-colors duration-200"
    >
      {/* Top Controls Bar (Toggleable on mobile as overlay, always visible on desktop) */}
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: activeTheme.headerBg,
          borderBottom: `1px solid ${activeTheme.border}`,
          zIndex: 30,
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
          boxShadow: showMobileControls ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
        }}
        className={`w-full ${showMobileControls ? 'flex absolute top-0 left-0 right-0 sm:relative' : 'hidden sm:flex'} items-center justify-between gap-2.5 flex-nowrap flex-shrink-0`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                color: activeTheme.text,
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '6px',
                flexShrink: 0,
              }}
              title="Артқа қайту"
              aria-label="Артқа қайту"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: activeTheme.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bookTitle || 'Электронды кітап'}
            </div>
            {bookAuthor && (
              <div style={{ fontSize: '10px', opacity: 0.7, color: activeTheme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bookAuthor}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Controls (hidden on mobile, visible on sm+) */}
        <div className="hidden sm:flex items-center gap-2.5 flex-wrap flex-shrink-0">
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
              onClick={() => handleThemeChange('gray')}
              title="Сұр режим"
              style={{
                padding: '4px 8px',
                border: 'none',
                borderRadius: '4px',
                background: theme === 'gray' ? '#333742' : 'transparent',
                color: theme === 'gray' ? '#E2E8F0' : activeTheme.text,
                fontWeight: theme === 'gray' ? 700 : 600,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: theme === 'gray' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                opacity: theme === 'gray' ? 1 : 0.85,
              }}
            >
              Сұр
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

          {/* 4. Spread Mode Switcher (2 беттік / 1 беттік) */}
          <div className="hidden lg:flex" style={{ alignItems: 'center', gap: '4px', background: activeTheme.containerBg, padding: '3px', borderRadius: '8px', border: `1px solid ${activeTheme.border}` }}>
            <button
              onClick={() => handleSpreadChange('double')}
              title="2 беттік кітап көрінісі (екі жақты)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                border: 'none',
                borderRadius: '4px',
                background: spreadMode === 'double' ? (theme === 'dark' ? '#334155' : theme === 'gray' ? '#475060' : theme === 'sepia' ? '#FBF0D9' : '#FFFFFF') : 'transparent',
                color: spreadMode === 'double' ? (theme === 'dark' || theme === 'gray' ? '#F1F5F9' : theme === 'sepia' ? '#433422' : '#0F172A') : activeTheme.text,
                fontWeight: spreadMode === 'double' ? 700 : 600,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: spreadMode === 'double' ? (theme === 'dark' || theme === 'gray' ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)') : 'none',
                opacity: spreadMode === 'double' ? 1 : 0.85,
              }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>2 бет</span>
            </button>
            <button
              onClick={() => handleSpreadChange('single')}
              title="1 беттік тұтас көрініс"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                border: 'none',
                borderRadius: '4px',
                background: spreadMode === 'single' ? (theme === 'dark' ? '#334155' : theme === 'gray' ? '#475060' : theme === 'sepia' ? '#FBF0D9' : '#FFFFFF') : 'transparent',
                color: spreadMode === 'single' ? (theme === 'dark' || theme === 'gray' ? '#F1F5F9' : theme === 'sepia' ? '#433422' : '#0F172A') : activeTheme.text,
                fontWeight: spreadMode === 'single' ? 700 : 600,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: spreadMode === 'single' ? (theme === 'dark' || theme === 'gray' ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)') : 'none',
                opacity: spreadMode === 'single' ? 1 : 0.85,
              }}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1 бет</span>
            </button>
          </div>
        </div>

        {/* Mobile Aa button (visible only on mobile sm:hidden) */}
        <div className="flex sm:hidden items-center flex-shrink-0">
          <button
            onClick={() => setIsMobileSettingsOpen((prev) => !prev)}
            aria-label="Оқу параметрлері"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: isMobileSettingsOpen ? activeTheme.border : activeTheme.containerBg,
              border: `1.5px solid ${activeTheme.border}`,
              color: activeTheme.text,
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: 900, letterSpacing: '-0.5px' }}>Aa</span>
            <span style={{ fontSize: '11px', opacity: 0.85 }}>{fontSize}px</span>
          </button>
        </div>
      </div>

      {/* Mobile Settings Bottom Sheet / Modal Drawer */}
      {isMobileSettingsOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
          onClick={() => setIsMobileSettingsOpen(false)}
        >
          <div
            style={{
              backgroundColor: activeTheme.headerBg,
              borderTop: `1.5px solid ${activeTheme.border}`,
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '18px 18px 24px',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={17} color={activeTheme.text} />
                <span style={{ fontSize: '14px', fontWeight: 800, color: activeTheme.text }}>
                  Оқу параметрлері
                </span>
              </div>
              <button
                onClick={() => setIsMobileSettingsOpen(false)}
                style={{
                  background: activeTheme.containerBg,
                  border: `1px solid ${activeTheme.border}`,
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: activeTheme.text,
                  cursor: 'pointer',
                }}
                aria-label="Жабу"
              >
                <X size={16} />
              </button>
            </div>

            {/* 1. Font Size Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: activeTheme.text, opacity: 0.8 }}>
                Қаріп өлшемі
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: activeTheme.containerBg,
                  borderRadius: '12px',
                  border: `1px solid ${activeTheme.border}`,
                  padding: '6px 8px',
                }}
              >
                <button
                  onClick={() => handleFontSizeChange(-2)}
                  disabled={fontSize <= 12}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${activeTheme.border}`,
                    background: activeTheme.headerBg,
                    color: activeTheme.text,
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: fontSize <= 12 ? 0.4 : 1,
                  }}
                >
                  A - Кішірейту
                </button>
                <span style={{ fontSize: '15px', fontWeight: 800, color: activeTheme.text }}>
                  {fontSize} px
                </span>
                <button
                  onClick={() => handleFontSizeChange(2)}
                  disabled={fontSize >= 32}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${activeTheme.border}`,
                    background: activeTheme.headerBg,
                    color: activeTheme.text,
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: fontSize >= 32 ? 0.4 : 1,
                  }}
                >
                  A + Үлкейту
                </button>
              </div>
            </div>

            {/* 2. Theme Selection Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: activeTheme.text, opacity: 0.8 }}>
                Оқу режимі
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                }}
              >
                <button
                  onClick={() => handleThemeChange('light')}
                  style={{
                    padding: '10px 2px',
                    borderRadius: '10px',
                    border: theme === 'light' ? '2px solid #2563EB' : `1.5px solid ${activeTheme.border}`,
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: theme === 'light' ? '0 0 0 2px rgba(37,99,235,0.25)' : 'none',
                  }}
                >
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#F8FAFC', border: '1.5px solid #CBD5E1' }} />
                  Ашық
                </button>
                <button
                  onClick={() => handleThemeChange('sepia')}
                  style={{
                    padding: '10px 2px',
                    borderRadius: '10px',
                    border: theme === 'sepia' ? '2px solid #D97706' : `1.5px solid ${activeTheme.border}`,
                    background: '#FBF0D9',
                    color: '#433422',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: theme === 'sepia' ? '0 0 0 2px rgba(217,119,6,0.25)' : 'none',
                  }}
                >
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#F4E8CD', border: '1.5px solid #EAD7B5' }} />
                  Сепия
                </button>
                <button
                  onClick={() => handleThemeChange('gray')}
                  style={{
                    padding: '10px 2px',
                    borderRadius: '10px',
                    border: theme === 'gray' ? '2px solid #94A3B8' : `1.5px solid ${activeTheme.border}`,
                    background: '#333742',
                    color: '#E2E8F0',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: theme === 'gray' ? '0 0 0 2px rgba(148,163,184,0.3)' : 'none',
                  }}
                >
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#262A32', border: '1.5px solid #475060' }} />
                  Сұр
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  style={{
                    padding: '10px 2px',
                    borderRadius: '10px',
                    border: theme === 'dark' ? '2px solid #38BDF8' : `1.5px solid ${activeTheme.border}`,
                    background: '#0F172A',
                    color: '#F1F5F9',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: theme === 'dark' ? '0 0 0 2px rgba(56,189,248,0.25)' : 'none',
                  }}
                >
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#020617', border: '1.5px solid #334155' }} />
                  Түнгі
                </button>
              </div>
            </div>

            {/* 3. Color Temperature (Only for light theme) */}
            {theme === 'light' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: activeTheme.text, opacity: 0.8 }}>
                  <span>❄️ Салқын ақ</span>
                  <span>Жарық реңкі</span>
                  <span>☀️ Жылы ақ</span>
                </div>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    background: activeTheme.containerBg,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: `1px solid ${activeTheme.border}`,
                  }}
                >
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={colorTemperature}
                    onChange={(e) => handleColorTempChange(parseInt(e.target.value, 10))}
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      background: '#CBD5E1',
                      accentColor: '#0F172A',
                      appearance: 'auto',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '2px',
                      height: '12px',
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
          </div>
        </div>
      )}

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
          className="absolute inset-0 left-2 right-2 top-2 bottom-6 sm:top-0 sm:bottom-0 sm:left-11 sm:right-11"
          style={{
            backgroundColor: activeTheme.bg,
            padding: 0,
            margin: 0,
            boxSizing: 'border-box',
          }}
        />

        {/* Mobile Dedicated Touch & Swipe Gesture Layer (iOS Safari & Android optimized) */}
        {!isLoading && !loadError && (
          <div
            className="block sm:hidden absolute inset-0 z-20 select-none cursor-pointer"
            style={{
              touchAction: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              backgroundColor: 'transparent',
            }}
            onTouchStart={(e) => {
              if (e.touches && e.touches.length === 1) {
                touchStartXRef.current = e.touches[0].clientX;
                touchStartYRef.current = e.touches[0].clientY;
                touchStartTimeRef.current = Date.now();
              }
            }}
            onTouchEnd={(e) => {
              if (e.changedTouches && e.changedTouches.length === 1) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const deltaX = endX - touchStartXRef.current;
                const deltaY = endY - touchStartYRef.current;
                const elapsed = Date.now() - touchStartTimeRef.current;

                // 1. Horizontal Swipe Gesture (Left = Next, Right = Prev)
                if (Math.abs(deltaX) >= 28 && Math.abs(deltaX) > Math.abs(deltaY) * 0.6 && elapsed < 800) {
                  if (deltaX < 0) {
                    handleNextPage();
                  } else {
                    handlePrevPage();
                  }
                  return;
                }

                // 2. Single Tap Gesture (Minimal movement)
                if (Math.abs(deltaX) < 18 && Math.abs(deltaY) < 18 && elapsed < 450) {
                  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
                  const leftZone = screenWidth * 0.22;
                  const rightZone = screenWidth * 0.78;

                  if (endX < leftZone) {
                    handlePrevPage();
                  } else if (endX > rightZone) {
                    handleNextPage();
                  } else {
                    // Center tap: Toggle top and bottom controls
                    setShowMobileControls((prev) => !prev);
                    setIsMobileSettingsOpen(false);
                  }
                }
              }
            }}
          />
        )}

        {/* Left / Right Page Flip Overlay Controls (hidden on mobile, visible on desktop) */}
        {!isLoading && !loadError && (
          <>
            <button
              onClick={handlePrevPage}
              disabled={isAtStart}
              title={isAtStart ? 'Кітаптың басы' : 'Алдыңғы бет (←)'}
              aria-label="Алдыңғы бет"
              className="hidden sm:flex"
              style={{
                position: 'absolute',
                top: '50%',
                left: '8px',
                transform: 'translateY(-50%)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: activeTheme.headerBg,
                border: `1.5px solid ${activeTheme.border}`,
                color: activeTheme.text,
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isAtStart ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                zIndex: 15,
                transition: 'all 0.2s',
                opacity: isAtStart ? 0.3 : 0.85,
                pointerEvents: isAtStart ? 'none' : 'auto',
              }}
              onMouseEnter={(e) => {
                if (!isAtStart) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAtStart) {
                  e.currentTarget.style.opacity = '0.85';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                }
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={handleNextPage}
              disabled={isAtEnd}
              title={isAtEnd ? 'Кітаптың соңы' : 'Келесі бет (→)'}
              aria-label="Келесі бет"
              className="hidden sm:flex"
              style={{
                position: 'absolute',
                top: '50%',
                right: '8px',
                transform: 'translateY(-50%)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: activeTheme.headerBg,
                border: `1.5px solid ${activeTheme.border}`,
                color: activeTheme.text,
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isAtEnd ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                zIndex: 15,
                transition: 'all 0.2s',
                opacity: isAtEnd ? 0.3 : 0.85,
                pointerEvents: isAtEnd ? 'none' : 'auto',
              }}
              onMouseEnter={(e) => {
                if (!isAtEnd) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAtEnd) {
                  e.currentTarget.style.opacity = '0.85';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                }
              }}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Embedded Slider CSS for custom thumb and track */}
      <style>{`
        .epub-progress-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .epub-progress-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: var(--blue, #2563EB);
          cursor: grab;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          transition: transform 0.15s ease;
        }
        .epub-progress-slider::-webkit-slider-thumb:hover,
        .epub-progress-slider:active::-webkit-slider-thumb {
          transform: scale(1.25);
          cursor: grabbing;
        }
        .epub-progress-slider::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: var(--blue, #2563EB);
          cursor: grab;
          border: none;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          transition: transform 0.15s ease;
        }
        .epub-progress-slider::-moz-range-thumb:hover,
        .epub-progress-slider:active::-moz-range-thumb {
          transform: scale(1.25);
          cursor: grabbing;
        }
      `}</style>

      {/* Bottom Progress Bar & Seek Slider (Toggleable on mobile as overlay, always visible on desktop) */}
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: activeTheme.headerBg,
          borderTop: `1px solid ${activeTheme.border}`,
          fontSize: '12px',
          color: activeTheme.text,
          opacity: 0.95,
          fontWeight: 600,
          gap: '12px',
          zIndex: 30,
          boxShadow: showMobileControls ? '0 -4px 12px rgba(0,0,0,0.12)' : 'none',
        }}
        className={`w-full ${showMobileControls ? 'flex absolute bottom-0 left-0 right-0 sm:relative' : 'hidden sm:flex'} items-center justify-between flex-shrink-0`}
      >
        <div style={{ flex: '1 1 0', minWidth: 0, textAlign: 'left', userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {(() => {
            if (sliderDragPercent !== null) {
              if (totalBookPages > 1) {
                return `${sliderDragPercent} / ${totalBookPages} бет`;
              }
              const spineLen = (bookRef.current?.spine as any)?.length || 0;
              if (spineLen > 1) {
                const curSpine = Math.max(1, Math.min(spineLen, Math.round((sliderDragPercent / 100) * spineLen) || 1));
                return `${curSpine} / ${spineLen} бөлім`;
              }
              return 'Оқу барысы';
            }
            return currentLocationText || (totalBookPages > 1 ? `${Math.max(1, Math.min(totalBookPages, Math.round((progressPercent / 100) * (totalBookPages - 1)) + 1))} / ${totalBookPages} бет` : (progressPercent > 0 ? `${progressPercent}%` : 'Оқу барысы'));
          })()}
        </div>

        {/* Interactive Seek Slider */}
        <div
          style={{
            flex: '0 0 280px',
            maxWidth: '45vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {(() => {
            const isMultiPage = totalBookPages > 1;
            const currentSliderVal = isMultiPage
              ? (sliderDragPercent !== null ? sliderDragPercent : Math.max(1, Math.min(totalBookPages, Math.round((progressPercent / 100) * (totalBookPages - 1)) + 1)))
              : (sliderDragPercent !== null ? sliderDragPercent : progressPercent);
            const sliderFillPct = isMultiPage
              ? Math.max(0, Math.min(100, Math.round(((currentSliderVal - 1) / (totalBookPages - 1)) * 100)))
              : (sliderDragPercent !== null ? sliderDragPercent : progressPercent);

            const getTargetFromEvent = (clientX: number, rect: DOMRect): number => {
              if (rect.width <= 0) return currentSliderVal;
              const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
              if (isMultiPage) {
                return Math.max(1, Math.min(totalBookPages, Math.round(ratio * (totalBookPages - 1)) + 1));
              }
              return Math.max(0, Math.min(100, Math.round(ratio * 100)));
            };

            return (
              <input
                type="range"
                className="epub-progress-slider"
                tabIndex={-1}
                min={isMultiPage ? '1' : '0'}
                max={isMultiPage ? String(totalBookPages) : '100'}
                step="1"
                value={currentSliderVal}
                onPointerDown={(e) => {
                  isDraggingSliderRef.current = true;
                  const val = getTargetFromEvent(e.clientX, e.currentTarget.getBoundingClientRect());
                  setSliderDragPercent(val);
                }}
                onPointerMove={(e) => {
                  if (isDraggingSliderRef.current) {
                    const val = getTargetFromEvent(e.clientX, e.currentTarget.getBoundingClientRect());
                    setSliderDragPercent(val);
                  }
                }}
                onTouchStart={(e) => {
                  isDraggingSliderRef.current = true;
                  if (e.touches.length > 0) {
                    const val = getTargetFromEvent(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
                    setSliderDragPercent(val);
                  }
                }}
                onTouchMove={(e) => {
                  if (isDraggingSliderRef.current && e.touches.length > 0) {
                    const val = getTargetFromEvent(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
                    setSliderDragPercent(val);
                  }
                }}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setSliderDragPercent(val);
                  }
                }}
                onPointerUp={(e) => {
                  const target = e.currentTarget;
                  target.blur();
                  const val = getTargetFromEvent(e.clientX, target.getBoundingClientRect());
                  executeSeek(val, isMultiPage);
                }}
                onTouchEnd={(e) => {
                  const target = e.currentTarget;
                  target.blur();
                  let val = sliderDragPercent ?? parseInt(target.value, 10);
                  if (e.changedTouches.length > 0) {
                    val = getTargetFromEvent(e.changedTouches[0].clientX, target.getBoundingClientRect());
                  }
                  executeSeek(val, isMultiPage);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.target as HTMLElement).blur();
                    processKeyActionRef.current(e.nativeEvent);
                  }
                }}
                title={totalBookPages > 1
                  ? `${currentSliderVal} / ${totalBookPages} бет`
                  : 'Оқу барысы'}
                aria-label="Оқу барысын жылжыту"
                style={{
                  background: `linear-gradient(to right, var(--blue, #2563EB) 0%, var(--blue, #2563EB) ${sliderFillPct}%, ${activeTheme.border} ${sliderFillPct}%, ${activeTheme.border} 100%)`,
                }}
              />
            );
          })()}
        </div>

        <div className="hidden sm:block" style={{ flex: '1 1 0', minWidth: 0, textAlign: 'right', fontSize: '11px', opacity: 0.7, userSelect: 'none', whiteSpace: 'nowrap' }}>
          Парақтау: ⬅ ➡
        </div>
      </div>

      {/* Minimal clean page number at bottom on mobile when controls are hidden */}
      {!showMobileControls && (
        <div
          className="flex sm:hidden absolute bottom-0 left-0 right-0 items-center justify-center w-full py-1.5 pointer-events-none"
          style={{
            backgroundColor: 'transparent',
            color: activeTheme.text,
            fontSize: '11px',
            opacity: 0.55,
            fontWeight: 700,
            userSelect: 'none',
            zIndex: 10,
          }}
        >
          {totalBookPages > 1
            ? `${Math.max(1, Math.min(totalBookPages, Math.round((progressPercent / 100) * totalBookPages) || 1))} / ${totalBookPages}`
            : (currentLocationText || (progressPercent > 0 ? `${progressPercent}%` : ''))}
        </div>
      )}
    </div>
  );
};
