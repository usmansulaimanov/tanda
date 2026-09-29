import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, Play, Info, X } from 'lucide-react';
import { Book } from '../../../types';
import { BookShelfStatus } from '../../../store/useMyBooksStore';
import tandaPremiumWhite from '../../../assets/tanda-premium-white.png';

interface ShelfSpineViewProps {
  items: { book: Book; record: { bookId: string | number; status: BookShelfStatus } }[];
  handleChangeStatus: (bookId: string, status: BookShelfStatus, title: string) => void;
  handleRemove: (bookId: string, title: string) => void;
  onPlayAudio: (book: Book) => void;
}

// Curated authentic leather / cloth book spine color palettes
const SPINE_PALETTES = [
  { bg: 'linear-gradient(180deg, #7A5C22 0%, #5E4616 100%)', accent: '#F6CD6A', ribbon: '#ECC060', cover: 'linear-gradient(145deg, #8B6914 0%, #6B4F10 40%, #4A3508 100%)' },
  { bg: 'linear-gradient(180deg, #1C4332 0%, #112E21 100%)', accent: '#A7F3D0', ribbon: '#FCD34D', cover: 'linear-gradient(145deg, #1A4D38 0%, #113326 40%, #0A1F18 100%)' },
  { bg: 'linear-gradient(180deg, #1E3A5F 0%, #10243D 100%)', accent: '#BAE6FD', ribbon: '#EF7E00', cover: 'linear-gradient(145deg, #1E4170 0%, #12295A 40%, #0A1A3D 100%)' },
  { bg: 'linear-gradient(180deg, #5E1928 0%, #3D0F19 100%)', accent: '#FECDD3', ribbon: '#FCD34D', cover: 'linear-gradient(145deg, #701A2E 0%, #4D0F1E 40%, #320A14 100%)' },
  { bg: 'linear-gradient(180deg, #6B3419 0%, #48200D 100%)', accent: '#FED7AA', ribbon: '#F6CD6A', cover: 'linear-gradient(145deg, #7D3A1A 0%, #562411 40%, #381608 100%)' },
  { bg: 'linear-gradient(180deg, #4A2346 0%, #30142D 100%)', accent: '#F5D0FE', ribbon: '#ECC060', cover: 'linear-gradient(145deg, #5A2554 0%, #3A1637 40%, #240E22 100%)' },
  { bg: 'linear-gradient(180deg, #2B3545 0%, #1A212D 100%)', accent: '#E2E8F0', ribbon: '#EF7E00', cover: 'linear-gradient(145deg, #2E3F52 0%, #1C2A3A 40%, #111C27 100%)' },
];

const BOOKS_PER_SHELF = 5;

// 3D Book Cover Modal — shown when a book is tapped on the shelf
const BookCoverModal: React.FC<{
  item: { book: Book; record: { bookId: string | number; status: BookShelfStatus } };
  palette: typeof SPINE_PALETTES[0];
  isClosing: boolean;
  onClose: () => void;
  onPlay: (book: Book) => void;
  navigate: ReturnType<typeof useNavigate>;
}> = ({ item, palette, isClosing, onClose, onPlay, navigate }) => {
  const { book, record } = item;
  const statusLabel =
    record.status === 'reading' ? 'Қазір оқуда' :
    record.status === 'completed' ? 'Оқылып бітті' :
    'Енді оқимын';
  const statusColor =
    record.status === 'reading' ? { bg: 'rgba(0,84,148,0.15)', text: '#005494' } :
    record.status === 'completed' ? { bg: 'rgba(16,185,129,0.15)', text: '#059669' } :
    { bg: 'rgba(239,126,0,0.15)', text: '#C66800' };

  return (
    <>
      {/* Backdrop — tap to close */}
      <div
        className={`fixed inset-0 z-[900] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'rgba(5, 3, 1, 0.82)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* 3D Book Card — centered */}
      <div
        className={`fixed inset-0 z-[910] flex items-center justify-center pointer-events-none`}
        style={{ perspective: '1400px' }}
      >
        <div
          className="pointer-events-auto relative"
          style={{
            animation: isClosing
              ? 'bookPutBack 0.28s cubic-bezier(0.4,0,1,1) forwards'
              : 'bookPullOut 0.42s cubic-bezier(0.16,1,0.3,1) forwards',
            transformOrigin: 'center bottom',
          }}
        >
          {/* Book 3D structure */}
          <div className="relative" style={{ filter: 'drop-shadow(0 32px 48px rgba(0,0,0,0.85))' }}>
            {/* Cover (front face) — clickable to go to book page */}
            <div
              className="relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              style={{
                width: '200px',
                height: '290px',
                background: book.gradient || palette.cover,
                borderRadius: '4px 12px 12px 4px',
                boxShadow: '4px 0 14px rgba(0,0,0,0.6), inset -2px 0 6px rgba(0,0,0,0.25)',
              }}
              onClick={() => navigate(`/book/${book.id}`)}
            >
              {/* Cover image */}
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                /* No cover — elegant fallback */
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-5">
                  {/* Decorative top ornament */}
                  <div className="w-16 h-0.5 rounded-full" style={{ background: palette.accent + '80' }} />
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.12)', border: `1.5px solid ${palette.accent}40` }}
                  >
                    <BookOpen className="w-7 h-7" style={{ color: palette.accent }} />
                  </div>
                  {/* Title */}
                  <p
                    className="text-center font-serif font-bold leading-snug"
                    style={{ color: palette.accent, fontSize: '14px', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
                  >
                    {book.title}
                  </p>
                  {/* Author */}
                  <p className="text-center text-xs opacity-70" style={{ color: palette.accent }}>
                    {book.author}
                  </p>
                  {/* Decorative bottom ornament */}
                  <div className="w-16 h-0.5 rounded-full" style={{ background: palette.accent + '80' }} />
                </div>
              )}

              {/* Light gloss effect over cover */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
              />

              {/* Premium badge — icon only */}
              {!book.isFree && (
                <div className="absolute top-2.5 left-2.5 z-10">
                  <div
                    className="flex items-center justify-center w-6 h-6 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
                  >
                    <img src={tandaPremiumWhite} alt="Premium" className="w-3.5 h-3.5 object-contain" />
                  </div>
                </div>
              )}

              {/* Status badge */}
              <div className="absolute bottom-2.5 left-2.5 z-10">
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: statusColor.bg, color: statusColor.text, backdropFilter: 'blur(4px)' }}
                >
                  {statusLabel}
                </span>
              </div>

              {/* "Tap to open" hint overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.45)' }}
              >
                <span className="text-white text-xs font-bold px-4 py-2 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                  Ашу →
                </span>
              </div>
            </div>

            {/* Spine side (left edge of the 3D book) */}
            <div
              className="absolute top-0 left-0 h-full"
              style={{
                width: '14px',
                background: palette.bg,
                borderRadius: '4px 0 0 4px',
                transform: 'translateX(-13px) skewY(0deg)',
                boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.4)',
              }}
            />

            {/* Paper pages (right edge) */}
            <div
              className="book-3d-pages absolute"
              style={{ top: '3px', right: '-9px', bottom: '3px', width: '11px' }}
            />

            {/* Paper pages (bottom edge) */}
            <div
              className="book-3d-bottom-pages absolute"
              style={{ left: '8px', right: '-1px', bottom: '-9px', height: '10px' }}
            />
          </div>

          {/* Book title & author below the cover */}
          <div className="mt-5 text-center px-2" style={{ maxWidth: '220px' }}>
            <h3 className="text-white font-extrabold text-base leading-snug line-clamp-2 drop-shadow-lg">
              {book.title}
            </h3>
            <p className="text-amber-200/80 text-xs font-medium mt-1 drop-shadow">{book.author}</p>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-2.5 justify-center">
            {(book.hasAudio || book.audioUrl) && (
              <button
                type="button"
                onClick={() => { onPlay(book); navigate(`/listen/${book.id}`); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs text-white active:scale-95 transition-all shadow-lg"
                style={{ background: '#005494', boxShadow: '0 4px 16px rgba(0,84,148,0.5)' }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Тыңдау
              </button>
            )}
            {(book.hasEbook || book.ebookUrl || book.content) && (
              <button
                type="button"
                onClick={() => navigate(`/read/${book.id}`)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs text-white active:scale-95 transition-all shadow-lg"
                style={{ background: '#059669', boxShadow: '0 4px 16px rgba(5,150,105,0.5)' }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Оқу
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/book/${book.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs active:scale-95 transition-all"
              style={{ background: 'rgba(255,255,255,0.14)', color: 'white', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <Info className="w-3.5 h-3.5" />
              Ақпарат
            </button>
          </div>
        </div>
      </div>

      {/* Close button (top right) */}
      <button
        type="button"
        onClick={onClose}
        className={`fixed top-5 right-5 z-[920] w-10 h-10 rounded-full flex items-center justify-center transition-all ${isClosing ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}
      >
        <X className="w-5 h-5" />
      </button>
    </>
  );
};

export const ShelfSpineView: React.FC<ShelfSpineViewProps> = ({
  items,
  handleChangeStatus,
  handleRemove,
  onPlayAudio,
}) => {
  const navigate = useNavigate();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Group books into shelf rows
  const shelves: typeof items[] = [];
  for (let i = 0; i < items.length; i += BOOKS_PER_SHELF) {
    shelves.push(items.slice(i, i + BOOKS_PER_SHELF));
  }

  const selectedItemIndex = items.findIndex((it) => String(it.book.id) === selectedBookId);
  const selectedItem = selectedItemIndex !== -1 ? items[selectedItemIndex] : undefined;
  const selectedIdNum = selectedItem
    ? Number(String(selectedItem.book.id).replace(/\D/g, '')) || (selectedItemIndex + 1)
    : 0;
  const selectedPalette = SPINE_PALETTES[selectedIdNum % SPINE_PALETTES.length];

  const handleSelectBook = (bookId: string) => {
    if (selectedBookId === bookId) {
      handleCloseBook();
      return;
    }
    setIsClosing(false);
    setSelectedBookId(bookId);
  };

  const handleCloseBook = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setSelectedBookId(null);
      setIsClosing(false);
    }, 280);
  };

  // Close on back navigation or escape
  useEffect(() => {
    if (!selectedBookId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCloseBook(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedBookId, isClosing]);

  return (
    <div className="w-full relative">
      {/* Bookshelf Container */}
      <div
        className="rounded-3xl p-4 sm:p-6 overflow-hidden shadow-2xl border border-amber-950/40 relative"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, #2A1D15 0%, #1A120D 70%, #120B07 100%)' }}
      >
        {/* Ambient light */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #EF7E00 0%, transparent 70%)' }}
        />

        <div className="flex flex-col gap-8 sm:gap-12 relative z-10 pt-6 sm:pt-8">
          {shelves.map((shelfItems, shelfIndex) => {
            const isLastShelf = shelfIndex === shelves.length - 1;

            return (
              <div key={shelfIndex} className="relative w-full">
                {/* Books Row */}
                <div className="flex items-end justify-start sm:justify-center gap-2 sm:gap-3.5 px-3 min-h-[235px] pt-7 pb-0 overflow-x-auto no-scrollbar">
                  {shelfItems.map(({ book, record }, bookIndex) => {
                    const idNum = Number(String(book.id).replace(/\D/g, '')) || (shelfIndex * 5 + bookIndex + 1);
                    const palette = SPINE_PALETTES[idNum % SPINE_PALETTES.length];
                    const isSelected = selectedBookId === String(book.id);

                    const heightVariations = [165, 178, 160, 185, 172];
                    const widthVariations = [46, 52, 44, 54, 48];
                    const spineHeight = heightVariations[(idNum + bookIndex) % heightVariations.length];
                    const spineWidth = widthVariations[(idNum + bookIndex) % widthVariations.length];

                    return (
                      <div
                        key={book.id}
                        onClick={() => handleSelectBook(String(book.id))}
                        style={{ height: `${spineHeight}px`, width: `${spineWidth}px` }}
                        className={`group relative shrink-0 cursor-pointer select-none rounded-t-[4px] transition-all duration-300 ease-out flex flex-col justify-between items-center origin-bottom ${
                          isSelected
                            ? 'scale-[1.04] z-30 shadow-[0_12px_28px_rgba(0,0,0,0.8),0_0_24px_rgba(245,158,11,0.55)] ring-2 ring-amber-400'
                            : 'hover:scale-[1.02] z-10 shadow-[0_6px_16px_rgba(0,0,0,0.4)]'
                        }`}
                      >
                        {/* Bookmark Ribbon */}
                        <div
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 w-3.5 h-5 rounded-t-xs z-20 shadow-xs transition-all ${
                            isSelected ? 'brightness-125 shadow-[0_0_10px_rgba(251,191,36,0.9)]' : ''
                          }`}
                          style={{
                            background: palette.ribbon,
                            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 75%, 0% 100%)',
                          }}
                        />

                        {/* Spine Base */}
                        <div className="absolute inset-0 rounded-t-[4px] overflow-hidden" style={{ background: palette.bg }}>
                          {/* 3D Lighting */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(255,255,255,0.18) 18%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.05) 80%, rgba(0,0,0,0.45) 100%)' }}
                          />
                        </div>

                        {/* Top Ridges */}
                        <div className="relative z-10 w-full pt-3 px-1">
                          <div className="w-full h-px bg-amber-200/25" />
                          <div className="w-full h-px bg-amber-200/15 mt-1" />
                        </div>

                        {/* Vertical Title */}
                        <div
                          className="relative z-10 flex-1 flex items-center justify-center py-2 px-1 max-h-[120px] overflow-hidden"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                          <span
                            className="font-serif font-bold text-xs tracking-wider text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] truncate block max-h-[110px]"
                            title={book.title}
                          >
                            {book.title}
                          </span>
                        </div>

                        {/* Bottom Ridges */}
                        <div className="relative z-10 w-full pb-2 px-1">
                          <div className="w-full h-px bg-amber-200/15 mb-1" />
                          <div className="w-full h-px bg-amber-200/25" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Candle */}
                  {(isLastShelf || shelfItems.length < BOOKS_PER_SHELF) && (
                    <div className="shrink-0 flex flex-col items-center justify-end h-28 ml-2 sm:ml-4 pb-0 z-10">
                      <div className="relative flex items-center justify-center mb-1">
                        <div
                          className="absolute w-12 h-12 rounded-full pointer-events-none -top-2 animate-pulse"
                          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)' }}
                        />
                        <div
                          className="w-2.5 h-4.5 rounded-full shadow-[0_0_12px_#F59E0B]"
                          style={{ background: 'radial-gradient(ellipse at 50% 80%, #FFFFFF 0%, #FDE047 40%, #EA580C 100%)' }}
                        />
                      </div>
                      <div
                        className="w-4 h-12 rounded-t-xs shadow-md border-t border-amber-200/40"
                        style={{ background: 'linear-gradient(180deg, #FAF3E0 0%, #D8C8B0 100%)' }}
                      />
                    </div>
                  )}
                </div>

                {/* 3D Wooden Shelf Plank */}
                <div className="w-full relative mt-[-2px] z-20">
                  <div
                    className="h-1.5 w-full rounded-t-sm"
                    style={{
                      background: 'linear-gradient(90deg, #A86B3E 0%, #DCA06B 30%, #F5C596 50%, #DCA06B 70%, #A86B3E 100%)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)',
                    }}
                  />
                  <div
                    className="h-6 sm:h-7 w-full rounded-b-lg shadow-[0_14px_24px_rgba(0,0,0,0.7)] flex items-center justify-between px-4 border-t border-amber-900/50"
                    style={{ background: 'linear-gradient(180deg, #6B3F1D 0%, #4E2C12 60%, #311909 100%)' }}
                  >
                    <div className="w-12 h-0.5 bg-black/20 rounded-full" />
                    <div className="w-20 h-0.5 bg-black/20 rounded-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3D Book Pull-out Modal */}
      {selectedItem && (
        <BookCoverModal
          item={selectedItem}
          palette={selectedPalette}
          isClosing={isClosing}
          onClose={handleCloseBook}
          onPlay={onPlayAudio}
          navigate={navigate}
        />
      )}
    </div>
  );
};
