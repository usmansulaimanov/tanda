import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Headphones, ArrowLeft, Clock, FileText, CheckCircle2, Play } from 'lucide-react';
import { useBookStore } from '../../store/useBookStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books } = useBookStore();
  const { playBook, playChapter, currentBook, currentChapter, isPlaying } = useAudioPlayerStore();

  const book = books.find((b) => b.id === id);

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Кітап табылмады</h2>
        <Button onClick={() => navigate('/catalog')}>Каталогқа оралу</Button>
      </div>
    );
  }

  const isCurrentBookPlaying = currentBook?.id === book.id && isPlaying;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Артқа оралу
      </button>

      {/* Main Book Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        {/* Cover column */}
        <div className="md:col-span-4 flex flex-col items-center">
          <div
            className="w-full max-w-[280px] aspect-[3/4] rounded-2xl shadow-xl flex items-center justify-center p-6 text-white relative overflow-hidden"
            style={{
              background: book.coverImage
                ? `url(${book.coverImage}) center/cover`
                : (book.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)'),
            }}
          >
            {!book.coverImage && (
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-90" />
                <span className="font-bold text-xl drop-shadow-md">{book.title}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info column */}
        <div className="md:col-span-8 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="blue">{book.category}</Badge>
              <Badge variant={book.isFree ? 'green' : 'orange'}>
                {book.isFree ? 'Тегін' : 'Премиум'}
              </Badge>
              {book.hasAudio && (
                <Badge variant="orange" className="gap-1">
                  <Headphones className="w-3 h-3" /> Аудиокітап
                </Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              {book.title}
            </h1>

            <p className="text-lg font-medium text-slate-600">
              Авторы: <span className="text-slate-900">{book.author}</span>
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 py-3 text-sm text-slate-500 border-y border-slate-100">
              {book.pages && (
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>{book.pages} бет</span>
                </div>
              )}
              {book.audioDuration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{book.audioDuration}</span>
                </div>
              )}
              {book.audioNarrator && (
                <div className="flex items-center gap-1.5">
                  <Headphones className="w-4 h-4 text-slate-400" />
                  <span>Диктор: {book.audioNarrator}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Кітап туралы</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {book.description || 'Бұл кітап туралы қосымша ақпарат жоқ.'}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
            <Link to={`/read/${book.id}`}>
              <Button size="lg" variant="primary" className="gap-2">
                <BookOpen className="w-5 h-5" />
                Оқуды бастау
              </Button>
            </Link>

            {book.hasAudio && (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => playBook(book)}
                className="gap-2"
              >
                <Headphones className="w-5 h-5" />
                {isCurrentBookPlaying ? 'Тыңдалуда...' : 'Аудионы тыңдау'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Audio chapters list if present */}
      {book.hasAudio && book.audioChapters && book.audioChapters.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[#F08000]" />
            Аудио тараулар ({book.audioChapters.length})
          </h2>

          <div className="divide-y divide-slate-100">
            {book.audioChapters.map((ch, idx) => {
              const isThisChapterPlaying =
                currentBook?.id === book.id && currentChapter?.id === ch.id && isPlaying;

              return (
                <div
                  key={ch.id || idx}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (currentBook?.id !== book.id) {
                          playBook(book, idx);
                        } else {
                          playChapter(idx);
                        }
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isThisChapterPlaying
                          ? 'bg-[#0057A8] text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-[#0057A8] hover:text-white'
                      }`}
                    >
                      <Play className="w-4 h-4 ml-0.5" />
                    </button>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{ch.title}</h4>
                      <span className="text-xs text-slate-400">{ch.duration}</span>
                    </div>
                  </div>

                  {isThisChapterPlaying && (
                    <span className="text-xs font-semibold text-[#0057A8] bg-blue-50 px-2.5 py-1 rounded-lg">
                      Ойнап тұр
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
