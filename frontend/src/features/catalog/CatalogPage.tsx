import React, { useState, useMemo } from 'react';
import { Search, X, BookOpen, Headphones, Sparkles } from 'lucide-react';
import { useBooks } from './hooks/useBooks';
import { BookCard } from '../../components/ui/BookCard';
import { BookCardSkeleton, Input, Button } from '../../shared/ui';
import { Book } from '../../types';

const CATEGORIES = [
  'Бәрі',
  'Көркем әдебиет',
  'Детектив',
  'Романтика',
  'Фэнтези',
  'Фантастика',
  'Мистика және хоррор',
  'Психология',
  'Өзін-өзі дамыту',
  'Бизнес және қаржы',
  'Тарих',
  'Руханият және философия',
  'Білім және ғылым',
  'Балалар әдебиеті',
  'Жасөспірімдер әдебиеті',
  'Өмірбаян және мемуар',
];

export const CatalogPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('Бәрі');
  const [format, setFormat] = useState<'all' | 'audio' | 'text'>('all');
  const [freeOnly, setFreeOnly] = useState(false);

  const { data: books, isLoading, isError, refetch } = useBooks();

  const activeBooks = useMemo<Book[]>(() => {
    return (books || []).filter((b: Book) => !b.isArchived);
  }, [books]);

  const filteredBooks = useMemo<Book[]>(() => {
    return activeBooks.filter((book: Book) => {
      // Category filter
      if (selectedCat !== 'Бәрі') {
        const bookCats = book.categories && book.categories.length > 0
          ? book.categories
          : (book.category ? book.category.split(',').map((c) => c.trim()) : []);
        if (!bookCats.includes(selectedCat)) {
          return false;
        }
      }
      // Format filter
      if (format === 'audio' && !book.audioUrl && (!book.audioChapters || book.audioChapters.length === 0)) {
        return false;
      }
      if (format === 'text' && !book.content && !book.pages) {
        return false;
      }
      // Free filter
      if (freeOnly && !book.isFree) {
        return false;
      }
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          (book.category && book.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeBooks, selectedCat, format, freeOnly, search]);

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Header Title & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-purple-400 text-sm font-medium mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Кітаптар қоры</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Каталог</h1>
            <p className="text-white/50 text-sm mt-1">
              {isLoading ? 'Кітаптар жүктелуде...' : `Барлығы ${filteredBooks.length} кітап табылды`}
            </p>
          </div>

          <div className="w-full md:w-80">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Кітап немесе автор іздеу..."
              leftIcon={<Search className="w-4 h-4" />}
              rightIcon={
                search ? (
                  <button onClick={() => setSearch('')} className="hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                ) : null
              }
            />
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Area */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Format & Free Toggle Chips */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1a1a24] p-3 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    format === 'all'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  Барлығы
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('audio')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    format === 'audio'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Аудиокітаптар
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    format === 'text'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Оқуға
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFreeOnly(!freeOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    freeOnly
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  Тек тегін кітаптар
                </button>

                {(selectedCat !== 'Бәрі' || format !== 'all' || freeOnly || search) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCat('Бәрі');
                      setFormat('all');
                      setFreeOnly(false);
                      setSearch('');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 underline ml-2"
                  >
                    Сүзгіні тазалау
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Categories Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all font-medium border ${
                    selectedCat === cat
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20 scale-105'
                      : 'bg-[#1a1a24] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Books Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {Array.from({ length: 10 }).map((_, i) => (
                  <BookCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a24] rounded-2xl border border-white/5 gap-4 text-center">
                <p className="text-white/60 text-sm">Кітаптарды жүктеу кезінде қате орын алды.</p>
                <Button size="sm" onClick={() => refetch()}>
                  Қайта көру
                </Button>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-[#1a1a24] rounded-2xl border border-white/5 gap-3 text-center">
                <BookOpen className="w-10 h-10 text-white/20" />
                <h3 className="text-lg font-semibold text-white/80">Кітаптар табылмады</h3>
                <p className="text-white/40 text-xs max-w-sm">
                  Іздеу сұранысын немесе таңдалған сүзгілерді өзгертіп көріңіз.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {filteredBooks.map((book: Book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
