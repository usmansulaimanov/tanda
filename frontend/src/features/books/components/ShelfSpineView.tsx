import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Play, Trash2, X, Info, CheckCircle, Clock, Bookmark, ChevronRight } from 'lucide-react';
import { Book } from '../../../types';
import { BookShelfStatus } from '../../../store/useMyBooksStore';
import { TandaPremiumBadge } from '../../../components/ui/TandaPremiumBadge';

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
      {/* Bookshelf Master Container */}
      <div
        className="rounded-3xl p-4 sm:p-8 overflow-hidden shadow-2xl border border-amber-950/40 relative"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, #2D1E16 0%, #19120D 60%, #0D0805 100%)',
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
            <span>3D Кітап сөресі — кітапты басқанда карточкасы ашылады</span>
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
                            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset -3px 0 6px rgba(0,0,0,0.55)',
                          }}
                          className="relative rounded-t-[4px] flex flex-col justify-between items-center overflow-hidden transition-all duration-300 transform group-hover:-translate-y-3 group-hover:scale-105 group-hover:shadow-[0_16px_32px_rgba(0,0,0,0.85)]"
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
              {/* Cover Image */}
              <div
                className="w-24 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden shadow-lg shrink-0 relative"
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

                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug line-clamp-2">
                  {activeBook.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-0.5 truncate">
                  {activeBook.author}
                </p>

                {/* Current Status Badge */}
                <div className="mt-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs"
                    style={{
                      background:
                        activeRecord.status === 'reading'
                          ? 'rgba(0, 84, 148, 0.1)'
                          : activeRecord.status === 'completed'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(239, 126, 0, 0.12)',
                      color:
                        activeRecord.status === 'reading'
                          ? '#005494'
                          : activeRecord.status === 'completed'
                          ? '#059669'
                          : '#EF7E00',
                    }}
                  >
                    {activeRecord.status === 'reading' && <Clock className="w-3 h-3" />}
                    {activeRecord.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                    {activeRecord.status === 'want_to_read' && <Bookmark className="w-3 h-3" />}
                    {activeRecord.status === 'reading' && 'Қазір оқуда'}
                    {activeRecord.status === 'completed' && 'Оқылып бітті'}
                    {activeRecord.status === 'want_to_read' && 'Енді оқимын'}
                  </span>
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Сөредегі күйін өзгерту:
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    handleChangeStatus(String(activeBook.id), 'reading', activeBook.title);
                    setModalItem({
                      ...modalItem,
                      record: { ...activeRecord, status: 'reading' },
                    });
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                    activeRecord.status === 'reading'
                      ? 'bg-[#005494] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Оқуда
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleChangeStatus(String(activeBook.id), 'completed', activeBook.title);
                    setModalItem({
                      ...modalItem,
                      record: { ...activeRecord, status: 'completed' },
                    });
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                    activeRecord.status === 'completed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  Оқылды
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleChangeStatus(String(activeBook.id), 'want_to_read', activeBook.title);
                    setModalItem({
                      ...modalItem,
                      record: { ...activeRecord, status: 'want_to_read' },
                    });
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                    activeRecord.status === 'want_to_read'
                      ? 'bg-[#EF7E00] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Bookmark className="w-3 h-3" />
                  Енді оқимын
                </button>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
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
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Оқу (жоқ)
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
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Тыңдау (жоқ)
                  </button>
                )}
              </div>

              {/* Bottom secondary row: Details link & Remove button */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModalItem(null);
                    navigate(`/book/${activeBook.id}`);
                  }}
                  className="text-xs font-bold text-[#005494] hover:underline flex items-center gap-1 py-1"
                >
                  <Info className="w-3.5 h-3.5" />
                  Толық ақпарат
                  <ChevronRight className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleRemove(String(activeBook.id), activeBook.title);
                    setModalItem(null);
                  }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Сөреден өшіру
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
