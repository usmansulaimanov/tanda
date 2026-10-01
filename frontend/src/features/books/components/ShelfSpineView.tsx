import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Play, MoreVertical, Trash2 } from 'lucide-react';
import { Book } from '../../../types';
import { BookShelfStatus } from '../../../store/useMyBooksStore';
import tandaPremiumWhite from '../../../assets/tanda-premium-white.png';

interface ShelfSpineViewProps {
  items: { book: Book; record: { bookId: string | number; status: BookShelfStatus } }[];
  handleChangeStatus: (bookId: string, status: BookShelfStatus, title: string) => void;
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
  handleChangeStatus,
  handleRemove,
  onPlayAudio,
}) => {
  const navigate = useNavigate();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [activeMenuBookId, setActiveMenuBookId] = useState<string | null>(null);

  // Group books into shelves
  const shelves: typeof items[] = [];
  for (let i = 0; i < items.length; i += BOOKS_PER_SHELF) {
    shelves.push(items.slice(i, i + BOOKS_PER_SHELF));
  }

  // Close menus when clicked outside
  useEffect(() => {
    const handleClick = () => {
      setActiveMenuBookId(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleBookClick = (bookId: string) => {
    if (selectedBookId === bookId) {
      setSelectedBookId(null);
    } else {
      setSelectedBookId(bookId);
      setActiveMenuBookId(null);
    }
  };

  return (
    <div className="w-full relative select-none">
      <style>{`
        /* 3D Physical Book Slide-out & Rotation Animations */
        @keyframes book3DOpenAnimation {
          0% {
            transform: translateY(0) translateZ(0) rotateY(90deg) rotateX(0deg);
          }
          35% {
            transform: translateY(-24px) translateZ(120px) rotateY(90deg) rotateX(0deg);
          }
          100% {
            transform: translateY(-30px) translateZ(140px) rotateY(-10deg) rotateX(2deg);
          }
        }

        @keyframes book3DCloseAnimation {
          0% {
            transform: translateY(-30px) translateZ(140px) rotateY(-10deg) rotateX(2deg);
          }
          45% {
            transform: translateY(-24px) translateZ(120px) rotateY(90deg) rotateX(0deg);
          }
          100% {
            transform: translateY(0) translateZ(0) rotateY(90deg) rotateX(0deg);
          }
        }
      `}</style>

      {/* Bookshelf Master Container */}
      <div
        className="rounded-3xl p-4 sm:p-8 overflow-hidden shadow-2xl border border-amber-950/40 relative"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, #2D1E16 0%, #19120D 60%, #0D0805 100%)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedBookId(null);
            setActiveMenuBookId(null);
          }
        }}
      >
        {/* Ambient Candlelight Glows */}
        <div
          className="absolute -top-24 left-1/4 w-96 h-96 rounded-full pointer-events-none opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)' }}
        />
        <div
          className="absolute -top-24 right-1/4 w-96 h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #EF7E00 0%, transparent 70%)' }}
        />

        {/* Shelf Header Banner */}
        <div className="flex items-center justify-between gap-3 mb-6 px-2 text-amber-200/80 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>3D Кітап сөресі — кітапты басқанда сөреден суырылып, 3D мұқабасымен бұрылады</span>
          </div>
          <span className="text-[11px] text-amber-200/60 hidden sm:inline">
            Барлығы: {items.length} кітап
          </span>
        </div>

        {/* Shelves Stack */}
        <div className="flex flex-col gap-12 sm:gap-16 relative z-10 pt-4">
          {shelves.map((shelfItems, shelfIndex) => {
            const isLastShelf = shelfIndex === shelves.length - 1;

            return (
              <div key={shelfIndex} className="relative w-full">
                {/* Books Row standing firmly on the shelf */}
                <div
                  className="flex items-end justify-start sm:justify-center gap-3 sm:gap-5 px-3 sm:px-6 min-h-[300px] sm:min-h-[320px] pb-0 overflow-x-auto no-scrollbar"
                  style={{ perspective: '1400px', perspectiveOrigin: '50% 60%' }}
                >
                  {shelfItems.map(({ book, record }, bookIndex) => {
                    const idNum = Number(String(book.id).replace(/\D/g, '')) || (shelfIndex * 6 + bookIndex + 1);
                    const palette = SPINE_PALETTES[idNum % SPINE_PALETTES.length];
                    const isSelected = selectedBookId === String(book.id);

                    // Formats existence checks
                    const hasAudio = Boolean(
                      book.hasAudio ||
                      (book.audioUrl && book.audioUrl.trim()) ||
                      (book.audioChapters && book.audioChapters.length > 0)
                    );
                    const hasText = Boolean(
                      book.hasEbook ||
                      (book.ebookUrl && book.ebookUrl.trim()) ||
                      (book.pdfUrl && book.pdfUrl.trim()) ||
                      (book.epubUrl && book.epubUrl.trim()) ||
                      (book.content && book.content.trim())
                    );

                    // Physical dimensions
                    const heightVariations = [220, 235, 210, 240, 225, 230];
                    const spineWidthVariations = [46, 52, 44, 54, 48, 50];
                    const spineHeight = heightVariations[(idNum + bookIndex) % heightVariations.length];
                    const spineWidth = spineWidthVariations[(idNum + bookIndex) % spineWidthVariations.length];

                    const COVER_W = 175; // Front Cover Width
                    const COVER_H = 248; // Front Cover Height
                    const BOOK_D = 38;   // Book Thickness

                    const statusLabel =
                      record.status === 'reading' ? 'Қазір оқуда' :
                      record.status === 'completed' ? 'Оқылып бітті' :
                      'Енді оқимын';

                    const isMenuOpen = activeMenuBookId === String(book.id);

                    return (
                      <div
                        key={book.id}
                        onClick={() => handleBookClick(String(book.id))}
                        style={{
                          width: isSelected ? `${COVER_W + 24}px` : `${spineWidth}px`,
                          height: `${COVER_H + 35}px`,
                          transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                          zIndex: isSelected ? 50 : 10,
                        }}
                        className="shrink-0 relative flex flex-col justify-end items-center cursor-pointer select-none"
                      >
                        {/* ========================================================================= */}
                        {/* CASE A: STANDING ON SHELF AS PHYSICAL SPINE (When closed)                 */}
                        {/* ========================================================================= */}
                        {!isSelected ? (
                          <div
                            style={{
                              width: `${spineWidth}px`,
                              height: `${spineHeight}px`,
                              background: palette.bg,
                              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset -3px 0 6px rgba(0,0,0,0.55)',
                            }}
                            className="relative rounded-t-[4px] flex flex-col justify-between items-center overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
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
                                  'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.24) 20%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.55) 100%)',
                              }}
                            />

                            {/* Top Golden Ridges */}
                            <div className="relative z-10 w-full pt-3 px-1">
                              <div className="w-full h-[1.5px] bg-amber-200/35 rounded-full" />
                              <div className="w-full h-px bg-amber-200/20 mt-1 rounded-full" />
                            </div>

                            {/* Vertical Book Title on Spine */}
                            <div
                              className="relative z-10 flex-1 flex items-center justify-center py-2 px-1 max-h-[150px] overflow-hidden"
                              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                              <span
                                className="font-serif font-bold text-xs tracking-wider text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] truncate block max-h-[140px]"
                                title={book.title}
                              >
                                {book.title}
                              </span>
                            </div>

                            {/* Bottom Golden Ridges */}
                            <div className="relative z-10 w-full pb-2.5 px-1">
                              <div className="w-full h-px bg-amber-200/20 mb-1 rounded-full" />
                              <div className="w-full h-[1.5px] bg-amber-200/35 rounded-full" />
                            </div>
                          </div>
                        ) : (
                          /* ========================================================================= */
                          /* CASE B: REAL PHYSICAL 3D BOOK PULLED OUT & ROTATED (When open/selected)   */
                          /* ========================================================================= */
                          <div
                            className="relative flex flex-col items-center"
                            style={{
                              animation: 'book3DOpenAnimation 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                            }}
                          >
                            {/* 3D Physical Book Body with Thickness, Spine & Pages */}
                            <div
                              className="relative flex rounded-md overflow-visible"
                              style={{
                                width: `${COVER_W + BOOK_D}px`,
                                height: `${COVER_H}px`,
                                filter: `drop-shadow(0 30px 42px rgba(0,0,0,0.95)) drop-shadow(0 0 24px ${palette.glow})`,
                                transform: 'rotateY(-12deg) rotateX(3deg)',
                                transformStyle: 'preserve-3d',
                              }}
                            >
                              {/* Left Spine (3D Depth) */}
                              <div
                                className="h-full rounded-l-md relative overflow-hidden"
                                style={{
                                  width: `${BOOK_D}px`,
                                  background: palette.bg,
                                  boxShadow: 'inset 0 0 8px rgba(0,0,0,0.7)',
                                  transform: 'skewY(-7deg)',
                                  transformOrigin: 'right center',
                                }}
                              >
                                {/* Spine lighting */}
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    background:
                                      'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(255,255,255,0.18) 30%, rgba(0,0,0,0.35) 100%)',
                                  }}
                                />
                                {/* Spine Title in 3D */}
                                <div
                                  className="relative z-10 h-full flex items-center justify-center p-1 overflow-hidden"
                                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                >
                                  <span className="font-serif font-bold text-[10px] text-amber-100/90 truncate block max-h-[140px]">
                                    {book.title}
                                  </span>
                                </div>
                              </div>

                              {/* Front Cover Face */}
                              <div
                                className="h-full rounded-r-md relative overflow-hidden flex-1"
                                style={{
                                  background: book.gradient || palette.cover,
                                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
                                }}
                              >
                                {book.coverImage ? (
                                  <img
                                    src={book.coverImage}
                                    alt={book.title}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-between p-4 text-center">
                                    <div className="w-12 h-0.5 rounded-full" style={{ background: palette.accent + '90' }} />
                                    <div className="my-auto px-2">
                                      <div
                                        className="w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2"
                                        style={{ background: 'rgba(255,255,255,0.12)', border: `1.5px solid ${palette.accent}50` }}
                                      >
                                        <BookOpen className="w-5 h-5" style={{ color: palette.accent }} />
                                      </div>
                                      <h4
                                        className="font-serif font-extrabold text-xs leading-snug line-clamp-3 text-amber-50"
                                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                                      >
                                        {book.title}
                                      </h4>
                                      <p className="text-[10px] text-amber-200/80 font-medium mt-1">{book.author}</p>
                                    </div>
                                    <div className="w-12 h-0.5 rounded-full" style={{ background: palette.accent + '90' }} />
                                  </div>
                                )}

                                {/* Cover Gloss Sheen */}
                                <div
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    background:
                                      'linear-gradient(135deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.05) 40%, transparent 65%)',
                                  }}
                                />

                                {/* Premium Badge */}
                                {!book.isFree && (
                                  <div className="absolute top-2 left-2 z-10">
                                    <div
                                      className="flex items-center justify-center w-5 h-5 rounded-full shadow-md"
                                      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                                    >
                                      <img src={tandaPremiumWhite} alt="Premium" className="w-3 h-3 object-contain" />
                                    </div>
                                  </div>
                                )}

                                {/* Status Badge */}
                                <div className="absolute bottom-2 left-2 z-10">
                                  <span
                                    className="text-[8px] font-extrabold px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm"
                                    style={{
                                      background:
                                        record.status === 'reading'
                                          ? 'rgba(0,84,148,0.85)'
                                          : record.status === 'completed'
                                          ? 'rgba(16,185,129,0.85)'
                                          : 'rgba(239,126,0,0.85)',
                                      color: '#FFFFFF',
                                    }}
                                  >
                                    {statusLabel}
                                  </span>
                                </div>
                              </div>

                              {/* Right Paper Pages (3D Thickness Edge) */}
                              <div
                                className="h-[96%] my-auto rounded-r-xs"
                                style={{
                                  width: '10px',
                                  background: 'repeating-linear-gradient(to right, #FBF8EE 0px, #EFE8D6 1px, #DFD4BE 2px)',
                                  boxShadow: 'inset 0 0 3px rgba(0,0,0,0.4)',
                                  transform: 'skewY(7deg)',
                                  transformOrigin: 'left center',
                                }}
                              />
                            </div>

                            {/* Floating Action Toolbar attached below 3D Book */}
                            <div
                              className="mt-3 flex items-center justify-center gap-1.5 p-1.5 rounded-full bg-slate-900/95 backdrop-blur-md border border-amber-400/35 shadow-2xl relative z-30"
                              style={{ width: `${COVER_W}px` }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Read Button */}
                              {hasText ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/read/${book.id}`)}
                                  className="flex-1 py-1 px-2 rounded-full font-bold text-[11px] text-white flex items-center justify-center gap-1 transition-all active:scale-95 shadow-md"
                                  style={{ background: '#005494' }}
                                  title="Кітапты оқу"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  Оқу
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="flex-1 py-1 px-2 rounded-full font-bold text-[11px] text-slate-400 flex items-center justify-center gap-1 cursor-not-allowed opacity-60"
                                  style={{ background: '#334155', border: '1px solid #475569' }}
                                  title="Электронды кітап нұсқасы жоқ"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  Оқу
                                </button>
                              )}

                              {/* Listen Button */}
                              {hasAudio ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onPlayAudio(book);
                                    navigate(`/listen/${book.id}`);
                                  }}
                                  className="flex-1 py-1 px-2 rounded-full font-bold text-[11px] text-white flex items-center justify-center gap-1 transition-all active:scale-95 shadow-md"
                                  style={{ background: '#EF7E00' }}
                                  title="Аудионы тыңдау"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Тыңдау
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="flex-1 py-1 px-2 rounded-full font-bold text-[11px] text-slate-400 flex items-center justify-center gap-1 cursor-not-allowed opacity-60"
                                  style={{ background: '#334155', border: '1px solid #475569' }}
                                  title="Аудио нұсқасы жоқ"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Тыңдау
                                </button>
                              )}

                              {/* More Options Trigger */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuBookId(isMenuOpen ? null : String(book.id));
                                }}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-white/15 hover:bg-white/25 active:scale-95 transition-all"
                                title="Қосымша әрекеттер"
                              >
                                <MoreVertical className="w-3 h-3" />
                              </button>

                              {/* Status Popover Menu */}
                              {isMenuOpen && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute bottom-11 right-0 bg-white rounded-xl p-1.5 shadow-2xl border border-slate-200 z-50 min-w-[170px]"
                                >
                                  <div className="text-[10px] font-extrabold text-slate-400 px-2 py-1 uppercase tracking-wider">
                                    Күйді өзгерту
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleChangeStatus(String(book.id), 'reading', book.title);
                                      setActiveMenuBookId(null);
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 rounded-md flex items-center gap-2"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-[#005494]" />
                                    Оқып жатырмын
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleChangeStatus(String(book.id), 'completed', book.title);
                                      setActiveMenuBookId(null);
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 rounded-md flex items-center gap-2"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Оқып болдым
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleChangeStatus(String(book.id), 'want_to_read', book.title);
                                      setActiveMenuBookId(null);
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-amber-50 rounded-md flex items-center gap-2"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-[#EF7E00]" />
                                    Енді оқимын
                                  </button>
                                  <div className="h-px bg-slate-100 my-1" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleRemove(String(book.id), book.title);
                                      setActiveMenuBookId(null);
                                      setSelectedBookId(null);
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Сөреден өшіру
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)' }}
                        />
                        <div
                          className="w-2.5 h-4.5 rounded-full shadow-[0_0_12px_#F59E0B]"
                          style={{ background: 'radial-gradient(ellipse at 50% 80%, #FFFFFF 0%, #FDE047 40%, #EA580C 100%)' }}
                        />
                      </div>
                      {/* Candle Wax Body */}
                      <div
                        className="w-4 h-12 rounded-t-xs shadow-md border-t border-amber-200/40"
                        style={{ background: 'linear-gradient(180deg, #FAF3E0 0%, #D8C8B0 100%)' }}
                      />
                    </div>
                  )}
                </div>

                {/* 3D Realistic Heavy Wood Shelf Plank */}
                <div className="w-full relative mt-[-2px] z-30">
                  {/* Top Edge Highlight */}
                  <div
                    className="h-2 w-full rounded-t-sm"
                    style={{
                      background:
                        'linear-gradient(90deg, #8B5A2B 0%, #C48A54 25%, #E5B382 50%, #C48A54 75%, #8B5A2B 100%)',
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.45)',
                    }}
                  />
                  {/* Front Bevel & Shadow */}
                  <div
                    className="h-7 sm:h-8 w-full rounded-b-xl shadow-[0_16px_30px_rgba(0,0,0,0.85)] flex items-center justify-between px-6 border-t border-amber-900/60 relative overflow-hidden"
                    style={{ background: 'linear-gradient(180deg, #5C3314 0%, #3D1E08 55%, #241104 100%)' }}
                  >
                    <div className="w-16 h-0.5 bg-black/25 rounded-full" />
                    <div className="w-24 h-0.5 bg-black/20 rounded-full" />
                    <div className="w-20 h-0.5 bg-black/25 rounded-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
