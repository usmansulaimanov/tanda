import React, { useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Headphones, RotateCcw, RotateCw } from 'lucide-react';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useToastStore } from '../../store/useToastStore';
import { extractYouTubeVideoId, loadYouTubeIFrameApi } from '../../utils/youtube';

export const AudioPlayerBar: React.FC = () => {
  const {
    currentBook,
    currentChapter,
    chapterIndex,
    isPlaying,
    progress,
    duration,
    playbackRate,
    setIsPlaying,
    togglePlay,
    nextChapter,
    prevChapter,
    setProgress,
    setDuration,
    setPlaybackRate,
    closePlayer,
  } = useAudioPlayerStore();

  const { showToast } = useToastStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const audioSrc = currentChapter?.audioUrl || currentBook?.audioUrl || '';
  const ytVideoId = extractYouTubeVideoId(audioSrc);
  const isYouTube = !!ytVideoId;

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
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setIsPlaying(false);
                nextChapter();
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
  }, [ytVideoId, isYouTube, showToast]);

  // Sync play/pause with players
  useEffect(() => {
    if (isYouTube) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        const state = typeof ytPlayerRef.current.getPlayerState === 'function' ? ytPlayerRef.current.getPlayerState() : -1;
        if (isPlaying && state !== 1) {
          ytPlayerRef.current.playVideo();
        } else if (!isPlaying && state === 1) {
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

  if (!currentBook) return null;

  const chapters = currentBook.audioChapters || [];
  const currentChapterTitle = currentChapter?.title || chapters[chapterIndex]?.title || 'Негізгі аудио';

  return (
    <>
      {/* Off-screen YouTube container for audio playback without showing video on screen */}
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
            onTimeUpdate={(e) => {
              const current = e.currentTarget.currentTime;
              const dur = e.currentTarget.duration || duration;
              setProgress(current);
              if (dur && !isNaN(dur)) setDuration(dur);
            }}
            onEnded={nextChapter}
          />
        )}

        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: Book Meta */}
            <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-0">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden relative"
                style={{
                  background: currentBook.gradient || '#0057A8',
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
                  {currentBook.author} &bull; <span className="text-[#0057A8] font-medium">{currentChapterTitle}</span>
                </p>
              </div>
            </div>

            {/* Center: Controls & Progress */}
            <div className="flex flex-col items-center w-full sm:w-1/2 max-w-md gap-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={prevChapter}
                  disabled={chapterIndex === 0}
                  className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Алдыңғы тарау"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* 10 seconds backward */}
                <button
                  type="button"
                  onClick={() => skipTime(-10)}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
                  title="10 секунд артқа өткізу"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">-10с</span>
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-[#0057A8] hover:bg-[#003d7a] text-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
                  title={isPlaying ? 'Тоқтату' : 'Ойнату'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                {/* 10 seconds forward */}
                <button
                  type="button"
                  onClick={() => skipTime(10)}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
                  title="10 секунд алға өткізу"
                >
                  <span className="text-[11px]">+10с</span>
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={nextChapter}
                  disabled={chapterIndex >= chapters.length - 1}
                  className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Келесі тарау"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Speed rate toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const rates = [1, 1.25, 1.5, 2];
                    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                    setPlaybackRate(nextRate);
                  }}
                  className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
                  title="Ойнату жылдамдығы"
                >
                  {playbackRate}x
                </button>
              </div>

              {/* Slider bar */}
              <div className="flex items-center gap-2 w-full text-[11px] text-slate-400 font-mono">
                <span>{formatTime(progress)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={progress}
                  onChange={handleSeek}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0057A8]"
                />
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right: Close action */}
            <div className="hidden sm:flex items-center justify-end w-1/4 gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Жабу"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
