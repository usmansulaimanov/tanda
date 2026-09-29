import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Repeat,
  Repeat1,
  Timer,
  BookOpen,
  ArrowLeft,
  ChevronDown,
  Check,
  Headphones,
  Music,
  Volume2,
  Lock,
  Bookmark,
  List,
  X,
} from 'lucide-react';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAudioPlayerStore, getChapterStartTime, isUserExemptFromPremium } from '../../store/useAudioPlayerStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useMyBooksStore } from '../../store/useMyBooksStore';
import { useToastStore } from '../../store/useToastStore';
import { Book } from '../../types';

const TIMER_OPTIONS = [
  { label: '5 минут', value: 5 },
  { label: '10 минут', value: 10 },
  { label: '15 минут', value: 15 },
  { label: '30 минут', value: 30 },
  { label: '45 минут', value: 45 },
  { label: '60 минут (1 сағат)', value: 60 },
];

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

export const AudioPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { books, fetchBookById } = useBookStore();
  const { role, isAuthenticated, isAuthInitialized } = useAuthStore();
  const { isBookSaved, toggleSavedBook } = useSavedBooksStore();
  const { markAsReading, markAsWantToRead, markAsCompleted, removeBookFromShelf, getBookStatus } = useMyBooksStore();
  const { showToast } = useToastStore();

  const {
    currentBook,
    currentChapter,
    chapterIndex,
    isPlaying,
    progress,
    duration,
    playbackRate,
    repeatMode,
    sleepTimerMinutes,
    sleepTimerEndTime,
    isAdPlaying,
    adProgress,
    adDuration,
    adTitle,
    playBook,
    playChapter,
    togglePlay,
    nextChapter,
    prevChapter,
    setPlaybackRate,
    toggleRepeatMode,
    setSleepTimer,
    cancelSleepTimer,
  } = useAudioPlayerStore();

  const [book, setBook] = useState<Book | null>(books.find((b) => b.id === id) || null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showChaptersDrawer, setShowChaptersDrawer] = useState(false);
  const [showMobileTimerMenu, setShowMobileTimerMenu] = useState(false);
  const [showMobileSpeedMenu, setShowMobileSpeedMenu] = useState(false);
  const [remainingTimerSec, setRemainingTimerSec] = useState<number | null>(null);

  const timerMenuRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // Fetch book if not in memory or when route id changes
  useEffect(() => {
    const found = books.find((b) => b.id === id);
    if (found) {
      setBook(found);
    } else if (id) {
      fetchBookById(id)
        .then((b) => {
          if (b) setBook(b);
        })
        .catch(() => {});
    }
  }, [id, books, fetchBookById]);

  // If this book is opened, ensure player is loaded and preview limit condition is handled
  useEffect(() => {
    if (book && isAuthenticated) {
      if (!currentBook || currentBook.id !== book.id) {
        playBook(book);
      } else {
        const isExempt = isUserExemptFromPremium();
        if (book.isFree === false && !isExempt) {
          const limitMinutes = (book.previewDurationMinutes && book.previewDurationMinutes > 0)
            ? book.previewDurationMinutes
            : 15;
          const limitSec = limitMinutes * 60;
          if (progress >= limitSec) {
            playBook(book, 0, 0);
          }
        }
      }
    }
  }, [book, isAuthenticated, currentBook?.id]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timerMenuRef.current && !timerMenuRef.current.contains(e.target as Node)) {
        setShowTimerMenu(false);
      }
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sleep timer countdown
  useEffect(() => {
    if (!sleepTimerEndTime) {
      setRemainingTimerSec(null);
      return;
    }

    const checkTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((sleepTimerEndTime - now) / 1000));
      setRemainingTimerSec(diff);
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime]);

  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('tanda_token'));
  if (isAuthInitialized && !isAuthenticated && !hasToken) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '44px 32px',
            textAlign: 'center',
            boxShadow: '0 14px 40px rgba(0,0,0,0.08)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239,126,0,0.12)',
              color: 'var(--orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Headphones className="w-8 h-8" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '10px' }}>
            Аудионы тыңдау үшін тіркеліңіз
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '28px' }}>
            Аудиокітаптарды тыңдау және тараулар бойынша бөліп көру тек тіркелген оқырмандарға қолжетімді.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate(`/signup?redirect=${encodeURIComponent(`/listen/${id}`)}`)}
              className="btn-primary"
              style={{ padding: '12px 28px', fontSize: '14px', background: 'var(--orange)', border: 'none', cursor: 'pointer' }}
            >
              Тіркелу
            </button>
            <button
              type="button"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/listen/${id}`)}`)}
              style={{
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '50px',
                border: '1.5px solid var(--orange)',
                background: '#FFF',
                color: 'var(--orange)',
                cursor: 'pointer',
              }}
            >
              Кіру
            </button>
          </div>
          <div style={{ marginTop: '24px' }}>
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

  const activeBook = book || currentBook;

  if (!activeBook || (activeBook.isArchived && role !== 'admin')) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)' }}>Кітап табылмады немесе архивтелген</h2>
        <p style={{ color: 'var(--text-mid)', marginTop: '8px' }}>
          Бұл кітап әкімші тарапынан өшірілген немесе архивке қойылған.
        </p>
        <button onClick={() => navigate('/catalog')} className="btn-primary" style={{ marginTop: '24px' }}>
          Каталогқа оралу
        </button>
      </div>
    );
  }

  const isSaved = isBookSaved(activeBook.id);
  const bookStatus = getBookStatus(activeBook.id);
  const isCompleted = bookStatus === 'completed';

  const chapters = activeBook.audioChapters && activeBook.audioChapters.length > 0
    ? activeBook.audioChapters
    : [
        {
          id: `${activeBook.id}-ch-1`,
          title: '1-бөлім',
          duration: activeBook.audioDuration || '05:00',
          audioUrl: activeBook.audioUrl || '',
        },
      ];

  const currentChapterTitle = currentChapter?.title || chapters[chapterIndex]?.title || '1-бөлім';

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (hours > 0) {
      return `${hours}:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatRemainingTimer = (secs: number | null) => {
    if (secs === null || secs <= 0) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}с ${remM}м`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAdPlaying) {
      showToast('Жарнама ойнап тұрғанда өткізіп жіберуге болмайды', 'info');
      return;
    }
    const val = Number(e.target.value);
    useAudioPlayerStore.getState().setProgress(val);
    window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: val } }));
  };

  const handleSkip = (seconds: number) => {
    if (isAdPlaying) {
      showToast('Жарнама ойнап тұрғанда өткізіп жіберуге болмайды', 'info');
      return;
    }
    window.dispatchEvent(new CustomEvent('tanda:audio:skip', { detail: { seconds } }));
  };

  const handleChapterSelect = (idx: number) => {
    const isExempt = isUserExemptFromPremium();
    if (activeBook.isFree === false && !isExempt && idx > 0) {
      window.dispatchEvent(new CustomEvent('tanda:premium:modal', {
        detail: { reason: 'Тегін үзінді тек 1-бөлім үшін беріледі. Барлық бөлімдерді толық тыңдау үшін Tanda Premium-ге қосылыңыз!' }
      }));
      return;
    }
    markAsReading(activeBook.id, 1, activeBook.pages ? parseInt(String(activeBook.pages)) : undefined);
    if (currentBook?.id !== activeBook.id) {
      playBook(activeBook, idx);
    } else if (chapterIndex !== idx) {
      playChapter(idx);
    }
  };

  const handleToggleBookmark = async () => {
    const nowSaved = await toggleSavedBook(activeBook.id);
    if (nowSaved) {
      if (!isCompleted && bookStatus !== 'reading') {
        markAsWantToRead(activeBook.id);
      }
    } else {
      if (bookStatus === 'want_to_read') {
        removeBookFromShelf(activeBook.id);
      }
    }
  };

  const handleToggleCompleted = () => {
    if (isCompleted) {
      if (isSaved) {
        markAsWantToRead(activeBook.id);
      } else {
        removeBookFromShelf(activeBook.id);
      }
    } else {
      markAsCompleted(activeBook.id);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* ======================================================== */}
      {/* MOBILE PLAYER (Yandex Music / Spotify style thumb zone)   */}
      {/* ======================================================== */}
      <div className="flex md:hidden flex-col justify-between flex-1 w-full bg-[#111317] text-white px-4 pt-3 sm:pt-4 pb-8 min-h-[100dvh] relative overflow-hidden select-none">
        
        {/* Subtle background ambient blur from book gradient */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-25 pointer-events-none blur-3xl"
          style={{ background: activeBook.gradient || '#EF7E00' }}
        />

        {/* 1. Mobile Top Bar */}
        <div className="relative flex items-center justify-between w-full py-1 min-h-[44px] shrink-0 z-10">
          <div className="flex items-center z-10">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/5 active:bg-white/15 border border-white/10 flex items-center justify-center text-slate-200 transition"
              title="Жабу"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>

          {/* Exactly horizontally centered title */}
          <div className="absolute inset-x-0 mx-auto flex flex-col items-center justify-center text-center px-24 pointer-events-none z-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#EF7E00] leading-none mb-1">
              TANDA АУДИО
            </span>
            <span className="text-xs font-bold text-white/90 truncate max-w-full leading-tight">
              {activeBook.title}
            </span>
          </div>

          <div className="flex items-center z-10">
            <button
              type="button"
              onClick={handleToggleBookmark}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition ${
                isSaved
                  ? 'bg-[#EF7E00] text-white border-[#EF7E00] shadow-sm shadow-orange-500/30'
                  : 'bg-white/5 border-white/10 text-slate-200 active:bg-white/15'
              }`}
              title="Таңдаулыға қосу"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. Center Large Artwork */}
        <div className="flex-1 flex items-center justify-center py-4 px-2 min-h-0 relative z-10">
          <div className="relative w-full max-w-[270px] xs:max-w-[300px] aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
            {activeBook.coverImage ? (
              <img
                src={activeBook.coverImage}
                alt={activeBook.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}

            {/* Fallback gradient if no cover image */}
            <div
              className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${
                activeBook.coverImage ? 'hidden' : 'flex'
              }`}
              style={{
                background: activeBook.gradient || 'linear-gradient(135deg, #005494, #002d50)',
              }}
            >
              <Headphones className="w-16 h-16 text-white/30 mb-2" />
              <p className="text-sm font-bold text-white leading-snug">{activeBook.title}</p>
            </div>
          </div>
        </div>

        {/* 3. Track Info Row */}
        <div className="relative z-10 shrink-0 mb-2">
          <div className="relative flex items-center justify-center min-h-[44px]">
            <div className="min-w-0 max-w-[80%] text-center">
              <h2 className="text-lg xs:text-xl font-black text-white truncate leading-tight tracking-tight">
                {activeBook.title}
              </h2>
              <p className="text-xs xs:text-sm font-medium text-slate-400 truncate mt-0.5">
                {activeBook.author} {activeBook.audioNarrator ? `• ${activeBook.audioNarrator}` : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleCompleted}
              className={`absolute right-0 p-2.5 rounded-2xl border text-xs font-bold transition shrink-0 ${
                isCompleted
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-white/5 border-white/10 text-slate-400 active:bg-white/10'
              }`}
              title={isCompleted ? 'Оқылған' : 'Оқылды деп белгілеу'}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>

          {/* Active Chapter / Ad Banner Pill */}
          <div className="mt-2 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                isAdPlaying ? 'bg-amber-500 text-white' : isPlaying ? 'bg-[#EF7E00] text-white' : 'bg-white/10 text-slate-400'
              }`}>
                {isAdPlaying ? (
                  <Volume2 className="w-3 h-3 animate-pulse" />
                ) : isPlaying ? (
                  <Music className="w-3 h-3 animate-pulse" />
                ) : (
                  <Headphones className="w-3 h-3" />
                )}
              </div>
              <span className="text-xs font-bold text-slate-200 truncate">
                {isAdPlaying ? (adTitle || 'Tanda Аудио-Жарнама') : currentChapterTitle}
              </span>
            </div>

            {!isAdPlaying && (
              <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                {chapterIndex + 1}/{chapters.length}
              </span>
            )}
            {isAdPlaying && (
              <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
                {Math.max(0, Math.ceil((adDuration || 15) - adProgress))} сек
              </span>
            )}
          </div>
        </div>

        {/* 4. Timeline Slider */}
        <div className="relative z-10 shrink-0 mb-2">
          <input
            type="range"
            min={0}
            max={isAdPlaying ? (adDuration || 15) : (duration || 100)}
            value={isAdPlaying ? adProgress : progress}
            onChange={handleSeek}
            disabled={isAdPlaying}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#EF7E00]"
            style={{ accentColor: isAdPlaying ? '#F59E0B' : '#EF7E00' }}
          />
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 px-0.5 mt-1">
            <span className={isAdPlaying ? 'text-amber-400 font-bold' : ''}>
              {formatTime(isAdPlaying ? adProgress : progress)}
            </span>
            <span className={isAdPlaying ? 'text-amber-400 font-bold' : ''}>
              {formatTime(isAdPlaying ? (adDuration || 15) : duration)}
            </span>
          </div>
        </div>

        {/* 5. Primary Controls Row (Thumb Zone - lowered for comfort) */}
        <div className="relative z-10 shrink-0 flex items-center justify-between px-1 py-2">
          {/* -10s Rewind */}
          <button
            type="button"
            onClick={() => handleSkip(-10)}
            className="w-11 h-11 rounded-full bg-white/5 active:bg-white/15 border border-white/10 text-slate-200 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer"
            title="10 секунд артқа"
          >
            <RotateCcw className="w-4 h-4 text-[#EF7E00]" />
            <span className="text-[8px] font-bold mt-0.5 leading-none">-10с</span>
          </button>

          {/* Previous Chapter */}
          <button
            type="button"
            onClick={prevChapter}
            className="w-12 h-12 rounded-full bg-white/5 active:bg-white/15 border border-white/10 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Алдыңғы тарау"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* HERO Big Center Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-[#EF7E00] active:bg-[#e07500] text-white flex items-center justify-center shadow-xl shadow-orange-500/40 active:scale-95 transition-transform border-2 border-white/20 cursor-pointer"
            title={isPlaying ? 'Тоқтату (Пауза)' : 'Ойнату'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          {/* Next Chapter */}
          <button
            type="button"
            onClick={nextChapter}
            className="w-12 h-12 rounded-full bg-white/5 active:bg-white/15 border border-white/10 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Келесі тарау"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* +10s Forward */}
          <button
            type="button"
            onClick={() => handleSkip(10)}
            className="w-11 h-11 rounded-full bg-white/5 active:bg-white/15 border border-white/10 text-slate-200 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer"
            title="10 секунд алға"
          >
            <RotateCw className="w-4 h-4 text-[#EF7E00]" />
            <span className="text-[8px] font-bold mt-0.5 leading-none">+10с</span>
          </button>
        </div>

        {/* 6. Secondary Auxiliary Toolbar */}
        <div className="relative z-10 shrink-0 flex items-center justify-around px-2 pt-2.5 border-t border-white/10 mt-1">
          {/* Repeat */}
          <button
            type="button"
            onClick={toggleRepeatMode}
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
              repeatMode !== 'off' ? 'text-[#EF7E00] bg-[#EF7E00]/15' : 'text-slate-400 active:text-white'
            }`}
            title="Қайталау"
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            <span className="text-[9px] font-bold">
              {repeatMode === 'one' ? '1 рет' : repeatMode === 'all' ? 'Барлығы' : 'Қайталау'}
            </span>
          </button>

          {/* Speed */}
          <button
            type="button"
            onClick={() => setShowMobileSpeedMenu(true)}
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
              playbackRate !== 1 ? 'text-[#EF7E00] bg-[#EF7E00]/15' : 'text-slate-400 active:text-white'
            }`}
            title="Жылдамдық"
          >
            <span className="text-xs font-black font-mono leading-none">{playbackRate}x</span>
            <span className="text-[9px] font-bold">Жылдамдық</span>
          </button>

          {/* Sleep Timer */}
          <button
            type="button"
            onClick={() => setShowMobileTimerMenu(true)}
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
              sleepTimerMinutes ? 'text-[#EF7E00] bg-[#EF7E00]/15' : 'text-slate-400 active:text-white'
            }`}
            title="Ұйқы таймері"
          >
            <Timer className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">
              {sleepTimerMinutes ? (formatRemainingTimer(remainingTimerSec) || `${sleepTimerMinutes}м`) : 'Таймер'}
            </span>
          </button>

          {/* Chapters Drawer Trigger */}
          <button
            type="button"
            onClick={() => setShowChaptersDrawer(true)}
            className="p-2 rounded-xl transition flex flex-col items-center gap-1 text-slate-400 active:text-white cursor-pointer"
            title="Бөлімдер"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[9px] font-bold">Бөлімдер ({chapters.length})</span>
          </button>
        </div>

        {/* 7. Mobile Chapters Bottom Sheet Drawer */}
        {showChaptersDrawer && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowChaptersDrawer(false)}
          >
            <div
              className="w-full bg-[#181a20] rounded-t-3xl border-t border-white/10 p-5 max-h-[80vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
                <div>
                  <h3 className="text-base font-black text-white">Кітап бөлімдері</h3>
                  <p className="text-xs text-slate-400 font-medium">{chapters.length} бөлім бар</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChaptersDrawer(false)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center active:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/5 pr-1">
                {chapters.map((ch, idx) => {
                  const isActive = chapterIndex === idx && currentBook?.id === activeBook.id;
                  const isExempt = isUserExemptFromPremium();
                  const isLocked = activeBook.isFree === false && !isExempt && idx > 0;

                  return (
                    <button
                      key={ch.id || idx}
                      type="button"
                      onClick={() => {
                        handleChapterSelect(idx);
                        if (!isLocked) setShowChaptersDrawer(false);
                      }}
                      className={`w-full text-left py-3 px-3 rounded-2xl flex items-center justify-between gap-3 transition cursor-pointer my-1 ${
                        isActive
                          ? 'bg-[#EF7E00]/15 border border-[#EF7E00]/40 text-[#EF7E00]'
                          : isLocked
                          ? 'bg-white/[0.02] text-slate-400'
                          : 'hover:bg-white/5 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isActive
                              ? 'bg-[#EF7E00] text-white'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {isActive && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${isActive ? 'font-black text-[#EF7E00]' : 'font-semibold text-white'}`}>
                            {ch.title}
                          </p>
                          {isLocked && (
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                              <Lock className="w-3 h-3" /> Tanda Premium
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ch.duration && (
                          <span className="text-xs font-mono text-slate-400">{ch.duration}</span>
                        )}
                        {isLocked && <Lock className="w-4 h-4 text-amber-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 8. Mobile Speed Bottom Sheet */}
        {showMobileSpeedMenu && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowMobileSpeedMenu(false)}
          >
            <div
              className="w-full bg-[#181a20] rounded-t-3xl border-t border-white/10 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <h3 className="text-base font-black text-white">Ойнату жылдамдығы</h3>
                <button
                  type="button"
                  onClick={() => setShowMobileSpeedMenu(false)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center active:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(rate);
                      setShowMobileSpeedMenu(false);
                    }}
                    className={`py-3 rounded-2xl text-sm font-black flex items-center justify-center transition border ${
                      playbackRate === rate
                        ? 'bg-[#EF7E00] text-white border-[#EF7E00] shadow-md shadow-orange-500/30'
                        : 'bg-white/5 border-white/10 text-slate-200 active:bg-white/10'
                    }`}
                  >
                    <span>{rate}x</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 9. Mobile Timer Bottom Sheet */}
        {showMobileTimerMenu && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowMobileTimerMenu(false)}
          >
            <div
              className="w-full bg-[#181a20] rounded-t-3xl border-t border-white/10 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">Ұйқы таймері</h3>
                  {sleepTimerMinutes && (
                    <span className="text-xs font-mono font-bold text-[#EF7E00] bg-[#EF7E00]/15 px-2 py-0.5 rounded-lg">
                      {formatRemainingTimer(remainingTimerSec)} қалды
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileTimerMenu(false)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center active:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSleepTimer(opt.value);
                      setShowMobileTimerMenu(false);
                      showToast(`Таймер қойылды: ${opt.value} минут`, 'success');
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-between transition border ${
                      sleepTimerMinutes === opt.value
                        ? 'bg-[#EF7E00] text-white border-[#EF7E00]'
                        : 'bg-white/5 border-white/10 text-slate-200 active:bg-white/10'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sleepTimerMinutes === opt.value && <Check className="w-4 h-4" />}
                  </button>
                ))}

                {sleepTimerMinutes && (
                  <button
                    type="button"
                    onClick={() => {
                      cancelSleepTimer();
                      setShowMobileTimerMenu(false);
                      showToast('Таймер өшірілді', 'info');
                    }}
                    className="w-full text-center py-3 rounded-2xl text-sm font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 active:bg-rose-500/20 mt-2"
                  >
                    Таймерді өшіру
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* DESKTOP PLAYER (100% UNTOUCHED original layout)          */}
      {/* ======================================================== */}
      <div className="hidden md:flex w-full flex-1 flex-col bg-gradient-to-b from-[#F0F5FA] to-[#FFFFFF] p-3 sm:p-5 md:p-6 text-slate-800">
      
      {/* Top Header Navigation */}
      <div className="w-full max-w-7xl mx-auto shrink-0 mb-3 sm:mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/90 backdrop-blur-md px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-slate-200/80 shadow-xs">
          
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#005494] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Артқа қайту</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Quick Bookmark */}
            <button
              type="button"
              onClick={handleToggleBookmark}
              className={`p-1.5 sm:p-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                isSaved
                  ? 'bg-[#EF7E00] text-white border-[#EF7E00] shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={isSaved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              </svg>
            </button>

            {/* Quick Completed */}
            <button
              type="button"
              onClick={handleToggleCompleted}
              className={`p-1.5 sm:p-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                isCompleted
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Left (Player Console) + Right (Chapters list) */}
      <div className="w-full max-w-7xl mx-auto flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          
          {/* LEFT COLUMN: Unified Compact Book & Player Console */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-md flex flex-col gap-3.5 sm:gap-4 relative overflow-hidden">
              
              {/* Subtle background glow */}
              <div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 pointer-events-none blur-3xl"
                style={{ background: activeBook.gradient || '#005494' }}
              />

              {/* 1. Book Meta Row */}
              <div className="flex flex-row items-start gap-3.5 sm:gap-5 relative z-10">
                {/* Book Cover Image */}
                <div
                  className="w-24 sm:w-32 md:w-36 lg:w-40 aspect-[3/4] max-h-52 rounded-xl sm:rounded-2xl shrink-0 shadow-md relative overflow-hidden flex flex-col justify-end p-2 sm:p-3 border-2 border-white/90 group"
                  style={{
                    background: activeBook.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
                  }}
                >
                  {activeBook.coverImage ? (
                    <img
                      src={activeBook.coverImage}
                      alt={activeBook.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}

                  {/* Playing Animated Soundwave */}
                  {isPlaying && (
                    <div className="absolute bottom-1.5 left-1.5 z-20 flex items-end gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg">
                      <span className="w-1 bg-[#EF7E00] rounded-full animate-pulse h-2.5 sm:h-3"></span>
                      <span className="w-1 bg-[#EF7E00] rounded-full animate-bounce h-4 sm:h-5"></span>
                      <span className="w-1 bg-[#EF7E00] rounded-full animate-pulse h-3 sm:h-4"></span>
                    </div>
                  )}
                </div>

                {/* Metadata details */}
                <div className="flex-1 min-w-0">
                  <div className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-[#005494] text-[11px] sm:text-xs font-bold mb-1 sm:mb-1.5">
                    {activeBook.category}
                  </div>

                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 leading-tight mb-1 truncate tracking-tight">
                    {activeBook.title}
                  </h1>

                  <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-2 sm:mb-2.5 truncate">
                    Авторы: <span className="text-slate-900 font-bold">{activeBook.author}</span>
                  </p>

                  <div className="flex flex-col gap-1 text-[11px] sm:text-xs text-slate-600 bg-slate-50 px-2.5 py-2 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1 shrink-0 truncate">
                      <span>Диктор:</span> <strong className="text-slate-900">{activeBook.audioNarrator || 'Танда Аудио'}</strong>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 truncate">
                      <span>Бөлім:</span> <strong className="text-slate-900">{currentChapterTitle}</strong>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 truncate">
                      <span>Ұзақтығы:</span> <strong className="text-slate-900">{activeBook.audioDuration || 'Толық аудио'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Active Chapter Indicator Banner */}
              <div className={`flex items-center justify-between gap-3 border px-3 sm:px-3.5 py-2.5 rounded-xl transition-all ${
                isAdPlaying 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-[#005494]/5 border-[#005494]/15'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isAdPlaying
                      ? 'bg-amber-500 text-white shadow-sm'
                      : isPlaying 
                      ? 'bg-[#EF7E00] text-white shadow-sm' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {isAdPlaying ? (
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    ) : isPlaying ? (
                      <Music className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                      <Headphones className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {!isAdPlaying && (
                      <span className="text-[10px] font-black uppercase tracking-wide block text-slate-500">
                        Қазір ойналуда ({chapterIndex + 1}/{chapters.length})
                      </span>
                    )}
                    <h4 className={`text-xs sm:text-sm font-black text-slate-900 ${isAdPlaying ? 'whitespace-normal break-words leading-snug' : 'truncate'}`}>
                      {isAdPlaying ? (adTitle || 'Tanda Аудио-Жарнама') : currentChapterTitle}
                    </h4>
                  </div>
                </div>
                {isAdPlaying && (
                  <span className="text-xs font-black text-amber-600 bg-amber-500/20 px-2.5 py-1 rounded-lg shrink-0 font-mono">
                    {Math.max(0, Math.ceil((adDuration || 15) - adProgress))} сек қалды
                  </span>
                )}
              </div>

              {/* 3. Progress Slider & Controls Console */}
              <div className="flex flex-col gap-2.5 pt-1">
                
                {/* Progress bar */}
                <div className="flex flex-col gap-1">
                  <input
                    type="range"
                    min={0}
                    max={isAdPlaying ? (adDuration || 15) : (duration || 100)}
                    value={isAdPlaying ? adProgress : progress}
                    onChange={handleSeek}
                    disabled={isAdPlaying}
                    className={`w-full h-2 rounded-lg appearance-none transition-all ${
                      isAdPlaying ? 'bg-amber-100 cursor-not-allowed' : 'bg-slate-200 cursor-pointer accent-[#EF7E00]'
                    }`}
                    style={{ accentColor: isAdPlaying ? '#F59E0B' : '#EF7E00' }}
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold px-1">
                    <span className={isAdPlaying ? 'text-amber-600 font-black' : 'text-slate-500'}>
                      {formatTime(isAdPlaying ? adProgress : progress)}
                    </span>
                    <span className={isAdPlaying ? 'text-amber-600 font-black' : 'text-slate-500'}>
                      {formatTime(isAdPlaying ? (adDuration || 15) : duration)}
                    </span>
                  </div>
                </div>

                {/* Main Controls Row */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap pt-1">
                  
                  {/* Repeat Button */}
                  <button
                    type="button"
                    onClick={toggleRepeatMode}
                    className={`p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                      repeatMode !== 'off'
                        ? 'bg-[#EF7E00]/10 border-[#EF7E00] text-[#EF7E00] shadow-sm'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    style={{ width: '38px', height: '38px' }}
                    title={
                      repeatMode === 'one'
                        ? 'Осы аудионы қайталау қосулы (1)'
                        : repeatMode === 'all'
                        ? 'Барлық тарауларды қайталау қосулы (Барлығы)'
                        : 'Қайталауды қосу'
                    }
                  >
                    {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                  </button>

                  {/* Previous Chapter */}
                  <button
                    type="button"
                    onClick={prevChapter}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] transition cursor-pointer flex items-center justify-center shadow-xs"
                    title="Алдыңғы тарау"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* Rewind -10s */}
                  <button
                    type="button"
                    onClick={() => handleSkip(-10)}
                    className="px-2 sm:px-2.5 h-9 sm:h-10 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] transition cursor-pointer flex items-center gap-1 shadow-xs font-bold text-[11px]"
                    title="10 секунд артқа"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#005494]" />
                    <span>-10с</span>
                  </button>

                  {/* Center Big Play / Pause Button */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-r from-[#EF7E00] to-[#FF9800] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer hover:shadow-orange-500/30 border-2 border-white mx-1"
                    title={isPlaying ? 'Тоқтату (Пауза)' : 'Ойнату'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Forward +10s */}
                  <button
                    type="button"
                    onClick={() => handleSkip(10)}
                    className="px-2 sm:px-2.5 h-9 sm:h-10 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] transition cursor-pointer flex items-center gap-1 shadow-xs font-bold text-[11px]"
                    title="10 секунд алға"
                  >
                    <span>+10с</span>
                    <RotateCw className="w-3.5 h-3.5 text-[#005494]" />
                  </button>

                  {/* Next Chapter */}
                  <button
                    type="button"
                    onClick={nextChapter}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] transition cursor-pointer flex items-center justify-center shadow-xs"
                    title="Келесі тарау"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Sleep Timer Popover */}
                  <div className="relative" ref={timerMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTimerMenu((prev) => !prev);
                        setShowSpeedMenu(false);
                      }}
                      className={`h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        sleepTimerMinutes
                          ? 'bg-[#EF7E00] text-white border-[#EF7E00]'
                          : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Ұйқы таймері"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      {sleepTimerMinutes ? (
                        <span className="font-mono font-bold text-[10px]">
                          {formatRemainingTimer(remainingTimerSec) || `${sleepTimerMinutes}м`}
                        </span>
                      ) : (
                        <span className="hidden sm:inline text-[11px]">Таймер</span>
                      )}
                    </button>

                    {showTimerMenu && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 text-slate-900">
                        <div className="px-2 py-1 border-b border-slate-100 mb-1 flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                            <Timer className="w-3 h-3 text-[#005494]" />
                            Ұйқы таймері
                          </span>
                          {sleepTimerMinutes && (
                            <span className="text-[10px] font-extrabold text-[#EF7E00] bg-[#EF7E00]/10 px-1 py-0.5 rounded">
                              {formatRemainingTimer(remainingTimerSec)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                          {TIMER_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSleepTimer(opt.value);
                                setShowTimerMenu(false);
                                showToast(`Таймер қойылды: ${opt.value} минут`, 'success');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                                sleepTimerMinutes === opt.value
                                  ? 'bg-[#005494] text-white'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {sleepTimerMinutes === opt.value && <Check className="w-3 h-3" />}
                            </button>
                          ))}

                          {sleepTimerMinutes && (
                            <button
                              type="button"
                              onClick={() => {
                                cancelSleepTimer();
                                setShowTimerMenu(false);
                                showToast('Таймер өшірілді', 'info');
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition mt-1 border-t border-slate-100"
                            >
                              Таймерді өшіру
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Speed Popover */}
                  <div className="relative" ref={speedMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSpeedMenu((prev) => !prev);
                        setShowTimerMenu(false);
                      }}
                      className={`h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center min-w-[38px] shadow-xs ${
                        playbackRate !== 1
                          ? 'bg-[#005494] text-white border-[#005494]'
                          : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Ойнату жылдамдығы"
                    >
                      {playbackRate}x
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-white rounded-2xl border border-slate-200 shadow-2xl p-1.5 z-50 text-slate-900">
                        <div className="px-2 py-1 border-b border-slate-100 mb-1 text-[11px] font-black text-slate-900">
                          Жылдамдық
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {SPEED_OPTIONS.map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => {
                                setPlaybackRate(rate);
                                setShowSpeedMenu(false);
                              }}
                              className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold flex items-center justify-between transition ${
                                playbackRate === rate
                                  ? 'bg-[#005494] text-white'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span>{rate}x</span>
                              {playbackRate === rate && <Check className="w-3 h-3" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: Chapters List */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-md flex flex-col">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 mb-2.5">
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Кітап бөлімдері</h3>

                <span className="text-[11px] font-extrabold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {chapters.length} бөлім
                </span>
              </div>

              {/* Scrollable list of chapters */}
              <div className="max-h-[380px] sm:max-h-[460px] lg:max-h-[500px] overflow-y-auto divide-y divide-slate-100 pr-1">
                {chapters.map((ch, idx) => {
                  const isActive = chapterIndex === idx && currentBook?.id === activeBook.id;
                  const isExempt = isUserExemptFromPremium();
                  const isLocked = activeBook.isFree === false && !isExempt && idx > 0;

                  return (
                    <button
                      key={ch.id || idx}
                      type="button"
                      onClick={() => handleChapterSelect(idx)}
                      className={`w-full text-left py-2.5 sm:py-3 px-2.5 sm:px-3 rounded-xl transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-[#005494]/6'
                          : isLocked
                          ? 'hover:bg-amber-50/40 opacity-85'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Title */}
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          <h4 className={`text-xs sm:text-sm truncate ${isActive ? 'font-black text-[#005494]' : 'font-semibold text-slate-800'}`}>
                            {ch.title}
                          </h4>
                          {isLocked && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                              <Lock className="w-2.5 h-2.5" />
                              Премиум
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Duration & Play / Lock icon */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {ch.duration && (
                          <span className="text-[11px] font-mono font-medium text-slate-400">
                            {ch.duration}
                          </span>
                        )}

                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                            isActive
                              ? 'bg-[#EF7E00] text-white shadow-xs'
                              : isLocked
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isLocked ? (
                            <Lock className="w-3 h-3" />
                          ) : isActive && isPlaying ? (
                            <Pause className="w-3 h-3 fill-current" />
                          ) : (
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          )}
                        </div>
                      </div>

                    </button>
                  );
                })}
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
    </div>
  );
};
