import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Headphones, Sparkles, Heart, ShieldCheck, Trophy, ArrowRight, Mail, Compass } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,126,0,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black tracking-wider uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Tanda платформасы
          </div>
          
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
            Қазақ тіліндегі кітап пен <span className="text-orange-500">аудио әлемі</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Tanda — оқырмандар мен авторларды біріктіретін, ана тіліміздегі құнды әдебиет пен заманауи кітаптарды кез келген жерде оқуға және тыңдауға мүмкіндік беретін заманауи онлайн платформа.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/catalog"
              className="px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <Compass className="w-4 h-4" />
              Кітаптар каталогы
            </Link>
            <a
              href="mailto:tandamenapp@gmail.com"
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-all flex items-center gap-2"
            >
              <Mail className="w-4 h-4 text-orange-400" />
              Байланысу
            </a>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 space-y-12">
        {/* Mission Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80">
          <div className="flex items-center gap-3 text-orange-500 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center font-bold">
              <Heart className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Біздің миссиямыз</h2>
          </div>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-medium">
            Біздің басты мақсатымыз — қазақ тіліндегі сапалы әдебиетке қолжетімділікті жеңілдету, оқу мәдениетін цифрлық форматта жаңа деңгейге көтеру және әрбір оқырманға сүйікті шығармасын өзіне ыңғайлы уақытта оқуға немесе тыңдауға толық жағдай жасау.
          </p>
        </div>

        {/* Feature Grid */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Платформа мүмкіндіктері</h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2">Оқырмандарға арналған заманауи және ыңғайлы құралдар</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-5">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">Сапалы аудиокітаптар</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Кәсіби дикторлардың дауысымен жазылған шығармалар. Жолда, спорт кезінде немесе демалыста фондық режимде еш кедергісіз тыңдаңыз.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">Электронды кітапхана</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Ыңғайлы оқу форматы, беттерді сақтау, қаріп өлшемін баптау және оқу барысын барлық құрылғыларда синхрондау.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">Оқырмандар рейтингі мен үзінділер</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Кітаптан жүрекке тиген үзінділерді сақтап, күнделікті оқу уақытыңызды қадағалаңыз және оқырмандар рейтингінде көш бастаңыз.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">Авторлық құқық пен қауіпсіздік</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Барлық шығармалар авторлық құқықты сақтай отырып орналастырылады. Оқырмандар деректері қауіпсіз шифрланған түрде қорғалады.
              </p>
            </div>
          </div>
        </div>

        {/* Community & Contact Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-black mb-3">Бізбен бірге болыңыз</h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              Платформаны дамыту, серіктестік немесе жаңа кітаптар қосу бойынша ұсыныстарыңыз болса, бізге кез келген уақытта хабарласыңыз.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="mailto:tandamenapp@gmail.com"
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                tandamenapp@gmail.com
              </a>
              <Link
                to="/catalog"
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 border border-white/10"
              >
                Кітап оқуды бастау
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
