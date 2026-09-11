import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Headphones,
  RotateCcw,
  RotateCw,
  Repeat,
  Repeat1,
  Timer,
  Check,
  ChevronUp,
} from 'lucide-react';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { extractYouTubeVideoId, loadYouTubeIFrameApi } from '../../utils/youtube';

const TIMER_OPTIONS = [
  { label: '5 минут', value: 5 },
  { label: '10 минут', value: 10 },
  { label: '15 минут', value: 15 },
  { label: '30 минут', value: 30 },
  { label: '45 минут', value: 45 },
  { label: '60 минут (1 сағат)', value: 60 },
];

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

export const AudioPlayerBar: React.FC = () => {
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
    setIsPlaying,
    togglePlay,
    nextChapter,
    prevChapter,
    setProgress,
    setDuration,
    setPlaybackRate,
    toggleRepeatMode,
    setSleepTimer,
    cancelSleepTimer,
    closePlayer,
  } = useAudioPlayerStore();

  const { isAuthenticated } = useAuthStore();
  const { showToast } = useToastStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  // Popover menus state
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [remainingTimerSec, setRemainingTimerSec] = useState<number | null>(null);

  const timerMenuRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const audioSrc = currentChapter?.audioUrl || currentBook?.audioUrl || '';
  const ytVideoId = extractYouTubeVideoId(audioSrc);
  const isYouTube = !!ytVideoId;

  // Auto-close and stop player completely when user logs out or is unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
      closePlayer();
    }
  }, [isAuthenticated, closePlayer]);

  // Close popovers on click outside
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

  // Sleep timer interval countdown & auto-pause
  useEffect(() => {
    if (!sleepTimerEndTime) {
      setRemainingTimerSec(null);
      return;
    }

    const checkTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((sleepTimerEndTime - now) / 1000));
      setRemainingTimerSec(diff);

      if (now >= sleepTimerEndTime) {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          ytPlayerRef.current.pauseVideo();
        }
        cancelSleepTimer();
        showToast('Таймер аяқталды: аудио ойнату тоқтатылды', 'info');
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime, cancelSleepTimer, setIsPlaying, showToast]);

  // Handle Track End with Repeat Logic
  const handleTrackEnd = useCallback(() => {
    if (repeatMode === 'one') {
      setProgress(0);
      if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
      return;
    }

    // Otherwise next chapter or loop all
    nextChapter();
  }, [repeatMode, isYouTube, nextChapter, setProgress, setIsPlaying]);

  // Initialize YouTube Player in offscreen container
  useEffect(() => {
    let isMounted = true;

    if (!isYouTube || !ytVideoId) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
      return;
    }

    loadYouTubeIFrameApi().then((YT) => {
      if (!isMounted) return;
      if (!YT || !YT.Player) return;

      const container = document.getElementById('tanda-yt-iframe-container');
      if (!container) return;

      if (ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.loadVideoById === 'function') {
            ytPlayerRef.current.loadVideoById(ytVideoId);
            if (isPlaying) {
              ytPlayerRef.current.playVideo();
            } else {
              ytPlayerRef.current.pauseVideo();
            }
            return;
          }
        } catch {
          // recreate if needed
        }
      }

      try {
        ytPlayerRef.current = new YT.Player('tanda-yt-iframe-container', {
          height: '240',
          width: '320',
          videoId: ytVideoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            enablejsapi: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              event.target.setPlaybackRate(playbackRate);
              const dur = event.target.getDuration();
              if (dur && !isNaN(dur) && dur > 0) {
                setDuration(dur);
              }
              if (progress > 0) {
                event.target.seekTo(progress, true);
              }
              if (isPlaying) {
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
              if (event.data === 1) {
                setIsPlaying(true);
                const dur = event.target.getDuration();
                if (dur && !isNaN(dur) && dur > 0) {
                  setDuration(dur);
                }
              } else if (event.data === 0) {
                handleTrackEnd();
              }
            },
            onError: (event: any) => {
              if (!isMounted) return;
              if (event.data === 101 || event.data === 150) {
                showToast('Бұл YouTube аудиосын автор басқа сайттарда ойнатуға шектеу қойған (Error 150)', 'error');
              } else if (event.data === 100) {
                showToast('YouTube аудио жазбасы табылмады', 'error');
              }
            },
          },
        });
      } catch (err) {
        console.error('Failed to instantiate YT.Player', err);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [ytVideoId, isYouTube, showToast, handleTrackEnd]);

  // Handle browser autoplay policy by auto-resuming on first user interaction
  useEffect(() => {
    if (!isPlaying) return;

    const handleFirstGesture = () => {
      if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo();
      } else if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('touchstart', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [isPlaying, isYouTube]);

  // Sync play/pause with players
  useEffect(() => {
    if (isYouTube) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        if (isPlaying) {
          ytPlayerRef.current.playVideo();
        } else {
          ytPlayerRef.current.pauseVideo();
        }
      }
    } else {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
      }
    }
  }, [isPlaying, isYouTube, currentChapter]);

  // Sync playback rate
  useEffect(() => {
    if (isYouTube) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
        ytPlayerRef.current.setPlaybackRate(playbackRate);
      }
    } else if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, isYouTube]);

  // Polling YouTube progress
  useEffect(() => {
    if (!isYouTube || !isPlaying) return;

    const interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const current = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          if (current !== undefined && !isNaN(current)) {
            setProgress(current);
          }
          if (dur !== undefined && !isNaN(dur) && dur > 0) {
            setDuration(dur);
          }
        } catch {
          // ignore
        }
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isYouTube, isPlaying, setProgress, setDuration]);

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
    setProgress(val);
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(val, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const skipTime = (seconds: number) => {
    const maxDur = duration || 999999;
    const newTime = Math.max(0, Math.min(maxDur, progress + seconds));
    setProgress(newTime);
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(newTime, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleClose = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
      ytPlayerRef.current.pauseVideo();
    }
    closePlayer();
  }, [closePlayer]);

  if (!isAuthenticated || !currentBook) return null;

  const chapters = currentBook.audioChapters || [];
  const currentChapterTitle = currentChapter?.title || chapters[chapterIndex]?.title || 'Негізгі аудио';

  return (
    <>
      {/* Off-screen YouTube container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '-9999px',
          width: '320px',
          height: '240px',
          opacity: 0.001,
          pointerEvents: 'none',
          zIndex: -9999,
          visibility: 'visible',
        }}
      >
        <div id="tanda-yt-iframe-container" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Main Bottom Audio Player Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl transition-all">
        {/* Standard HTML5 Audio element */}
        {!isYouTube && audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              if (dur && !isNaN(dur) && dur > 0) setDuration(dur);
              if (progress > 0 && Math.abs(e.currentTarget.currentTime - progress) > 1) {
                e.currentTarget.currentTime = progress;
              }
              if (isPlaying) {
                e.currentTarget.play().catch(() => {});
              }
            }}
            onTimeUpdate={(e) => {
              const current = e.currentTarget.currentTime;
              const dur = e.currentTarget.duration || duration;
              setProgress(current);
              if (dur && !isNaN(dur)) setDuration(dur);
            }}
            onEnded={handleTrackEnd}
          />
        )}

        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Left: Book Cover & Meta Info */}
            <div className="flex items-center gap-3 w-full md:w-1/4 min-w-0">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden relative"
                style={{
                  background: currentBook.gradient || '#005494',
                }}
              >
                {currentBook.coverImage ? (
                  <img
                    src={currentBook.coverImage}
                    alt={currentBook.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Headphones className="w-5 h-5 text-white/90" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 truncate">{currentBook.title}</h4>
                <p className="text-xs text-slate-500 truncate">
                  {currentBook.author} &bull; <span className="text-[#005494] font-semibold">{currentChapterTitle}</span>
                </p>
              </div>
            </div>

            {/* Center: Controls & Progress Bar */}
            <div className="flex flex-col items-center w-full md:w-2/4 max-w-lg gap-1.5">
              {/* Controls row */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                
                {/* Repeat Mode Button */}
                <button
                  type="button"
                  onClick={toggleRepeatMode}
                  className={`relative p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    repeatMode !== 'off'
                      ? 'bg-[#EF7E00]/10 border-[#EF7E00] text-[#EF7E00] shadow-sm'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-600 hover:bg-[#E8F1FB] hover:text-[#005494] hover:border-[#005494]/30'
                  }`}
                  style={{ width: '36px', height: '36px' }}
                  title={
                    repeatMode === 'one'
                      ? 'Осы аудионы қайталау қосулы (Басыңыз: өшіру)'
                      : repeatMode === 'all'
                      ? 'Барлық тарауларды қайталау қосулы (Басыңыз: өшіру)'
                      : 'Қайталауды қосу (Басыңыз)'
                  }
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                  {repeatMode === 'all' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#EF7E00]" />
                  )}
                </button>

                {/* Previous Track / Chapter Button */}
                <button
                  type="button"
                  onClick={prevChapter}
                  className="p-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] hover:border-[#005494]/30 transition-all cursor-pointer flex items-center justify-center shadow-sm"
                  style={{ width: '36px', height: '36px' }}
                  title="Алдыңғы аудио / басына қайтару"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* 10 seconds Backward */}
                <button
                  type="button"
                  onClick={() => skipTime(-10)}
                  className="px-2.5 h-9 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] hover:border-[#005494]/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  title="10 секунд артқа өткізу"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#005494]" />
                  <span className="text-[11px] font-bold">-10с</span>
                </button>

                {/* Main Play / Pause Circle Button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-[#005494] hover:bg-[#003F70] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0 border-2 border-white mx-0.5"
                  title={isPlaying ? 'Тоқтату (Пауза)' : 'Ойнату'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* 10 seconds Forward */}
                <button
                  type="button"
                  onClick={() => skipTime(10)}
                  className="px-2.5 h-9 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] hover:border-[#005494]/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  title="10 секунд алға өткізу"
                >
                  <span className="text-[11px] font-bold">+10с</span>
                  <RotateCw className="w-3.5 h-3.5 text-[#005494]" />
                </button>

                {/* Next Track / Chapter Button */}
                <button
                  type="button"
                  onClick={nextChapter}
                  className="p-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] hover:border-[#005494]/30 transition-all cursor-pointer flex items-center justify-center shadow-sm"
                  style={{ width: '36px', height: '36px' }}
                  title="Кейінгі аудио / келесі тарау"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Sleep Timer Button with Popover */}
                <div className="relative" ref={timerMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTimerMenu((prev) => !prev);
                      setShowSpeedMenu(false);
                    }}
                    className={`h-9 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      sleepTimerMinutes
                        ? 'bg-[#EF7E00] text-white border-[#EF7E00]'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] hover:border-[#005494]/30'
                    }`}
                    title="Ұйқы таймері (Автоматты өшіру)"
                  >
                    <Timer className="w-4 h-4" />
                    {sleepTimerMinutes ? (
                      <span className="text-[11px] font-bold font-mono">
                        {formatRemainingTimer(remainingTimerSec) || `${sleepTimerMinutes}м`}
                      </span>
                    ) : (
                      <span className="hidden sm:inline text-[11px]">Таймер</span>
                    )}
                  </button>

                  {/* Sleep Timer Popover Dropdown */}
                  {showTimerMenu && (
                    <div
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2.5 z-50 text-slate-900"
                      style={{ animation: 'fadeInUp 0.18s ease-out' }}
                    >
                      <div className="px-2 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5 text-[#005494]" />
                          Ұйқы таймері
                        </span>
                        {sleepTimerMinutes && (
                          <span className="text-[10px] font-extrabold text-[#EF7E00] bg-[#EF7E00]/10 px-1.5 py-0.5 rounded">
                            {formatRemainingTimer(remainingTimerSec)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                        {TIMER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSleepTimer(opt.value);
                              setShowTimerMenu(false);
                              showToast(`Таймер қойылды: аудио ${opt.value} минуттан кейін өшеді`, 'success');
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                              sleepTimerMinutes === opt.value
                                ? 'bg-[#005494] text-white'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {sleepTimerMinutes === opt.value && <Check className="w-3.5 h-3.5" />}
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
                            className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition mt-1 border-t border-slate-100"
                          >
                            Таймерді өшіру
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Speed rate toggle with popover */}
                <div className="relative" ref={speedMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSpeedMenu((prev) => !prev);
                      setShowTimerMenu(false);
                    }}
                    className={`h-9 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center min-w-[36px] shadow-sm ${
                      playbackRate !== 1
                        ? 'bg-[#005494] text-white border-[#005494]'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-[#E8F1FB] hover:text-[#005494] hover:border-[#005494]/30'
                    }`}
                    title="Ойнату жылдамдығы"
                  >
                    {playbackRate}x
                  </button>

                  {showSpeedMenu && (
                    <div
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-36 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 text-slate-900"
                      style={{ animation: 'fadeInUp 0.18s ease-out' }}
                    >
                      <div className="px-2 py-1 border-b border-slate-100 mb-1 text-xs font-black text-slate-900">
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
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition ${
                              playbackRate === rate
                                ? 'bg-[#005494] text-white'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span>{rate}x</span>
                            {playbackRate === rate && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Progress Slider */}
              <div className="flex items-center gap-2.5 w-full text-[11px] text-slate-500 font-mono font-bold">
                <span className="w-10 text-right">{formatTime(progress)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={progress}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#005494]"
                  style={{ accentColor: '#005494' }}
                />
                <span className="w-10 text-left">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right: Chapter list / Close Action */}
            <div className="flex items-center justify-end w-full md:w-1/4 gap-2">
              {chapters.length > 1 && (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {chapterIndex + 1} / {chapters.length} тарау
                </span>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center shadow-sm"
                title="Плеерді жабу"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

