import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Play, X, CheckCircle, Clock, Bookmark } from 'lucide-react';
import { Book } from '../../../types';
import { BookShelfStatus, useMyBooksStore } from '../../../store/useMyBooksStore';
import { TandaPremiumBadge } from '../../../components/ui/TandaPremiumBadge';

interface ShelfSpineViewProps {
  items: { book: Book; record: { bookId: string | number; status: BookShelfStatus } }[];
  handleToggleStatus: (bookId: string, status: BookShelfStatus, title: string) => void;
  handleRemove: (bookId: string, title: string) => void;
  onPlayAudio: (book: Book) => void;
}

// Authentic leather / cloth book spine color palettes
const SPINE_PALETTES = [
  {
    bg: 'linear-gradient(180deg, #7A5C22 0%, #5E4616 100%)',
    accent: '#F6CD6A',
    ribbon: '#ECC060',
    cover: 'linear-gradient(145deg, #8B6914 0%, #6B4F10 40%, #4A3508 100%)',
    glow: 'rgba(236, 192, 96, 0.45)',
  },
  {
    bg: 'linear-gradient(180deg, #1C4332 0%, #112E21 100%)',
    accent: '#A7F3D0',
    ribbon: '#FCD34D',
    cover: 'linear-gradient(145deg, #1A4D38 0%, #113326 40%, #0A1F18 100%)',
    glow: 'rgba(167, 243, 208, 0.4)',
  },
  {
    bg: 'linear-gradient(180deg, #1E3A5F 0%, #10243D 100%)',
    accent: '#BAE6FD',
    ribbon: '#EF7E00',
    cover: 'linear-gradient(145deg, #1E4170 0%, #12295A 40%, #0A1A3D 100%)',
    glow: 'rgba(0, 84, 148, 0.45)',
  },
  {
    bg: 'linear-gradient(180deg, #5E1928 0%, #3D0F19 100%)',
    accent: '#FECDD3',
    ribbon: '#FCD34D',
    cover: 'linear-gradient(145deg, #701A2E 0%, #4D0F1E 40%, #320A14 100%)',
    glow: 'rgba(254, 205, 211, 0.4)',
  },
  {
    bg: 'linear-gradient(180deg, #6B3419 0%, #48200D 100%)',
    accent: '#FED7AA',
    ribbon: '#F6CD6A',
    cover: 'linear-gradient(145deg, #7D3A1A 0%, #562411 40%, #381608 100%)',
    glow: 'rgba(246, 205, 106, 0.45)',
  },
  {
    bg: 'linear-gradient(180deg, #4A2346 0%, #30142D 100%)',
    accent: '#F5D0FE',
    ribbon: '#ECC060',
    cover: 'linear-gradient(145deg, #5A2554 0%, #3A1637 40%, #240E22 100%)',
    glow: 'rgba(245, 208, 254, 0.4)',
  },
  {
    bg: 'linear-gradient(180deg, #2B3545 0%, #1A212D 100%)',
    accent: '#E2E8F0',
    ribbon: '#EF7E00',
    cover: 'linear-gradient(145deg, #2E3F52 0%, #1C2A3A 40%, #111C27 100%)',
    glow: 'rgba(226, 232, 240, 0.4)',
  },
];

const BOOKS_PER_SHELF = 6;

export const ShelfSpineView: React.FC<ShelfSpineViewProps> = ({
  items,
  handleToggleStatus,
  handleRemove,
  onPlayAudio,
}) => {
  const navigate = useNavigate();
  const { hasStatus } = useMyBooksStore();
  const [modalItem, setModalItem] = useState<{
    book: Book;
    record: { bookId: string | number; status: BookShelfStatus };
  } | null>(null);

  // Group books into shelves
  const shelves: typeof items[] = [];
  for (let i = 0; i < items.length; i += BOOKS_PER_SHELF) {
    shelves.push(items.slice(i, i + BOOKS_PER_SHELF));
  }

  const activeBook = modalItem?.book;
  const activeRecord = modalItem?.record;

  const hasAudio = Boolean(
    activeBook?.hasAudio ||
    (activeBook?.audioUrl && activeBook.audioUrl.trim()) ||
    (activeBook?.audioChapters && activeBook.audioChapters.length > 0)
  );

  const hasText = Boolean(
    activeBook?.hasEbook ||
    (activeBook?.ebookUrl && activeBook.ebookUrl.trim()) ||
    (activeBook?.pdfUrl && activeBook.pdfUrl.trim()) ||
    (activeBook?.epubUrl && activeBook.epubUrl.trim()) ||
    (activeBook?.content && activeBook.content.trim())
  );

  return (
    <div className="w-full relative select-none">
      {/* Bookshelf Master Container - Real Natural Pine Wood Texture */}
      <div
        className="rounded-3xl p-4 sm:p-8 overflow-hidden shadow-2xl border-2 border-[#C99C6B]/70 relative"
        style={{
          backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(245, 225, 195, 0.18) 50%, rgba(180, 130, 70, 0.25) 100%), url(/pine-wood-texture.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 20px 48px rgba(160, 110, 60, 0.2), inset 0 2px 8px rgba(255, 255, 255, 0.8), inset 0 -6px 16px rgba(140, 90, 40, 0.15)',
        }}
      >
        {/* Subtle Vertical Wood Panel Slats on the back wall */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0px, transparent 72px, rgba(120, 70, 25, 0.3) 73px, rgba(255, 255, 255, 0.5) 74px)',
          }}
        />

        {/* Ambient Warm Daylight & Candlelight Glows */}
        <div
          className="absolute -top-16 left-1/4 w-96 h-80 rounded-full pointer-events-none opacity-35 blur-3xl"
          style={{ background: 'radial-gradient(circle, #FEF3C7 0%, transparent 70%)' }}
        />
        <div
          className="absolute -top-16 right-1/4 w-96 h-80 rounded-full pointer-events-none opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #FDE68A 0%, transparent 70%)' }}
        />

        {/* Shelves Stack */}
        <div className="flex flex-col gap-12 sm:gap-16 relative z-10 pt-2">
          {shelves.map((shelfItems, shelfIndex) => {
            const isLastShelf = shelfIndex === shelves.length - 1;

            return (
              <div key={shelfIndex} className="relative w-full">
                {/* Books Row standing firmly on the shelf */}
                <div
                  className="flex items-end justify-start sm:justify-center gap-3 sm:gap-5 px-3 sm:px-6 min-h-[260px] sm:min-h-[280px] pb-0 overflow-x-auto no-scrollbar"
                >
                  {shelfItems.map(({ book, record }, bookIndex) => {
                    const idNum = Number(String(book.id).replace(/\D/g, '')) || (shelfIndex * 6 + bookIndex + 1);
                    const palette = SPINE_PALETTES[idNum % SPINE_PALETTES.length];

                    // Physical dimensions
                    const heightVariations = [220, 235, 210, 240, 225, 230];
                    const spineWidthVariations = [46, 52, 44, 54, 48, 50];
                    const spineHeight = heightVariations[(idNum + bookIndex) % heightVariations.length];
                    const spineWidth = spineWidthVariations[(idNum + bookIndex) % spineWidthVariations.length];

                    return (
                      <div
                        key={book.id}
                        onClick={() => setModalItem({ book, record })}
                        style={{
                          width: `${spineWidth}px`,
                          height: `${spineHeight + 15}px`,
                        }}
                        className="shrink-0 relative flex flex-col justify-end items-center cursor-pointer select-none group"
                        title={`${book.title} — ${book.author}`}
                      >
                        {/* STANDING ON SHELF AS PHYSICAL SPINE */}
                        <div
                          style={{
                            width: `${spineWidth}px`,
                            height: `${spineHeight}px`,
                            background: palette.bg,
                            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset -3px 0 6px rgba(0,0,0,0.45), 0 8px 16px rgba(120,75,30,0.25)',
                          }}
                          className="relative rounded-t-[4px] flex flex-col justify-between items-center overflow-hidden transition-all duration-300 transform group-hover:-translate-y-3 group-hover:scale-105 group-hover:shadow-[0_16px_32px_rgba(100,60,20,0.38)]"
                        >
                          {/* Bookmark Ribbon on top */}
                          <div
                            className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-3.5 h-6 z-20 shadow-sm"
                            style={{
                              background: palette.ribbon,
                              clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 75%, 0% 100%)',
                            }}
                          />

                          {/* 3D Cylindrical Spine Lighting */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background:
                                'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.06) 45%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.45) 100%)',
                            }}
                          />

                          {/* Top Golden Ridges */}
                          <div className="relative z-10 w-full pt-3 px-1">
                            <div className="w-full h-[1.5px] bg-amber-200/40 rounded-full" />
                            <div className="w-full h-px bg-amber-200/25 mt-1 rounded-full" />
                          </div>

                          {/* Vertical Book Title on Spine */}
                          <div
                            className="relative z-10 flex-1 flex items-center justify-center py-2 px-1 max-h-[150px] overflow-hidden"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                          >
                            <span
                              className="font-serif font-bold text-xs tracking-wider text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] truncate block max-h-[140px]"
                            >
                              {book.title}
                            </span>
                          </div>

                          {/* Bottom Golden Ridges */}
                          <div className="relative z-10 w-full pb-2.5 px-1">
                            <div className="w-full h-px bg-amber-200/25 mb-1 rounded-full" />
                            <div className="w-full h-[1.5px] bg-amber-200/40 rounded-full" />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Atmospheric Candle on Shelf */}
                  {(isLastShelf || shelfItems.length < BOOKS_PER_SHELF) && (
                    <div className="shrink-0 flex flex-col items-center justify-end h-28 ml-2 sm:ml-4 pb-0 z-10 select-none">
                      {/* Candle Flame with pulsation */}
                      <div className="relative flex items-center justify-center mb-1">
                        <div
                          className="absolute w-12 h-12 rounded-full pointer-events-none -top-2 animate-pulse"
                          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)' }}
                        />
                        <div
                          className="w-2.5 h-4.5 rounded-full shadow-[0_0_12px_#F59E0B]"
                          style={{ background: 'radial-gradient(ellipse at 50% 80%, #FFFFFF 0%, #FDE047 40%, #EA580C 100%)' }}
                        />
                      </div>
                      {/* Candle Wax Body */}
                      <div
                        className="w-4 h-12 rounded-t-xs shadow-md border-t border-amber-200"
                        style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FDF6E2 50%, #EADBBE 100%)' }}
                      />
                    </div>
                  )}
                </div>

                {/* 3D Realistic Natural Light Pine Wood Shelf Plank */}
                <div className="w-full relative mt-[-2px] z-30">
                  {/* Top Shelf Edge Highlight (Golden Pine texture bevel) */}
                  <div
                    className="h-3 w-full rounded-t-sm relative overflow-hidden"
                    style={{
                      backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.7) 0%, rgba(255,245,230,0.4) 50%, rgba(255,255,255,0.7) 100%), url(/pine-wood-texture.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center top',
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.95), 0 -1px 3px rgba(160,110,50,0.2)',
                    }}
                  />
                  {/* Front Plank Face with Wood Grain & 3D Depth Shadow */}
                  <div
                    className="h-8 sm:h-9 w-full rounded-b-xl flex items-center justify-between px-6 border-t border-[#DFBA8E] relative overflow-hidden"
                    style={{
                      backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(160,110,60,0.15) 50%, rgba(100,55,15,0.4) 100%), url(/pine-wood-texture.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center bottom',
                      boxShadow: '0 16px 32px rgba(130, 80, 30, 0.28), inset 0 1px 2px rgba(255,255,255,0.5)',
                    }}
                  >
                    <div className="w-16 h-0.5 bg-amber-950/20 rounded-full" />
                    <div className="w-24 h-0.5 bg-amber-950/15 rounded-full" />
                    <div className="w-20 h-0.5 bg-amber-950/20 rounded-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COMPACT MODAL POPUP FOR CLICKED BOOK CARD                                */}
      {/* ========================================================================= */}
      {modalItem && activeBook && activeRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setModalItem(null)}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setModalItem(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all z-20"
              title="Жабу"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Top Book Overview */}
            <div className="flex gap-4 items-start pr-8">
              {/* Cover Image - clickable to open book details */}
              <div
                onClick={() => {
                  setModalItem(null);
                  navigate(`/book/${activeBook.id}`);
                }}
                className="w-24 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden shadow-lg shrink-0 relative cursor-pointer hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all"
                title="Кітап карточкасын ашу"
                style={{
                  background: activeBook.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
                }}
              >
                {activeBook.coverImage ? (
                  <img
                    src={activeBook.coverImage}
                    alt={activeBook.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-white">
                    <BookOpen className="w-6 h-6 mb-1 text-white/80" />
                    <span className="text-[10px] font-bold line-clamp-2">{activeBook.title}</span>
                  </div>
                )}

                {/* Premium Badge */}
                {!activeBook.isFree && <TandaPremiumBadge position="left" />}
              </div>

              {/* Book Info */}
              <div className="flex-1 min-w-0">
                {activeBook.category && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-[#005494] bg-blue-50 border border-blue-100/80 mb-1.5 truncate max-w-full">
                    {activeBook.category}
                  </span>
                )}

                <h3
                  onClick={() => {
                    setModalItem(null);
                    navigate(`/book/${activeBook.id}`);
                  }}
                  className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug line-clamp-2 cursor-pointer hover:text-[#005494] transition-colors"
                  title="Кітап карточкасын ашу"
                >
                  {activeBook.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-0.5 truncate">
                  {activeBook.author}
                </p>

                {/* Current Status Badges */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {hasStatus(String(activeBook.id), 'reading') && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-[#005494] shadow-xs">
                      <Clock className="w-3 h-3" />
                      Қазір оқуда
                    </span>
                  )}
                  {hasStatus(String(activeBook.id), 'completed') && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 shadow-xs">
                      <CheckCircle className="w-3 h-3" />
                      Оқылып бітті
                    </span>
                  )}
                  {hasStatus(String(activeBook.id), 'want_to_read') && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 shadow-xs">
                      <Bookmark className="w-3 h-3" />
                      Енді оқимын
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Book Description Excerpt (if available) */}
            {activeBook.description && (
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-4 mb-0">
                {activeBook.description}
              </p>
            )}

            {/* Quick Status Switcher */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-3 gap-1.5">
                {/* 1. Оқуда - toggles OFF if active; disabled if inactive (requires 5 min listening) */}
                <button
                  type="button"
                  onClick={() => {
                    if (hasStatus(String(activeBook.id), 'reading')) {
                      handleToggleStatus(String(activeBook.id), 'reading', activeBook.title);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                    hasStatus(String(activeBook.id), 'reading')
                      ? 'bg-[#005494] text-white shadow-xs cursor-pointer hover:bg-[#004377]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                  title={
                    hasStatus(String(activeBook.id), 'reading')
                      ? 'Басып, «Оқып жатқандарым» сөресінен өшіру'
                      : 'Бұл күй кітапты 5 минут тыңдағанда автоматты қосылады'
                  }
                >
                  <Clock className="w-3 h-3" />
                  Оқуда
                </button>

                {/* 2. Оқылды - independent toggle on/off */}
                <button
                  type="button"
                  onClick={() => {
                    handleToggleStatus(String(activeBook.id), 'completed', activeBook.title);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    hasStatus(String(activeBook.id), 'completed')
                      ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={hasStatus(String(activeBook.id), 'completed') ? 'Басып, «Оқылып бітті» күйін өшіру' : 'Оқылғандарға қосу'}
                >
                  <CheckCircle className="w-3 h-3" />
                  Оқылды
                </button>

                {/* 3. Енді оқимын - independent toggle on/off */}
                <button
                  type="button"
                  onClick={() => {
                    handleToggleStatus(String(activeBook.id), 'want_to_read', activeBook.title);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    hasStatus(String(activeBook.id), 'want_to_read')
                      ? 'bg-[#EF7E00] text-white shadow-xs hover:bg-[#d67000]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={hasStatus(String(activeBook.id), 'want_to_read') ? 'Басып, «Енді оқимын» күйін өшіру' : 'Енді оқитындарға қосу'}
                >
                  <Bookmark className="w-3 h-3" />
                  Енді оқимын
                </button>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2">
                {/* Read Button */}
                {hasText ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalItem(null);
                      navigate(`/read/${activeBook.id}`);
                    }}
                    className="py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md hover:brightness-110"
                    style={{ background: '#005494' }}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Оқу
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="py-2.5 px-3 rounded-xl font-bold text-xs text-slate-400 bg-slate-100 flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
                    title="Электронды кітап нұсқасы жоқ"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Оқу
                  </button>
                )}

                {/* Listen Button */}
                {hasAudio ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalItem(null);
                      onPlayAudio(activeBook);
                      navigate(`/listen/${activeBook.id}`);
                    }}
                    className="py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md hover:brightness-110"
                    style={{ background: '#EF7E00' }}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Тыңдау
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="py-2.5 px-3 rounded-xl font-bold text-xs text-slate-400 bg-slate-100 flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
                    title="Аудио нұсқасы жоқ"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Тыңдау
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
