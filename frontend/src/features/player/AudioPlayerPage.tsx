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
  Check,
  Headphones,
  Music,
} from 'lucide-react';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAudioPlayerStore, getChapterStartTime } from '../../store/useAudioPlayerStore';
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
  const { role, isAuthenticated } = useAuthStore();
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
  const [remainingTimerSec, setRemainingTimerSec] = useState<number | null>(null);

  const timerMenuRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // Fetch book if not in memory
  useEffect(() => {
    if (!book && id) {
      fetchBookById(id)
        .then((b) => {
          if (b) setBook(b);
        })
        .catch(() => {});
    }
  }, [book, id, fetchBookById]);

  // If this book is opened and isn't currently loaded in the player store, start playing it
  useEffect(() => {
    if (book && isAuthenticated && (!currentBook || currentBook.id !== book.id)) {
      playBook(book, 0);
    }
  }, [book, isAuthenticated, currentBook, playBook]);

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

  if (!isAuthenticated) {
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
          title: '1-аудио',
          duration: activeBook.audioDuration || '05:00',
          audioUrl: activeBook.audioUrl || '',
        },
      ];

  const currentChapterTitle = currentChapter?.title || chapters[chapterIndex]?.title || '1-аудио';

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
    const val = Number(e.target.value);
    window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: val } }));
  };

  const handleSkip = (seconds: number) => {
    window.dispatchEvent(new CustomEvent('tanda:audio:skip', { detail: { seconds } }));
  };

  const handleChapterSelect = (idx: number) => {
    markAsReading(activeBook.id, 1, activeBook.pages ? parseInt(String(activeBook.pages)) : undefined);
    if (currentBook?.id !== activeBook.id) {
      playBook(activeBook, idx);
    } else {
      playChapter(idx);
    }
    const currentChapters = activeBook.audioChapters || [];
    const ch = currentChapters[idx];
    const hasOwnAudio = Boolean(ch?.audioUrl && ch.audioUrl.trim());
    const targetStartTime = !hasOwnAudio ? getChapterStartTime(currentChapters, idx) : 0;
    window.dispatchEvent(new CustomEvent('tanda:audio:seek', { detail: { time: targetStartTime } }));
  };

  const handleToggleBookmark = async () => {
    const nowSaved = await toggleSavedBook(activeBook.id);
    if (nowSaved) {
      if (!isCompleted) {
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
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-b from-[#F0F5FA] to-[#FFFFFF] p-3 sm:p-4 md:p-6 text-slate-800">
      
      {/* Top Header Navigation */}
      <div className="w-full max-w-7xl mx-auto shrink-0 mb-3 sm:mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/90 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-slate-200/80 shadow-sm">
          
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

      {/* Main Container: Left (Fixed Compact Console) + Right (Only chapters scroll) */}
      <div className="w-full max-w-7xl mx-auto flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-full min-h-0">
          
          {/* LEFT COLUMN: Unified Compact Book & Player Console (7 cols, fixed in view) */}
          <div className="lg:col-span-7 h-full flex flex-col min-h-0">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-lg flex flex-col justify-between h-full overflow-hidden relative">
              
              {/* Subtle background glow */}
              <div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 pointer-events-none blur-3xl"
                style={{ background: activeBook.gradient || '#005494' }}
              />

              {/* 1. Book Meta Row */}
              <div className="flex items-start gap-5 sm:gap-6 min-h-0 relative z-10">
                {/* Book Cover Image - Enlarged & High Shadow */}
                <div
                  className="w-40 sm:w-48 md:w-52 aspect-[3/4] rounded-2xl sm:rounded-3xl shrink-0 shadow-2xl relative overflow-hidden flex flex-col justify-end p-3 border-2 border-white/90 group"
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
                    <div className="absolute bottom-2 left-2 z-20 flex items-end gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg">
                      <span className="w-1 bg-[#EF7E00] rounded-full animate-pulse h-3"></span>
                      <span className="w-1 bg-[#EF7E00] rounded-full animate-bounce h-5"></span>
                      <span className="w-1 bg-[#EF7E00] rounded-full animate-pulse h-4"></span>
                    </div>
                  )}
                </div>

                {/* Metadata details */}
                <div className="flex-1 min-w-0">
                  <div className="inline-block px-3 py-1 rounded-lg bg-slate-100 text-[#005494] text-xs font-bold mb-2">
                    {activeBook.category}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-1.5 truncate tracking-tight">
                    {activeBook.title}
                  </h1>

                  <p className="text-sm sm:text-base font-semibold text-slate-600 mb-3">
                    Авторы: <span className="text-slate-900 font-bold">{activeBook.author}</span>
                  </p>

                  <div className="flex flex-col gap-1.5 text-xs text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1 shrink-0">
                      <span>Диктор:</span> <strong className="text-slate-900">{activeBook.audioNarrator || 'Танда Аудио'}</strong>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span>Бөлімдер:</span> <strong className="text-slate-900">{chapters.length} бөлім</strong>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span>Ұзақтығы:</span> <strong className="text-slate-900">{activeBook.audioDuration || 'Толық аудио'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Active Chapter Indicator Banner */}
              <div className="my-3 sm:my-4 flex items-center justify-between gap-3 bg-[#005494]/5 border border-[#005494]/15 px-3.5 py-2 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isPlaying ? 'bg-[#EF7E00] text-white shadow-sm' : 'bg-slate-200 text-slate-700'}`}>
                    {isPlaying ? <Music className="w-3.5 h-3.5 animate-pulse" /> : <Headphones className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Қазір ойналуда ({chapterIndex + 1}/{chapters.length})
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {currentChapterTitle}
                    </h4>
                  </div>
                </div>
              </div>

              {/* 3. Progress Slider & Controls Console */}
              <div className="flex flex-col gap-3">
                
                {/* Progress bar */}
                <div className="flex flex-col gap-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#EF7E00] transition-all"
                    style={{ accentColor: '#EF7E00' }}
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 px-1">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Main Controls Row */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap">
                  
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
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] transition cursor-pointer flex items-center justify-center shadow-sm"
                    title="Алдыңғы тарау"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* Rewind -10s */}
                  <button
                    type="button"
                    onClick={() => handleSkip(-10)}
                    className="px-2.5 h-9 sm:h-10 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] transition cursor-pointer flex items-center gap-1 shadow-sm font-bold text-[11px]"
                    title="10 секунд артқа"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#005494]" />
                    <span>-10с</span>
                  </button>

                  {/* Center Big Play / Pause Button */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-[#EF7E00] to-[#FF9800] text-white flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer hover:shadow-orange-500/30 border-2 sm:border-4 border-white mx-1"
                    title={isPlaying ? 'Тоқтату (Пауза)' : 'Ойнату'}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Forward +10s */}
                  <button
                    type="button"
                    onClick={() => handleSkip(10)}
                    className="px-2.5 h-9 sm:h-10 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] transition cursor-pointer flex items-center gap-1 shadow-sm font-bold text-[11px]"
                    title="10 секунд алға"
                  >
                    <span>+10с</span>
                    <RotateCw className="w-3.5 h-3.5 text-[#005494]" />
                  </button>

                  {/* Next Chapter */}
                  <button
                    type="button"
                    onClick={nextChapter}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] transition cursor-pointer flex items-center justify-center shadow-sm"
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
                      className={`h-9 sm:h-10 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
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
                      className={`h-9 sm:h-10 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center min-w-[38px] shadow-sm ${
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

          {/* RIGHT COLUMN: Chapters List (5 cols, ONLY this scrolls internally when chapters overflow) */}
          <div className="lg:col-span-5 h-full flex flex-col min-h-0">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-lg flex flex-col h-full min-h-0 overflow-hidden">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 mb-3">
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Кітап бөлімдері</h3>

                <span className="text-[11px] font-extrabold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {chapters.length} бөлім
                </span>
              </div>

              {/* Scrollable list of chapters - ONLY THIS SCROLLS */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2">
                {chapters.map((ch, idx) => {
                  const isActive = chapterIndex === idx && currentBook?.id === activeBook.id;

                  return (
                    <button
                      key={ch.id || idx}
                      type="button"
                      onClick={() => handleChapterSelect(idx)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-[#005494]/5 border-[#005494] shadow-sm ring-2 ring-[#005494]/20'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/90 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        
                        {/* Index / Playing Equalizer */}
                        <div
                          className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-extrabold text-xs transition ${
                            isActive
                              ? 'bg-[#005494] text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700'
                          }`}
                        >
                          {isActive && isPlaying ? (
                            <div className="flex items-end gap-0.5 h-3">
                              <span className="w-0.5 bg-white rounded-full animate-pulse h-1.5"></span>
                              <span className="w-0.5 bg-white rounded-full animate-bounce h-3"></span>
                              <span className="w-0.5 bg-white rounded-full animate-pulse h-2"></span>
                            </div>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        {/* Title */}
                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-[#005494]' : 'text-slate-800'}`}>
                            {ch.title}
                          </h4>
                        </div>
                      </div>

                      {/* Duration & Play icon */}
                      <div className="flex items-center gap-2 shrink-0">
                        {ch.duration && (
                          <span className="text-[11px] font-mono font-semibold text-slate-500">
                            {ch.duration}
                          </span>
                        )}

                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            isActive
                              ? 'bg-[#EF7E00] text-white'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          {isActive && isPlaying ? (
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
  );
};
