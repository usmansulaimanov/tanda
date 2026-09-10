import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0057A8] flex items-center justify-center text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Tanda</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Қазақ тіліндегі сапалы кітаптар, аудиокітаптар мен рухани білім кеңістігі.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Бөлімдер</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/" className="hover:text-white transition-colors">Басты бет</Link></li>
              <li><Link to="/catalog" className="hover:text-white transition-colors">Кітаптар каталогы</Link></li>
              <li><Link to="/catalog?format=audio" className="hover:text-white transition-colors">Аудиокітаптар</Link></li>
              <li><Link to="/admin" className="hover:text-white transition-colors">Әкімші басқаруы</Link></li>
            </ul>
          </div>

          {/* Col 3: Categories */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Санаттар</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/catalog?cat=Классика" className="hover:text-white transition-colors">Классика</Link></li>
              <li><Link to="/catalog?cat=Тұлғалық даму" className="hover:text-white transition-colors">Тұлғалық даму</Link></li>
              <li><Link to="/catalog?cat=Тарих" className="hover:text-white transition-colors">Тарих</Link></li>
              <li><Link to="/catalog?cat=Ертегілер" className="hover:text-white transition-colors">Ертегілер</Link></li>
            </ul>
          </div>

          {/* Col 4: Info */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Байланыс</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Кітаптарды цифрландыру және оқырманға жеткізу жобасы.
            </p>
            <div className="mt-4 text-xs text-slate-500">
              Алматы қаласы, Қазақстан
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          (c) {new Date().getFullYear()} Tanda. Барлық құқықтар қорғалған.
        </div>
      </div>
    </footer>
  );
};
