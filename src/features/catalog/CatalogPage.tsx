import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Headphones, BookOpen, Layers } from 'lucide-react';
import { useBookStore } from '../../store/useBookStore';
import { BookCard } from '../../components/ui/BookCard';

const CATEGORIES = [
  'Барлығы',
  'Классика',
  'Тұлғалық даму',
  'Тарих',
  'Ертегілер',
];

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    books,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    formatFilter,
    setFormatFilter,
    freeFilter,
    setFreeFilter,
  } = useBookStore();

  // Sync with searchParams if url contains ?cat=... or ?format=...
  React.useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat && CATEGORIES.includes(cat)) {
      setSelectedCategory(cat);
    }
    const fmt = searchParams.get('format');
    if (fmt === 'audio' || fmt === 'ebook' || fmt === 'all') {
      setFormatFilter(fmt);
    }
  }, [searchParams, setSelectedCategory, setFormatFilter]);

  // Filter books: ONLY active non-archived books
  const filteredBooks = useMemo(() => {
    return books
      .filter((book) => !book.isArchived)
      .filter((book) => {
        // Category filter
        if (selectedCategory !== 'Барлығы' && book.category !== selectedCategory) {
          return false;
        }
        // Format filter
        if (formatFilter === 'audio' && !book.hasAudio) return false;
        if (formatFilter === 'ebook' && book.hasAudio && !book.pages) return false;

        // Free filter
        if (freeFilter === 'free' && !book.isFree) return false;
        if (freeFilter === 'paid' && book.isFree) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = book.title.toLowerCase().includes(q);
          const matchAuthor = book.author.toLowerCase().includes(q);
          const matchCategory = book.category.toLowerCase().includes(q);
          return matchTitle || matchAuthor || matchCategory;
        }

        return true;
      });
  }, [books, selectedCategory, formatFilter, freeFilter, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Кітаптар каталогы</h1>
          <p className="text-sm text-slate-500 mt-1">
            Барлығы {filteredBooks.length} кітап табылды
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Атауы, авторы бойынша іздеу..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-[#0057A8] rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSearchParams((prev) => {
                  if (cat === 'Барлығы') prev.delete('cat');
                  else prev.set('cat', cat);
                  return prev;
                });
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0057A8] text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary filters: Format & Free */}
        <div className="flex items-center gap-2">
          {/* Format selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                formatFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
              }`}
            >
              Барлығы
            </button>
            <button
              onClick={() => setFormatFilter('audio')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                formatFilter === 'audio' ? 'bg-[#0057A8] text-white shadow-sm font-semibold' : 'text-slate-600'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              Аудио
            </button>
            <button
              onClick={() => setFormatFilter('ebook')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                formatFilter === 'ebook' ? 'bg-[#0057A8] text-white shadow-sm font-semibold' : 'text-slate-600'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Электронды
            </button>
          </div>

          {/* Free/Paid selector */}
          <select
            value={freeFilter}
            onChange={(e) => setFreeFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">Барлық баға</option>
            <option value="free">Тек тегін</option>
            <option value="paid">Тек премиум</option>
          </select>
        </div>
      </div>

      {/* Book Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-dashed border-slate-200">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800">Кітаптар табылмады</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Іздеу сұранысын немесе таңдалған сүзгілерді өзгертіп көріңіз.
          </p>
        </div>
      )}
    </div>
  );
};
