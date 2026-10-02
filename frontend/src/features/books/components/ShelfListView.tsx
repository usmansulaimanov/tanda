import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, MoreVertical, Play, CheckCircle2, Clock, Bookmark, Trash2 } from 'lucide-react';
import { Book } from '../../../types';
import { BookShelfStatus, useMyBooksStore } from '../../../store/useMyBooksStore';
import { TandaPremiumBadge } from '../../../components/ui/TandaPremiumBadge';

interface ShelfListViewProps {
  items: { book: Book; record: { bookId: string | number; status: BookShelfStatus } }[];
  activeMenuBookId: string | null;
  setActiveMenuBookId: (id: string | null) => void;
  handleToggleStatus: (bookId: string, status: BookShelfStatus, title: string) => void;
  handleRemove: (bookId: string, title: string) => void;
  onPlayAudio: (book: Book) => void;
}

export const ShelfListView: React.FC<ShelfListViewProps> = ({
  items,
  activeMenuBookId,
  setActiveMenuBookId,
  handleToggleStatus,
  handleRemove,
  onPlayAudio,
}) => {
  const navigate = useNavigate();
  const { hasStatus } = useMyBooksStore();

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {items.map(({ book, record }) => {
        const isMenuOpen = activeMenuBookId === String(book.id);
        const isReadingActive = hasStatus(String(book.id), 'reading');
        const isCompletedActive = hasStatus(String(book.id), 'completed');
        const isWantToReadActive = hasStatus(String(book.id), 'want_to_read');

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

        return (
          <div
            key={book.id}
            onClick={() => navigate(`/book/${book.id}`)}
            className="group relative bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-3 cursor-pointer select-none"
          >
            {/* Book Cover Thumbnail */}
            <div
              className="relative w-14 h-20 sm:w-16 sm:h-22 rounded-xl overflow-hidden shrink-0 shadow-xs"
              style={{
                background: book.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
              }}
            >
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/70">
                  <BookOpen className="w-6 h-6" />
                </div>
              )}
              {!book.isFree && (
                <>
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-[5]" />
                  <TandaPremiumBadge size="xs" position="bottom-center" />
                </>
              )}
            </div>

            {/* Book Metadata */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                {isReadingActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#005494]">
                    Қазір оқуда
                  </span>
                )}
                {isCompletedActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Оқылып бітті
                  </span>
                )}
                {isWantToReadActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Енді оқимын
                  </span>
                )}

                {hasAudio && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                    <Headphones className="w-3 h-3 text-[#005494]" />
                    Аудио
                  </span>
                )}
                {hasText && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                    <BookOpen className="w-3 h-3 text-emerald-600" />
                    Э-кітап
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-900 truncate leading-snug">
                {book.title}
              </h4>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {book.author}
              </p>
            </div>

            {/* Quick Actions */}
            <div
              className="flex items-center gap-1.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {hasAudio && (
                <button
                  type="button"
                  onClick={() => {
                    onPlayAudio(book);
                    navigate(`/listen/${book.id}`);
                  }}
                  className="w-9 h-9 rounded-full bg-[#005494] text-white flex items-center justify-center hover:bg-[#004377] active:scale-90 transition-all shadow-xs"
                  title="Аудионы тыңдау"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              )}

              {hasText && (
                <button
                  type="button"
                  onClick={() => navigate(`/read/${book.id}`)}
                  className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-90 transition-all flex items-center justify-center"
                  title="Кітапты оқу"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
              )}

              {/* Status 3-dots Menu Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenuBookId(isMenuOpen ? null : String(book.id))}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                  title="Күйін өзгерту"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-9 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Күйін өзгерту
                    </div>

                    {/* 1. Оқуда */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isReadingActive) {
                          handleToggleStatus(String(book.id), 'reading', book.title);
                        }
                        setActiveMenuBookId(null);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                        isReadingActive ? 'font-bold text-[#005494] cursor-pointer' : 'text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                      title={
                        isReadingActive
                          ? 'Басып, «Оқып жатқандарым» сөресінен өшіру'
                          : 'Бұл күй кітапты 5 минут тыңдағанда автоматты қосылады'
                      }
                    >
                      <Clock className="w-3.5 h-3.5 text-[#005494]" />
                      Қазір оқуда
                    </button>

                    {/* 2. Оқылып бітті */}
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleStatus(String(book.id), 'completed', book.title);
                        setActiveMenuBookId(null);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                        isCompletedActive ? 'font-bold text-emerald-600 bg-emerald-50' : 'text-slate-700'
                      }`}
                      title={isCompletedActive ? 'Басып, «Оқылып бітті» күйін өшіру' : 'Оқылғандарға қосу'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Оқылып бітті
                    </button>

                    {/* 3. Енді оқимын */}
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleStatus(String(book.id), 'want_to_read', book.title);
                        setActiveMenuBookId(null);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                        isWantToReadActive ? 'font-bold text-amber-600 bg-amber-50' : 'text-slate-700'
                      }`}
                      title={isWantToReadActive ? 'Басып, «Енді оқимын» күйін өшіру' : 'Енді оқитындарға қосу'}
                    >
                      <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                      Енді оқимын
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        handleRemove(String(book.id), book.title);
                        setActiveMenuBookId(null);
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors font-medium cursor-pointer"
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
    </div>
  );
};
