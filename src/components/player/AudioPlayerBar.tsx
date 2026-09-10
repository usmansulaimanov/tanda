import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Headphones, Youtube } from 'lucide-react';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
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
    togglePlay,
    nextChapter,
    prevChapter,
    setProgress,
    setDuration,
    setPlaybackRate,
    closePlayer,
  } = useAudioPlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const [ytReady, setYtReady] = useState(false);

  const audioSrc = currentChapter?.audioUrl || currentBook?.audioUrl || '';
  const ytVideoId = extractYouTubeVideoId(audioSrc);
  const isYouTube = !!ytVideoId;

  // Initialize YouTube IFrame Player
  useEffect(() => {
    let mounted = true;

    if (!isYouTube) return;

    loadYouTubeIFrameApi().then(() => {
      if (!mounted) return;
      if (!(window as any).YT || !(window as any).YT.Player) return;

      if (!ytPlayerRef.current) {
        try {
          ytPlayerRef.current = new (window as any).YT.Player('tanda-yt-audio-player', {
            height: '1',
            width: '1',
            videoId: ytVideoId,
            playerVars: {
              autoplay: isPlaying ? 1 : 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
            },
            events: {
              onReady: (event: any) => {
                if (!mounted) return;
                setYtReady(true);
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
                if (!mounted) return;
                // YT.PlayerState.ENDED is 0
                if (event.data === 0) {
                  nextChapter();
                }
                if (event.data === 1) {
                  const dur = event.target.getDuration();
                  if (dur && !isNaN(dur) && dur > 0) {
                    setDuration(dur);
                  }
                }
              },
            },
          });
        } catch (err) {
          console.error('YouTube player init error:', err);
        }
      } else {
        // Player exists, switch video if needed
        try {
          if (typeof ytPlayerRef.current.getVideoData === 'function') {
            const currentId = ytPlayerRef.current.getVideoData()?.video_id;
            if (currentId !== ytVideoId) {
              ytPlayerRef.current.loadVideoById(ytVideoId);
              if (!isPlaying) {
                ytPlayerRef.current.pauseVideo();
              }
            }
          }
        } catch (err) {
          console.error('YouTube loadVideoById error:', err);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [ytVideoId, isYouTube]);

  // Sync play/pause state
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
  }, [isPlaying, isYouTube, ytReady, currentChapter]);

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

  // Polling YouTube playback progress
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
    }, 500);

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
  const currentChapterTitle = currentChapter?.title || chapters[chapterIndex]?.title || 'Тарау';

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl transition-all">
      {/* Hidden YouTube player container */}
      <div
        id="tanda-yt-audio-player"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

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
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden"
              style={{
                background: currentBook.coverImage
                  ? `url(${currentBook.coverImage}) center/cover`
                  : currentBook.gradient || '#0057A8',
              }}
            >
              {!currentBook.coverImage && <Headphones className="w-5 h-5 text-white/90" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-900 truncate">{currentBook.title}</h4>
                {isYouTube && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 shrink-0"
                    title="YouTube аудио форматы"
                  >
                    <Youtube className="w-3 h-3" />
                    YouTube
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {currentBook.author} &bull; <span className="text-[#0057A8] font-medium">{currentChapterTitle}</span>
              </p>
            </div>
          </div>

          {/* Center: Controls & Progress */}
          <div className="flex flex-col items-center w-full sm:w-1/2 max-w-md gap-1">
            <div className="flex items-center gap-4">
              <button
                onClick={prevChapter}
                disabled={chapterIndex === 0}
                className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Алдыңғы тарау"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-[#0057A8] hover:bg-[#003d7a] text-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                onClick={nextChapter}
                disabled={chapterIndex >= chapters.length - 1}
                className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Келесі тарау"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Speed rate toggle */}
              <button
                onClick={() => {
                  const rates = [1, 1.25, 1.5, 2];
                  const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                  setPlaybackRate(nextRate);
                }}
                className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded-md hover:bg-slate-200"
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
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              title="Жабу"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
