import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Type, Sun, Moon, Coffee } from 'lucide-react';
import { useBookStore } from '../../store/useBookStore';
import { Button } from '../../components/ui/Button';

export const ReaderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books } = useBookStore();

  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('lg');
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');

  const book = books.find((b) => b.id === id);

  if (!book) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">Кітап табылмады</h2>
        <Button onClick={() => navigate('/catalog')}>Каталогқа оралу</Button>
      </div>
    );
  }

  const themeStyles = {
    light: 'bg-[#FAF9F6] text-slate-800',
    sepia: 'bg-[#Fbf0d9] text-[#4a3525]',
    dark: 'bg-[#0f172a] text-slate-200',
  };

  const fontSizes = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-loose',
    xl: 'text-xl leading-loose',
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeStyles[theme]}`}>
      {/* Top Reading Navigation */}
      <header className="sticky top-0 z-30 border-b border-black/10 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/book/${book.id}`)}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"
            title="Кітап бетіне оралу"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="truncate max-w-xs sm:max-w-md">
            <h3 className="font-bold text-sm truncate">{book.title}</h3>
            <span className="text-xs opacity-75">{book.author}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Font size toggle */}
          <div className="flex items-center rounded-xl p-1 bg-black/5 text-xs font-semibold">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 rounded-lg ${fontSize === 'sm' ? 'bg-white text-black shadow-sm' : ''}`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 rounded-lg ${fontSize === 'lg' ? 'bg-white text-black shadow-sm' : ''}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('xl')}
              className={`px-2 py-1 rounded-lg ${fontSize === 'xl' ? 'bg-white text-black shadow-sm' : ''}`}
            >
              A+
            </button>
          </div>

          {/* Theme switcher */}
          <div className="flex items-center rounded-xl p-1 bg-black/5">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-lg ${theme === 'light' ? 'bg-white text-amber-500 shadow-sm' : 'opacity-60'}`}
              title="Жарық"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`p-1.5 rounded-lg ${theme === 'sepia' ? 'bg-[#f4e4c1] text-amber-900 shadow-sm' : 'opacity-60'}`}
              title="Сепия"
            >
              <Coffee className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-slate-800 text-blue-300 shadow-sm' : 'opacity-60'}`}
              title="Түнгі режим"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Reader Text Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <article className={`space-y-6 ${fontSizes[fontSize]} font-serif`}>
          <div className="text-center pb-8 border-b border-black/10 not-italic font-sans">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{book.title}</h1>
            <p className="text-sm opacity-75">{book.author}</p>
          </div>

          <p className="font-medium opacity-90">
            {book.description}
          </p>

          <p>
            Кітап адам өміріндегі ең адал дос әрі жолбасшы. Бұл туынды оқырманның жан дүниесіне рухани нәр беріп, өмірлік сауалдарына жауап табуына септігін тигізеді. Әрбір бетін парақтаған сайын жаңа ой, терең пайым мен парасатты көзқарас ашыла түседі.
          </p>

          <p>
            Қазақ даласының кеңдігі мен рухани байлығы бабадан балаға осындай құнды шығармалар арқылы жеткен. Сөз өнері – адамзаттың ең ұлы жетістіктерінің бірі. Әрбір тараудағы сөз саптау, ой толғау мен кейіпкерлер бейнесі терең психологиялық және тарихи мазмұнға ие.
          </p>

          <p>
            Tanda платформасы арқылы оқырман кез келген уақытта және кез келген жерде өз ана тіліндегі сапалы әдебиетке қол жеткізе алады. Оқу залындағы қолайлы параметрлер көзіңізді шаршатпай, мазмұнға толықтай енуге мүмкіндік береді.
          </p>
        </article>
      </main>
    </div>
  );
};
