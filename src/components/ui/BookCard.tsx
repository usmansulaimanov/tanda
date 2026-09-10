import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, Eye } from 'lucide-react';
import { Book } from '../../types';
import { Badge } from './Badge';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const navigate = useNavigate();
  const { playBook } = useAudioPlayerStore();

  const handleAudioClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playBook(book);
  };

  return (
    <div
      onClick={() => navigate(`/book/${book.id}`)}
      className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
    >
      {/* Cover / Gradient container */}
      <div
        className="relative w-full aspect-[3/4] flex items-center justify-center p-6 text-white overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]"
        style={{
          background: book.coverImage
            ? `url(${book.coverImage}) center/cover`
            : (book.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)'),
        }}
      >
        {/* Soft overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

        {/* Center Title placeholder if no image */}
        {!book.coverImage && (
          <div className="text-center z-10 p-2">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <span className="font-bold text-lg leading-tight line-clamp-2 drop-shadow-md">
              {book.title}
            </span>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <Badge variant={book.isFree ? 'green' : 'orange'} size="sm" className="shadow-sm font-semibold">
            {book.isFree ? 'Тегін' : 'Премиум'}
          </Badge>
          {book.hasAudio && (
            <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-xs font-medium">
              <Headphones className="w-3 h-3 text-[#F08000]" />
              Аудио
            </span>
          )}
        </div>
      </div>

      {/* Book Meta Content */}
      <div className="flex flex-col flex-1 p-4">
        <div className="text-[11px] font-semibold tracking-wider text-[#0057A8] uppercase mb-1">
          {book.category}
        </div>
        <h3 className="font-bold text-slate-900 group-hover:text-[#0057A8] transition-colors line-clamp-1 mb-1 text-base">
          {book.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-1 mb-3">
          {book.author}
        </p>

        {/* Bottom Actions */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {book.pages ? `${book.pages} бет` : (book.audioDuration || 'Толық нұсқа')}
          </span>

          <div className="flex items-center gap-1.5">
            {book.hasAudio && (
              <button
                onClick={handleAudioClick}
                className="p-2 rounded-xl bg-amber-50 text-[#F08000] hover:bg-amber-100 transition-colors"
                title="Аудионы тыңдау"
              >
                <Headphones className="w-3.5 h-3.5" />
              </button>
            )}
            <Link
              to={`/read/${book.id}`}
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#0057A8] font-medium hover:bg-blue-100 transition-colors"
            >
              Оқу
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
