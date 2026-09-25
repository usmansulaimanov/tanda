import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { api } from '../../lib/api';
import { progressApi } from '../../shared/api/progress.api';
import { Book } from '../../types';
import { EpubReader, getLightBgByTemp } from './EpubReader';
import { resolveMediaUrl, isTelegramLink } from '../../utils/mediaUtils';


export const ReaderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books, fetchBookById } = useBookStore();
  const { role, isAuthenticated, openAuthModal } = useAuthStore();
  const { markAsReading, updateReadingProgress } = useMyBooksStore();

  const [book, setBook] = useState<Book | null>(books.find((b) => b.id === id) || null);
  const [isBookLoading, setIsBookLoading] = useState<boolean>(!books.find((b) => b.id === id));
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(17);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_reader_theme');
      if (saved === 'sepia' || saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });
  const [colorTemperature, setColorTemperature] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tanda_reader_temp');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= -50 && parsed <= 50) return parsed;
      }
    }
    return 0;
  });
  // ─── Reading position persistence ───────────────────────────────────
  const [savedCfi, setSavedCfi] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined' && id) {
      return localStorage.getItem(`tanda_progress_cfi_${id}`) || undefined;
    }
    return undefined;
  });
  // Gate: don't render EpubReader until we know the saved position (avoids reload when CFI arrives)
  const [progressLoaded, setProgressLoaded] = useState<boolean>(false);
  // Debounce timer for backend save (800ms after last navigation)
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last known CFI — updated on every relocated event, used when saving on settings change
  const lastCfiRef = useRef<string | undefined>(undefined);
  // ─────────────────────────────────────────────────────────────────────

  const pdfContainerRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [detectedFormat, setDetectedFormat] = useState<'EPUB' | 'PDF' | null>(() => {
    if (!book?.ebookUrl) return null;
    const lower = book.ebookUrl.toLowerCase();
    if (lower.endsWith('.epub') || lower.includes('.epub?') || lower.includes('.epub#')) return 'EPUB';
    if (lower.endsWith('.pdf') || lower.includes('.pdf?') || lower.includes('.pdf#')) return 'PDF';
    return null;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!pdfContainerRef.current) return;
    if (!document.fullscreenElement) {
      if (pdfContainerRef.current.requestFullscreen) {
        pdfContainerRef.current.requestFullscreen().catch(() => {});
      } else if ((pdfContainerRef.current as any).webkitRequestFullscreen) {
        (pdfContainerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // Helper: read fontSize from localStorage (EpubReader maintains it there)
  const getStoredFontSize = () => {
    try {
      const saved = localStorage.getItem('tanda_reader_fontSize');
      if (saved) { const p = parseInt(saved, 10); if (!isNaN(p) && p >= 12 && p <= 32) return p; }
    } catch {}
    return 18;
  };

  const handleThemeChange = (newTheme: 'light' | 'sepia' | 'dark') => {
    setTheme(newTheme);
    try { localStorage.setItem('tanda_reader_theme', newTheme); } catch {}
    // Immediately save to backend so settings survive cross-device login
    if (isAuthenticated && book && lastCfiRef.current) {
      progressApi.saveProgress(book.id, {
        epubCfi: lastCfiRef.current,
        readerTheme: newTheme,
        colorTemperature,
        fontSize: getStoredFontSize(),
      }).catch(() => {});
    }
  };

  const handleColorTempChange = (temp: number) => {
    setColorTemperature(temp);
    try { localStorage.setItem('tanda_reader_temp', String(temp)); } catch {}
    if (isAuthenticated && book && lastCfiRef.current) {
      progressApi.saveProgress(book.id, {
        epubCfi: lastCfiRef.current,
        readerTheme: theme,
        colorTemperature: temp,
        fontSize: getStoredFontSize(),
      }).catch(() => {});
    }
  };

  // Flush pending save immediately
  const flushPendingSave = React.useCallback(() => {
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }
    if (isAuthenticated && book && lastCfiRef.current) {
      const totPages = book.pages ? parseInt(String(book.pages)) : 100;
      progressApi.saveProgress(book.id, {
        epubCfi: lastCfiRef.current,
        readerTheme: theme,
        colorTemperature,
        fontSize: getStoredFontSize(),
        currentPage,
      }).catch(() => {});
      updateReadingProgress(book.id, currentPage, totPages);
    }
  }, [isAuthenticated, book, theme, colorTemperature, currentPage, updateReadingProgress]);

  // Flush on page unload or route change
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const handleProgressChange = React.useCallback(
    (pct: number, locationCfi: string) => {
      if (!book) return;
      // Track latest CFI for settings-change saves
      lastCfiRef.current = locationCfi;

      // Instant local persistence for zero-delay page refresh survival
      try {
        localStorage.setItem(`tanda_progress_cfi_${book.id}`, locationCfi);
      } catch {}

      const totPages = book.pages ? parseInt(String(book.pages)) : 100;
      const calculatedPage = Math.max(1, Math.round((pct / 100) * totPages));
      setCurrentPage((prev) => (prev !== calculatedPage ? calculatedPage : prev));

      if (isAuthenticated) {
        // Debounce: save to backend after 800ms of inactivity
        if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
        progressSaveTimerRef.current = setTimeout(() => {
          progressApi.saveProgress(book.id, {
            epubCfi: locationCfi,
            readerTheme: theme,
            colorTemperature,
            fontSize: getStoredFontSize(),
            currentPage: calculatedPage,
          }).catch(() => {});
          updateReadingProgress(book.id, calculatedPage, totPages);
        }, 800);
      }
    },
    [book, isAuthenticated, theme, colorTemperature, updateReadingProgress]
  );

  useEffect(() => {
    if (!book && id) {
      setIsBookLoading(true);
      fetchBookById(id)
        .then((b) => {
          setBook(b || null);
          setIsBookLoading(false);
        })
        .catch(() => {
          setIsBookLoading(false);
        });
    } else {
      setIsBookLoading(false);
    }
  }, [book, id, fetchBookById]);

  useEffect(() => {
    if (book && isAuthenticated) {
      const totPages = book.pages ? parseInt(String(book.pages)) : undefined;
      markAsReading(book.id, currentPage, totPages);
    }
  }, [book, isAuthenticated, markAsReading]);

  // Fetch saved reading progress (position + settings) from backend
  useEffect(() => {
    if (!id) {
      setProgressLoaded(true);
      return;
    }
    if (!isAuthenticated) {
      setProgressLoaded(true);
      return;
    }
    progressApi.getProgress(id)
      .then((data) => {
        // Restore epub position
        if (data.epubCfi) {
          setSavedCfi(data.epubCfi);
          lastCfiRef.current = data.epubCfi;
        }
        // Restore theme (overrides localStorage if backend has newer value)
        if (data.readerTheme) {
          setTheme(data.readerTheme);
        }
        // Restore color temperature
        if (data.colorTemperature != null) {
          setColorTemperature(data.colorTemperature);
        }
        // fontSize bridge: set to localStorage so EpubReader reads it on mount
        if (data.fontSize && data.fontSize >= 12 && data.fontSize <= 32) {
          try { localStorage.setItem('tanda_reader_fontSize', String(data.fontSize)); } catch {}
        }
        // Restore page counter for shelf display
        if (data.currentPage) {
          setCurrentPage(data.currentPage);
        }
      })
      .catch(() => {})
      .finally(() => setProgressLoaded(true));
  }, [id, isAuthenticated]);

  const rawEbookUrl = book?.ebookUrl || (book as any)?.pdfUrl || (book as any)?.epubUrl;
  const resolvedEbookUrl = resolveMediaUrl(rawEbookUrl);
  const isTg = isTelegramLink(resolvedEbookUrl);
  const isEpub = Boolean(
    resolvedEbookUrl &&
      !isTg &&
      (detectedFormat === 'EPUB' ||
        (!detectedFormat && (
          book?.ebookFormat?.toUpperCase() === 'EPUB' ||
          resolvedEbookUrl.toLowerCase().includes('.epub') ||
          (!book?.ebookFormat?.toUpperCase().includes('PDF') && !resolvedEbookUrl.toLowerCase().includes('.pdf'))
        )))
  );

  useEffect(() => {
    if (!resolvedEbookUrl || isTg) {
      setPdfBlobUrl(null);
      setIsPdfLoading(false);
      return;
    }

    let active = true;
    let createdUrl: string | null = null;
    setIsPdfLoading(true);

    fetch(resolvedEbookUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(async (blob) => {
        if (!active) return;

        // Auto-detect magic bytes for format inspection
        try {
          const headBuffer = await blob.slice(0, 8).arrayBuffer();
          const bytes = new Uint8Array(headBuffer);
          // Check for %PDF (0x25 0x50 0x44 0x46)
          const isPdfMagic = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
          // Check for PK (ZIP/EPUB container) (0x50 0x4B)
          const isZipMagic = bytes[0] === 0x50 && bytes[1] === 0x4B;

          if (isZipMagic && !isPdfMagic) {
            setDetectedFormat('EPUB');
            setIsPdfLoading(false);
            return;
          } else if (isPdfMagic) {
            setDetectedFormat('PDF');
          }
        } catch (e) {
          console.warn('Error reading magic bytes:', e);
        }

        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        createdUrl = URL.createObjectURL(pdfBlob);
        setPdfBlobUrl(createdUrl);
        setIsPdfLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.warn('PDF blob load failed, falling back to direct URL:', err);
        setPdfBlobUrl(resolvedEbookUrl);
        setIsPdfLoading(false);
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [resolvedEbookUrl, isTg]);

  if (isBookLoading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '3.5px solid #CBD5E1',
              borderTopColor: 'var(--blue)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>
            Кітап жүктелуде...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: '0 12px 36px rgba(0,0,0,0.08)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(0,87,168,0.1)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '8px' }}>
            Кітапты оқу үшін тіркеліңіз
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '28px' }}>
            Кітаптарды толық оқу және аудиосын тыңдау тек тіркелген қолданушыларға қолжетімді. Сайтқа кіріңіз немесе жаңа аккаунт ашыңыз.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate(`/signup?redirect=${encodeURIComponent(`/read/${id}`)}`)}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              Тіркелу
            </button>
            <button
              type="button"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/read/${id}`)}`)}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '50px',
                border: '1.5px solid var(--blue)',
                background: '#FFF',
                color: 'var(--blue)',
                cursor: 'pointer',
              }}
            >
              Кіру
            </button>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{ background: 'none', border: 'none', color: 'var(--text-mid)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
            >
              ← Артқа қайту
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!book || (book.isArchived && role !== 'admin')) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2>Кітап табылмады немесе архивтелген</h2>
        <button onClick={() => navigate('/catalog')} className="btn-primary" style={{ marginTop: '20px' }}>
          Каталогқа оралу
        </button>
      </div>
    );
  }

  const lightBgInfo = getLightBgByTemp(colorTemperature);
  const pageBg = theme === 'dark' ? '#020617' : theme === 'sepia' ? '#F4E8CD' : lightBgInfo.containerBg;
  const pageTextColor = theme === 'dark' ? '#F1F5F9' : theme === 'sepia' ? '#433422' : '#0F172A';
  const pageBorderColor = theme === 'dark' ? '#1E293B' : theme === 'sepia' ? '#EAD7B5' : lightBgInfo.border;
  const topBarBg = theme === 'dark' ? '#0F172A' : theme === 'sepia' ? '#FBF0D9' : lightBgInfo.headerBg;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: pageBg,
        color: pageTextColor,
        transition: 'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          backgroundColor: topBarBg,
          borderBottom: `1px solid ${pageBorderColor}`,
          color: pageTextColor,
          transition: 'background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: pageTextColor,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Артқа
          </button>

          <div className="text-center order-first sm:order-none w-full sm:w-auto">
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: pageTextColor }}>{book.title}</h3>
            <span style={{ fontSize: '12px', opacity: 0.75, color: pageTextColor }}>
              {book.author} {isEpub ? '' : `(Бет: ${currentPage})`}
            </span>
          </div>

          {/* Controls - shown for standard text mode or PDF */}
          {!isEpub && !isTg && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
              <button
                className="reader-theme-btn"
                onClick={() => setFontSize((f) => Math.max(13, f - 2))}
              >
                A -
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, width: '32px', textAlign: 'center' }}>
                {fontSize}px
              </span>
              <button
                className="reader-theme-btn"
                onClick={() => setFontSize((f) => Math.min(26, f + 2))}
              >
                A +
              </button>

              {/* Theme buttons */}
              <button
                className={`reader-theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Ашық
              </button>
              <button
                className={`reader-theme-btn ${theme === 'sepia' ? 'active' : ''}`}
                onClick={() => setTheme('sepia')}
              >
                Сепия
              </button>
              <button
                className={`reader-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Түнгі
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reader Body */}
      <main className="max-w-5xl mx-auto my-3 sm:my-6 px-3 sm:px-6 mb-20">
        {resolvedEbookUrl ? (
          isTg ? (
            <div
              style={{
                padding: '48px 24px',
                background: '#FFFFFF',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                maxWidth: '560px',
                margin: '40px auto',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(34, 158, 217, 0.12)',
                  color: '#229ED9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .39z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                Telegram арқылы оқу
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '24px' }}>
                Бұл кітаптың электронды нұсқасы Telegram каналында немесе ботында қолжетімді. Оқу үшін батырманы басыңыз:
              </p>
              <a
                href={resolvedEbookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  padding: '12px 28px',
                  fontSize: '15px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#229ED9',
                }}
              >
                Telegram-да ашу ↗
              </a>
            </div>
          ) : isEpub ? (
            // Gate: wait for progress fetch so initialLocation is stable before mount
            progressLoaded ? (
              <EpubReader
                url={resolvedEbookUrl}
                bookTitle={book.title}
                bookAuthor={book.author}
                initialLocation={savedCfi}
                theme={theme}
                onThemeChange={handleThemeChange}
                colorTemperature={colorTemperature}
                onColorTemperatureChange={handleColorTempChange}
                onProgressChange={handleProgressChange}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(0, 84, 148, 0.1)',
                      color: '#005494',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {book.ebookFormat || 'PDF'}
                  </span>
                  <span style={{ fontSize: '13px', opacity: 0.8 }}>Электронды құжат</span>
                </div>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {isFullscreen ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                      </svg>
                      <span>Толық экраннан шығу</span>
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                      </svg>
                      <span>Толық экранда оқу</span>
                    </>
                  )}
                </button>
              </div>

              <div
                ref={pdfContainerRef}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  width: '100%',
                  height: isFullscreen ? '100vh' : 'calc(100vh - 180px)',
                  minHeight: isFullscreen ? '100vh' : '600px',
                  borderRadius: isFullscreen ? '0' : '16px',
                  overflow: 'hidden',
                  border: isFullscreen ? 'none' : '1.5px solid rgba(0,0,0,0.1)',
                  background: '#FFFFFF',
                  boxShadow: isFullscreen ? 'none' : '0 4px 16px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isPdfLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        border: '3.5px solid #CBD5E1',
                        borderTopColor: 'var(--blue)',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 16px',
                      }}
                    />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      PDF құжат дайындалуда...
                    </div>
                  </div>
                ) : (
                  (() => {
                    const activePdfSource = pdfBlobUrl || resolvedEbookUrl;
                    const finalPdfSrc = activePdfSource.includes('#')
                      ? activePdfSource
                      : `${activePdfSource}#toolbar=0&navpanes=0&scrollbar=1`;
                    return (
                      <object
                        data={finalPdfSrc}
                        type="application/pdf"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                        }}
                      >
                        <iframe
                          src={finalPdfSrc}
                          title={book.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                          }}
                        />
                      </object>
                    );
                  })()
                )}
              </div>
            </div>
          )
        ) : (
          <article className="reader-content" style={{ fontSize: `${fontSize}px` }}>
            <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '24px' }}>
              <span className="book-category">{book.category}</span>
              <h1 style={{ fontSize: `${fontSize + 10}px`, fontWeight: 900, marginTop: '12px', marginBottom: '8px' }}>
                {book.title}
              </h1>
              <div style={{ fontSize: '15px', opacity: 0.8 }}>{book.author}</div>
            </div>

            <p>
              {book.description || 'Бұл кітаптың мәтіні электронды кітапхана қорына жүктелген.'}
            </p>

            <p>
              Кітап адам өміріндегі ең адал дос әрі жолбасшы. Бұл туынды оқырманның жан дүниесіне рухани нәр беріп, өмірлік сауалдарына жауап табуына септігін тигізеді. Әрбір бетін парақтаған сайын жаңа ой, терең пайым мен парасатты көзқарас ашыла түседі.
            </p>

            <p>
              Қазақ даласының кеңдігі мен рухани байлығы бабадан балаға осындай құнды шығармалар арқылы жеткен. Сөз өнері – адамзаттың ең ұлы жетістіктерінің бірі. Әрбір тараудағы сөз саптау, ой толғау мен кейіпкерлер бейнесі терең психологиялық және тарихи мазмұнға ие.
            </p>

            <p>
              Tanda платформасы арқылы оқырман кез келген уақытта және кез келген жерде өз ана тіліндегі сапалы әдебиетке қол жеткізе алады. Оқу залындағы қолайлы параметрлер көзіңізді шаршатпай, мазмұнға толықтай енуге мүмкіндік береді.
            </p>
          </article>
        )}
      </main>
    </div>
  );
};
