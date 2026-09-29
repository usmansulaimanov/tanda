import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, Play, CheckCircle2, Clock, Bookmark, Info, ChevronRight, X } from 'lucide-react';
import { Book } from '../../../types';
import { BookShelfStatus } from '../../../store/useMyBooksStore';
import { TandaPremiumBadge } from '../../../components/ui/TandaPremiumBadge';

interface ShelfSpineViewProps {
  items: { book: Book; record: { bookId: string | number; status: BookShelfStatus } }[];
  handleChangeStatus: (bookId: string, status: BookShelfStatus, title: string) => void;
  handleRemove: (bookId: string, title: string) => void;
  onPlayAudio: (book: Book) => void;
}

// Curated authentic leather / cloth book spine color palettes
const SPINE_PALETTES = [
  {
    bg: 'linear-gradient(180deg, #7A5C22 0%, #5E4616 100%)', // Olive Gold
    accent: '#F6CD6A',
    ribbon: '#ECC060',
  },
  {
    bg: 'linear-gradient(180deg, #1C4332 0%, #112E21 100%)', // Emerald Green (as in screenshot)
    accent: '#A7F3D0',
    ribbon: '#FCD34D',
  },
  {
    bg: 'linear-gradient(180deg, #1E3A5F 0%, #10243D 100%)', // Royal Sapphire
    accent: '#BAE6FD',
    ribbon: '#EF7E00',
  },
  {
    bg: 'linear-gradient(180deg, #5E1928 0%, #3D0F19 100%)', // Burgundy Wine
    accent: '#FECDD3',
    ribbon: '#FCD34D',
  },
  {
    bg: 'linear-gradient(180deg, #6B3419 0%, #48200D 100%)', // Terracotta Leather
    accent: '#FED7AA',
    ribbon: '#F6CD6A',
  },
  {
    bg: 'linear-gradient(180deg, #4A2346 0%, #30142D 100%)', // Deep Plum
    accent: '#F5D0FE',
    ribbon: '#ECC060',
  },
  {
    bg: 'linear-gradient(180deg, #2B3545 0%, #1A212D 100%)', // Dark Navy Slate
    accent: '#E2E8F0',
    ribbon: '#EF7E00',
  },
];

// Split books into shelves of ~5 to 6 books each for mobile screen width
const BOOKS_PER_SHELF = 5;

export const ShelfSpineView: React.FC<ShelfSpineViewProps> = ({
  items,
  handleChangeStatus,
  handleRemove,
  onPlayAudio,
}) => {
  const navigate = useNavigate();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  // Group books into shelf rows
  const shelves: typeof items[] = [];
  for (let i = 0; i < items.length; i += BOOKS_PER_SHELF) {
    shelves.push(items.slice(i, i + BOOKS_PER_SHELF));
  }

  const selectedItem = items.find((it) => String(it.book.id) === selectedBookId);

  return (
    <div className="w-full relative">
      {/* Bookshelf Container with rich warm atmosphere */}
      <div
        className="rounded-3xl p-4 sm:p-6 overflow-hidden shadow-2xl border border-amber-950/40 relative"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #2A1D15 0%, #1A120D 70%, #120B07 100%)',
        }}
      >
        {/* Soft background ambient lighting */}
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

                    // Dynamic realistic height & width variation
                    const heightVariations = [165, 178, 160, 185, 172];
                    const widthVariations = [46, 52, 44, 54, 48];
                    const spineHeight = heightVariations[(idNum + bookIndex) % heightVariations.length];
                    const spineWidth = widthVariations[(idNum + bookIndex) % widthVariations.length];

                    return (
                      <div
                        key={book.id}
                        onClick={() => {
                          setSelectedBookId(isSelected ? null : String(book.id));
                        }}
                        style={{
                          height: `${spineHeight}px`,
                          width: `${spineWidth}px`,
                        }}
                        className={`group relative shrink-0 cursor-pointer select-none rounded-t-[4px] transition-all duration-300 ease-out flex flex-col justify-between items-center origin-bottom ${
                          isSelected
                            ? 'scale-[1.04] z-30 shadow-[0_12px_28px_rgba(0,0,0,0.8),0_0_24px_rgba(245,158,11,0.55)] ring-2 ring-amber-400'
                            : 'hover:scale-[1.02] z-10 shadow-[0_6px_16px_rgba(0,0,0,0.4)]'
                        }`}
                      >
                        {/* Bookmark Ribbon at Top */}
                        <div
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 w-3.5 h-5 rounded-t-xs z-20 shadow-xs transition-all ${
                            isSelected ? 'shadow-[0_0_10px_rgba(251,191,36,0.8)] brightness-110' : ''
                          }`}
                          style={{
                            background: palette.ribbon,
                            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 75%, 0% 100%)',
                          }}
                        />

                        {/* Spine Base Background & 3D Cylindrical Shader */}
                        <div
                          className="absolute inset-0 rounded-t-[3px] overflow-hidden"
                          style={{ background: palette.bg }}
                        >
                          {/* 3D Cylindrical Light Reflections */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background:
                                'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(255,255,255,0.18) 18%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.05) 80%, rgba(0,0,0,0.45) 100%)',
                            }}
                          />
                        </div>

                        {/* Top Embossed Ridges (бинтики) */}
                        <div className="relative z-10 w-full pt-3 px-1">
                          <div className="w-full h-px bg-amber-200/25 shadow-xs" />
                          <div className="w-full h-px bg-amber-200/15 mt-1" />
                        </div>

                        {/* Vertical Book Title */}
                        <div
                          className="relative z-10 flex-1 flex items-center justify-center py-2 px-1 max-h-[120px] overflow-hidden"
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                          }}
                        >
                          <span
                            className="font-serif font-bold text-xs tracking-wider text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] truncate block max-h-[110px]"
                            title={book.title}
                          >
                            {book.title}
                          </span>
                        </div>

                        {/* Bottom Embossed Ridges */}
                        <div className="relative z-10 w-full pb-2 px-1">
                          <div className="w-full h-px bg-amber-200/15 mb-1" />
                          <div className="w-full h-px bg-amber-200/25 shadow-xs" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Cozy Shelf Candle at the end of the last shelf (or shelf with empty room) */}
                  {(isLastShelf || shelfItems.length < BOOKS_PER_SHELF) && (
                    <div className="shrink-0 flex flex-col items-center justify-end h-28 ml-2 sm:ml-4 pb-0 z-10">
                      {/* Candle Flame & Warm Glow */}
                      <div className="relative flex items-center justify-center mb-1">
                        <div
                          className="absolute w-12 h-12 rounded-full pointer-events-none -top-2 animate-pulse"
                          style={{
                            background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)',
                          }}
                        />
                        <div
                          className="w-2.5 h-4.5 rounded-full shadow-[0_0_12px_#F59E0B]"
                          style={{
                            background: 'radial-gradient(ellipse at 50% 80%, #FFFFFF 0%, #FDE047 40%, #EA580C 100%)',
                          }}
                        />
                      </div>
                      {/* Candle Wax Body */}
                      <div
                        className="w-4 h-12 rounded-t-xs shadow-md border-t border-amber-200/40"
                        style={{
                          background: 'linear-gradient(180deg, #FAF3E0 0%, #D8C8B0 100%)',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 3D Wooden Shelf Plank */}
                <div className="w-full relative mt-[-2px] z-20">
                  {/* Top Wooden Highlight */}
                  <div
                    className="h-1.5 w-full rounded-t-sm"
                    style={{
                      background: 'linear-gradient(90deg, #A86B3E 0%, #DCA06B 30%, #F5C596 50%, #DCA06B 70%, #A86B3E 100%)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)',
                    }}
                  />
                  {/* Shelf Front Board */}
                  <div
                    className="h-6 sm:h-7 w-full rounded-b-lg shadow-[0_14px_24px_rgba(0,0,0,0.7)] flex items-center justify-between px-4 border-t border-amber-900/50"
                    style={{
                      background: 'linear-gradient(180deg, #6B3F1D 0%, #4E2C12 60%, #311909 100%)',
                    }}
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

      {/* Floating Interactive Detail Drawer when a book is tapped & lifted */}
      {selectedItem && (
        <div className="mt-4 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xl transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              {/* Cover thumbnail */}
              <div
                className="w-14 h-20 rounded-xl overflow-hidden shadow-md shrink-0 relative"
                style={{ background: selectedItem.book.gradient || '#005494' }}
              >
                {selectedItem.book.coverImage && (
                  <img
                    src={selectedItem.book.coverImage}
                    alt={selectedItem.book.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}
                {!selectedItem.book.isFree && (
                  <div className="absolute top-1 left-1 scale-75 origin-top-left">
                    <TandaPremiumBadge />
                  </div>
                )}
              </div>

              {/* Title & Author */}
              <div className="min-w-0 flex-1">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1"
                  style={{
                    background:
                      selectedItem.record.status === 'reading'
                        ? 'rgba(0, 84, 148, 0.1)'
                        : selectedItem.record.status === 'completed'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(239, 126, 0, 0.12)',
                    color:
                      selectedItem.record.status === 'reading'
                        ? 'var(--blue)'
                        : selectedItem.record.status === 'completed'
                        ? '#059669'
                        : 'var(--orange)',
                  }}
                >
                  {selectedItem.record.status === 'reading' && 'Қазір оқуда'}
                  {selectedItem.record.status === 'completed' && 'Оқылып бітті'}
                  {selectedItem.record.status === 'want_to_read' && 'Енді оқимын'}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 truncate">
                  {selectedItem.book.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {selectedItem.book.author}
                </p>
              </div>
            </div>

            {/* Close detail drawer */}
            <button
              type="button"
              onClick={() => setSelectedBookId(null)}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons for selected book */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
            {/* Audio action */}
            {selectedItem.book.hasAudio || selectedItem.book.audioUrl ? (
              <button
                type="button"
                onClick={() => {
                  onPlayAudio(selectedItem.book);
                  navigate(`/listen/${selectedItem.book.id}`);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#005494] text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Тыңдау
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 font-medium text-xs cursor-not-allowed"
              >
                <Headphones className="w-3.5 h-3.5" />
                Аудио жоқ
              </button>
            )}

            {/* Read action */}
            {selectedItem.book.hasEbook || selectedItem.book.ebookUrl || selectedItem.book.content ? (
              <button
                type="button"
                onClick={() => navigate(`/read/${selectedItem.book.id}`)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Оқу
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 font-medium text-xs cursor-not-allowed"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Э-кітап жоқ
              </button>
            )}

            {/* Details page */}
            <button
              type="button"
              onClick={() => navigate(`/book/${selectedItem.book.id}`)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-95 transition-all"
            >
              <Info className="w-3.5 h-3.5" />
              Ақпарат
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
