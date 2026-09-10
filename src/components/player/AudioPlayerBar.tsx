import React, { useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Headphones } from 'lucide-react';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';

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

  // Sync play/pause with HTMLAudioElement
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked if not interacted
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentChapter]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  if (!currentBook) return null;

  const chapters = currentBook.audioChapters || [];
  const currentChapterTitle = currentChapter?.title || (chapters[chapterIndex]?.title) || 'Тарау';

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setProgress(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const audioSrc = currentChapter?.audioUrl || currentBook.audioUrl || '';

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl transition-all">
      {/* Audio element for real playback */}
      {audioSrc && (
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
              style={{ background: currentBook.coverImage ? `url(${currentBook.coverImage}) center/cover` : (currentBook.gradient || '#0057A8') }}
            >
              {!currentBook.coverImage && <Headphones className="w-5 h-5 text-white/90" />}
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
              onClick={closePlayer}
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
