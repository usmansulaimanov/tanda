import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, Play, Info, MoreVertical, Trash2, CheckCircle2, Bookmark, Flame } from 'lucide-react';
import { Book } from '../../../types';
import { BookShelfStatus } from '../../../store/useMyBooksStore';
import tandaPremiumWhite from '../../../assets/tanda-premium-white.png';

interface ShelfSpineViewProps {
  items: { book: Book; record: { bookId: string | number; status: BookShelfStatus } }[];
  handleChangeStatus: (bookId: string, status: BookShelfStatus, title: string) => void;
  handleRemove: (bookId: string, title: string) => void;
  onPlayAudio: (book: Book) => void;
}

// Authentic rich leather / vintage cloth palettes for book spines and covers
const SPINE_PALETTES = [
  {
    bg: 'linear-gradient(180deg, #7A5C22 0%, #5E4616 100%)',
    accent: '#F6CD6A',
    ribbon: '#ECC060',
    cover: 'linear-gradient(145deg, #8B6914 0%, #6B4F10 40%, #4A3508 100%)',
    glow: 'rgba(236, 192, 96, 0.4)',
  },
  {
    bg: 'linear-gradient(180deg, #1C4332 0%, #112E21 100%)',
    accent: '#A7F3D0',
    ribbon: '#FCD34D',
    cover: 'linear-gradient(145deg, #1A4D38 0%, #113326 40%, #0A1F18 100%)',
    glow: 'rgba(167, 243, 208, 0.35)',
  },
  {
    bg: 'linear-gradient(180deg, #1E3A5F 0%, #10243D 100%)',
    accent: '#BAE6FD',
    ribbon: '#EF7E00',
    cover: 'linear-gradient(145deg, #1E4170 0%, #12295A 40%, #0A1A3D 100%)',
    glow: 'rgba(0, 84, 148, 0.4)',
  },
  {
    bg: 'linear-gradient(180deg, #5E1928 0%, #3D0F19 100%)',
    accent: '#FECDD3',
    ribbon: '#FCD34D',
    cover: 'linear-gradient(145deg, #701A2E 0%, #4D0F1E 40%, #320A14 100%)',
    glow: 'rgba(254, 205, 211, 0.35)',
  },
  {
    bg: 'linear-gradient(180deg, #6B3419 0%, #48200D 100%)',
    accent: '#FED7AA',
    ribbon: '#F6CD6A',
    cover: 'linear-gradient(145deg, #7D3A1A 0%, #562411 40%, #381608 100%)',
    glow: 'rgba(246, 205, 106, 0.4)',
  },
  {
    bg: 'linear-gradient(180deg, #4A2346 0%, #30142D 100%)',
    accent: '#F5D0FE',
    ribbon: '#ECC060',
    cover: 'linear-gradient(145deg, #5A2554 0%, #3A1637 40%, #240E22 100%)',
    glow: 'rgba(245, 208, 254, 0.35)',
  },
  {
    bg: 'linear-gradient(180deg, #2B3545 0%, #1A212D 100%)',
    accent: '#E2E8F0',
    ribbon: '#EF7E00',
    cover: 'linear-gradient(145deg, #2E3F52 0%, #1C2A3A 40%, #111C27 100%)',
    glow: 'rgba(226, 232, 240, 0.35)',
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
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeMenuBookId, setActiveMenuBookId] = useState<string | null>(null);
  const shelfContainerRef = useRef<HTMLDivElement>(null);

  // Group books into shelves
  const shelves: typeof items[] = [];
  for (let i = 0; i < items.length; i += BOOKS_PER_SHELF) {
    shelves.push(items.slice(i, i + BOOKS_PER_SHELF));
  }

  // Close active book dropdown menu when clicked outside
  useEffect(() => {
    const handleClick = () => setActiveMenuBookId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="w-full relative select-none">
      {/* 3D Bookshelf Master Container */}
      <div
        ref={shelfContainerRef}
        className="rounded-3xl p-4 sm:p-8 overflow-hidden shadow-2xl border border-amber-950/40 relative"
        style={{
          background: 'radial-gradient(ellipse at 50% 25%, #2A1D15 0%, #18110C 65%, #0F0906 100%)',
        }}
        onClick={(e) => {
          // If clicked directly on the background, deselect active book
          if (e.target === e.currentTarget) {
            setActiveBookId(null);
          }
        }}
      >
        {/* Ambient Warm Candlelight Glows */}
        <div
          className="absolute -top-20 left-1/4 w-96 h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)' }}
        />
        <div
          className="absolute -top-20 right-1/4 w-96 h-96 rounded-full pointer-events-none opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #EF7E00 0%, transparent 70%)' }}
        />

        {/* Header note for interactive 3D shelf */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 px-2 text-amber-200/70 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>3D Интерактивті сөре — кітаптың үстіне апарыңыз немесе басыңыз</span>
          </div>
          <span className="text-[11px] text-amber-200/50 hidden sm:inline">
            Барлығы: {items.length} кітап
          </span>
        </div>

        {/* Shelves Stack */}
        <div className="flex flex-col gap-10 sm:gap-14 relative z-10 pt-4">
          {shelves.map((shelfItems, shelfIndex) => {
            const isLastShelf = shelfIndex === shelves.length - 1;

            return (
              <div key={shelfIndex} className="relative w-full">
                {/* Books Row with 3D Perspective */}
                <div
                  className="flex items-end justify-start sm:justify-center gap-2 sm:gap-4 px-2 sm:px-4 min-h-[290px] sm:min-h-[310px] pb-0 overflow-x-auto no-scrollbar"
                  style={{ perspective: '1600px', perspectiveOrigin: '50% 80%' }}
                >
                  {shelfItems.map(({ book, record }, bookIndex) => {
                    const idNum = Number(String(book.id).replace(/\D/g, '')) || (shelfIndex * 6 + bookIndex + 1);
                    const palette = SPINE_PALETTES[idNum % SPINE_PALETTES.length];
                    const isExpanded = activeBookId === String(book.id);

                    // Formats existence
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

                    // Varied spine heights and widths for realistic library look
                    const heightVariations = [215, 230, 205, 238, 220, 226];
                    const spineWidthVariations = [46, 52, 44, 54, 48, 50];
                    const baseHeight = heightVariations[(idNum + bookIndex) % heightVariations.length];
                    const spineWidth = spineWidthVariations[(idNum + bookIndex) % spineWidthVariations.length];
                    const expandedWidth = 205; // Full cover width when pulled out and turned

                    const statusLabel =
                      record.status === 'reading' ? 'Қазір оқуда' :
                      record.status === 'completed' ? 'Оқылып бітті' :
                      'Енді оқимын';

                    const isMenuOpen = activeMenuBookId === String(book.id);

                    return (
                      <div
                        key={book.id}
                        onMouseEnter={() => setActiveBookId(String(book.id))}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isExpanded) {
                            setActiveBookId(String(book.id));
                          }
                        }}
                        style={{
                          width: isExpanded ? `${expandedWidth}px` : `${spineWidth}px`,
                          height: `${baseHeight + (isExpanded ? 30 : 0)}px`,
                          transition: 'width 0.42s cubic-bezier(0.16, 1, 0.3, 1), height 0.42s cubic-bezier(0.16, 1, 0.3, 1)',
                          zIndex: isExpanded ? 40 : 10,
                        }}
                        className="shrink-0 relative flex flex-col justify-end items-center cursor-pointer group"
                      >
                        {/* 3D Book Object Container */}
                        <div
                          className="relative w-full h-full flex flex-col justify-end items-center"
                          style={{
                            transformStyle: 'preserve-3d',
                            transform: isExpanded
                              ? 'translateY(-24px) translateZ(75px) scale(1.03)'
                              : 'translateY(0) translateZ(0) scale(1)',
                            transition: 'transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), filter 0.42s ease',
                            filter: isExpanded
                              ? `drop-shadow(0 24px 36px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 20px ${palette.glow})`
                              : 'drop-shadow(0 8px 14px rgba(0, 0, 0, 0.6))',
                          }}
                        >
                          {/* ========================================================= */}
                          {/* STATE A: VERTICAL BOOK SPINE (When standing in the shelf) */}
                          {/* ========================================================= */}
                          <div
                            className={`absolute inset-0 rounded-t-[4px] flex flex-col justify-between items-center overflow-hidden transition-opacity duration-300 ${
                              isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
                            }`}
                            style={{
                              background: palette.bg,
                              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), inset -3px 0 6px rgba(0,0,0,0.5)',
                            }}
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
                                  'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.5) 100%)',
                              }}
                            />

                            {/* Top Golden Ridges */}
                            <div className="relative z-10 w-full pt-3 px-1">
                              <div className="w-full h-[1.5px] bg-amber-200/35 rounded-full" />
                              <div className="w-full h-px bg-amber-200/20 mt-1 rounded-full" />
                            </div>

                            {/* Vertical Book Title */}
                            <div
                              className="relative z-10 flex-1 flex items-center justify-center py-2 px-1 max-h-[140px] overflow-hidden"
                              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                              <span
                                className="font-serif font-bold text-xs tracking-wider text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] truncate block max-h-[130px]"
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

                          {/* ========================================================= */}
                          {/* STATE B: FULL 3D FRONT COVER (When pulled out and turned) */}
                          {/* ========================================================= */}
                          <div
                            className={`w-full h-full rounded-t-md rounded-b-[2px] overflow-hidden relative transition-all duration-400 ${
                              isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                            }`}
                            style={{
                              background: book.gradient || palette.cover,
                              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                            }}
                          >
                            {/* Front cover image */}
                            {book.coverImage ? (
                              <img
                                src={book.coverImage}
                                alt={book.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover rounded-t-md"
                              />
                            ) : (
                              /* Stylized gold embossed leather cover fallback */
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

                            {/* Realistic Sheen / Gloss Overlay */}
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background:
                                  'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)',
                              }}
                            />

                            {/* Left spine shadow / fold */}
                            <div
                              className="absolute top-0 left-0 bottom-0 w-3 pointer-events-none"
                              style={{
                                background:
                                  'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)',
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

                            {/* Quick Action Overlay Bar on Book Hover */}
                            <div
                              className="absolute inset-x-0 bottom-0 p-2 z-20 flex items-center justify-center gap-1.5"
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Read Button */}
                              {hasText ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/read/${book.id}`)}
                                  className="flex-1 py-1.5 px-2 rounded-full font-bold text-[11px] text-white flex items-center justify-center gap-1 transition-all active:scale-95"
                                  style={{ background: '#005494', boxShadow: '0 2px 8px rgba(0,84,148,0.5)' }}
                                  title="Кітапты оқу"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  Оқу
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="flex-1 py-1.5 px-2 rounded-full font-bold text-[11px] text-slate-400 flex items-center justify-center gap-1 cursor-not-allowed opacity-60"
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
                                  className="flex-1 py-1.5 px-2 rounded-full font-bold text-[11px] text-white flex items-center justify-center gap-1 transition-all active:scale-95"
                                  style={{ background: '#EF7E00', boxShadow: '0 2px 8px rgba(239,126,0,0.5)' }}
                                  title="Аудионы тыңдау"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Тыңдау
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="flex-1 py-1.5 px-2 rounded-full font-bold text-[11px] text-slate-400 flex items-center justify-center gap-1 cursor-not-allowed opacity-60"
                                  style={{ background: '#334155', border: '1px solid #475569' }}
                                  title="Аудио нұсқасы жоқ"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Тыңдау
                                </button>
                              )}

                              {/* More / Status Menu Trigger */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuBookId(isMenuOpen ? null : String(book.id));
                                }}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-white/15 hover:bg-white/25 active:scale-95 transition-all"
                                title="Қосымша әрекеттер"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Dropdown Menu for Status Changes inside Active Book */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-12 right-2 bg-white rounded-xl p-1.5 shadow-2xl border border-slate-200 z-50 min-w-[170px]"
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
                                    setActiveBookId(null);
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
                      </div>
                    );
                  })}

                  {/* Atmospheric Candle on Shelf */}
                  {(isLastShelf || shelfItems.length < BOOKS_PER_SHELF) && (
                    <div className="shrink-0 flex flex-col items-center justify-end h-28 ml-2 sm:ml-4 pb-0 z-10 select-none">
                      {/* Candle Flame with realistic pulsation */}
                      <div className="relative flex items-center justify-center mb-1">
                        <div
                          className="absolute w-12 h-12 rounded-full pointer-events-none -top-2 animate-pulse"
                          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)' }}
                        />
                        <div
                          className="w-2.5 h-4.5 rounded-full shadow-[0_0_12px_#F59E0B] animate-[bounce_2s_infinite]"
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
                  {/* Front Bevel & Under Shadow */}
                  <div
                    className="h-7 sm:h-8 w-full rounded-b-xl shadow-[0_16px_30px_rgba(0,0,0,0.85)] flex items-center justify-between px-6 border-t border-amber-900/60 relative overflow-hidden"
                    style={{ background: 'linear-gradient(180deg, #5C3314 0%, #3D1E08 55%, #241104 100%)' }}
                  >
                    {/* Wood grain subtleties */}
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
