import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useBookStore } from '../../store/useBookStore';
import { BookCard } from '../../components/ui/BookCard';
import { Button } from '../../components/ui/Button';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { books, setSelectedCategory } = useBookStore();

  // Readers only see active, non-archived books
  const activeBooks = books.filter((b) => !b.isArchived);

  // Popular books (e.g. first 4 active books)
  const popularBooks = activeBooks.slice(0, 4);

  // Recent books (next books)
  const recentBooks = activeBooks.slice(4, 8);

  // Audiobooks
  const audioBooks = activeBooks.filter((b) => b.hasAudio).slice(0, 4);

  const categories = [
    { name: 'Классика', count: activeBooks.filter((b) => b.category === 'Классика').length },
    { name: 'Тұлғалық даму', count: activeBooks.filter((b) => b.category === 'Тұлғалық даму').length },
    { name: 'Тарих', count: activeBooks.filter((b) => b.category === 'Тарих').length },
    { name: 'Ертегілер', count: activeBooks.filter((b) => b.category === 'Ертегілер').length },
  ];

  const handleCategoryClick = (catName: string) => {
    setSelectedCategory(catName);
    navigate('/catalog');
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0057A8] via-[#004687] to-[#002f5c] text-white py-16 sm:py-24 rounded-3xl mx-4 sm:mx-8 shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            Қазақ тіліндегі цифрлық кітапхана
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Қазақ әдебиеті мен аудиокітаптары бір кеңістікте
          </h1>

          <p className="text-base sm:text-lg text-blue-100/90 max-w-2xl mx-auto font-normal leading-relaxed">
            Классикалық романдардан заманауи тұлғалық даму бағытындағы үздік туындыларды онлайн оқыңыз немесе тыңдаңыз.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/catalog">
              <Button size="lg" variant="secondary" className="gap-2 shadow-lg shadow-amber-500/20">
                <BookOpen className="w-5 h-5" />
                Кітаптарды қарау
              </Button>
            </Link>
            <Link to="/catalog">
              <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-md">
                <Headphones className="w-5 h-5 mr-2" />
                Аудиокітаптар
              </Button>
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-10 border-t border-white/15 max-w-xl mx-auto">
            <div>
              <div className="text-2xl sm:text-3xl font-bold">{activeBooks.length}</div>
              <div className="text-xs text-blue-200">Қолжетімді кітап</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold">{activeBooks.filter(b => b.hasAudio).length}</div>
              <div className="text-xs text-blue-200">Аудиокітап</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold">100%</div>
              <div className="text-xs text-blue-200">Қазақ тілінде</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Санаттар бойынша іздеу</h2>
          <Link to="/catalog" className="text-sm font-semibold text-[#0057A8] hover:underline flex items-center gap-1">
            Барлық санаттар <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0057A8] hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="text-base font-bold text-slate-900 group-hover:text-[#0057A8] transition-colors">
                {cat.name}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {cat.count} кітап
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Popular Books Section (Only active books, for readers) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Танымал кітаптар</h2>
            <p className="text-xs text-slate-500 mt-1">Оқырмандар ең көп оқыған туындылар</p>
          </div>
          <Link to="/catalog" className="text-sm font-semibold text-[#0057A8] hover:underline flex items-center gap-1">
            Каталогқа өту <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {popularBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>

      {/* Audiobooks Section */}
      {audioBooks.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Headphones className="w-6 h-6 text-[#F08000]" />
                Аудиокітаптар
              </h2>
              <p className="text-xs text-slate-500 mt-1">Кәсіби дикторлар дыбыстаған шығармалар</p>
            </div>
            <Link to="/catalog?format=audio" className="text-sm font-semibold text-[#0057A8] hover:underline flex items-center gap-1">
              Барлық аудиокітаптар <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {audioBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Books */}
      {recentBooks.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Жаңадан қосылғандар</h2>
              <p className="text-xs text-slate-500 mt-1">Кітапхана қорына енген соңғы кітаптар</p>
            </div>
            <Link to="/catalog" className="text-sm font-semibold text-[#0057A8] hover:underline flex items-center gap-1">
              Барлығын қарау <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
