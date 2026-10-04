import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Share2,
  Sparkles,
  Coins,
  Clock,
  Trophy,
  Calendar,
  MessageSquare,
  BookOpen,
  Award,
  Quote as QuoteIcon,
  Bookmark,
  ChevronRight,
  Star,
  Headphones,
  Copy,
  Check,
  ExternalLink,
  BookMarked,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useSavedBooksStore } from '../../store/useSavedBooksStore';
import { useMyBooksStore, UserBookRecord, BookShelfStatus } from '../../store/useMyBooksStore';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useToastStore } from '../../store/useToastStore';
import { useQuoteStore, QuoteItem } from '../../store/useQuoteStore';
import { leaderboardApi } from '../../shared/api/leaderboard.api';
import { reviewsApi } from '../../shared/api/reviews.api';
import { certificatesApi } from '../../shared/api/certificates.api';
import { TandaPremiumBadge } from '../../components/ui/TandaPremiumBadge';
import { PremiumModal } from '../premium/PremiumModal';

type ActiveTab = 'reviews' | 'shelves' | 'certificates' | 'quotes' | 'saved';

const formatDateDMY = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatReadingTime = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return '0 мин';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) return `${hours} сағ`;
  return `${hours} сағ ${remainingMins} мин`;
};

const getInitials = (name?: string): string => {
  if (!name || !name.trim()) return 'УС';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAuthInitialized } = useAuthStore();
  const { books, fetchBooks } = useBookStore();
  const { savedBookIds, fetchSavedBooks, removeSavedBook, getSavedBookIds } = useSavedBooksStore();
  const { currentShelf, fetchShelf } = useMyBooksStore();
  const { quotes, fetchQuotes } = useQuoteStore();
  const { playBook } = useAudioPlayerStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('reviews');
  const [shelfFilter, setShelfFilter] = useState<'all' | BookShelfStatus>('all');
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  // Fetch initial collections
  useEffect(() => {
    fetchBooks();
    fetchSavedBooks();
    fetchShelf();
    fetchQuotes();
  }, [fetchBooks, fetchSavedBooks, fetchShelf, fetchQuotes]);

  // Fetch personal reading stats
  const { data: personalStats } = useQuery({
    queryKey: ['personal-stats', user?.id],
    queryFn: () => leaderboardApi.getPersonalStats(),
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
  });

  // Fetch leaderboard ranking
  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard-rank', user?.id],
    queryFn: () => leaderboardApi.getLeaderboard('THIS_WEEK'),
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
  });

  // Fetch user reviews
  const { data: myReviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ['my-reviews', user?.id],
    queryFn: () => reviewsApi.getMyReviewsList(),
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
  });

  // Fetch user certificates
  const { data: myCertificates = [], isLoading: isLoadingCertificates } = useQuery({
    queryKey: ['my-certificates', user?.id],
    queryFn: () => certificatesApi.getMyCertificates(),
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
  });

  // Saved books list
  const savedBooks = useMemo(() => {
    const savedIds = getSavedBookIds();
    const savedSet = new Set(savedIds.map(String));
    return books.filter((b) => savedSet.has(String(b.id)) && !b.isArchived);
  }, [books, savedBookIds, getSavedBookIds]);

  // Shelf books list
  const shelfBooks = useMemo(() => Object.values(currentShelf), [currentShelf]);
  const filteredShelfBooks = useMemo(() => {
    return shelfBooks.filter((ub: UserBookRecord) => {
      if (shelfFilter === 'all') return true;
      return ub.status === shelfFilter;
    });
  }, [shelfBooks, shelfFilter]);

  // Leaderboard rank value
  const userRank = leaderboardData?.currentUserEntry?.rank;

  // Share profile handler
  const handleShareProfile = () => {
    const profileUrl = window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: `${user?.name || 'Пайдаланушы'} • Tanda.kz`,
          text: `Tanda платформасындағы ${user?.name || 'оқырманның'} жеке профилі`,
          url: profileUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(profileUrl);
      showToast('Профиль сілтемесі көшірілді!', 'success');
    }
  };

  const handleCopyQuote = (quote: QuoteItem) => {
    const textToCopy = `«${quote.text}»\n— ${quote.author}${quote.bookTitle ? ` (${quote.bookTitle})` : ''}\n\nTanda.kz арқылы оқыңыз`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuoteId(quote.id);
    showToast('Дәйексөз көшірілді!', 'success');
    setTimeout(() => setCopiedQuoteId(null), 2000);
  };

  const handleRemoveSaved = (bookId: string, bookTitle: string) => {
    removeSavedBook(bookId);
    showToast(`«${bookTitle}» сақталғандардан өшірілді`, 'info');
  };

  if (!isAuthInitialized) {
    return (
      <div className="max-w-2xl mx-auto my-12 px-4">
        <div className="bg-white rounded-2xl p-8 h-64 border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="w-16 h-16 rounded-full bg-sky-50 text-[#005494] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Жеке профильге кіру</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Жеке кабинетті, оқу статистикаңызды және сақталған кітаптарыңызды көру үшін жүйеге кіріңіз.
          </p>
          <Link
            to="/login?redirect=/profile"
            className="w-full inline-flex items-center justify-center py-3 px-6 rounded-xl bg-[#005494] text-white font-bold text-sm shadow-md hover:bg-[#004275] transition-colors"
          >
            Жүйеге кіру
          </Link>
        </div>
      </div>
    );
  }

  const isPremiumActive = Boolean(user.isPremium || user.hasActiveSubscription);
  const totalSecondsRead = personalStats?.allTimeSeconds ?? user.totalListenedSeconds ?? 0;
  const last7DaysSeconds = personalStats?.last7DaysSeconds ?? 0;
  const bonusBalance = user.bonusBalance ?? 0;

  return (
    <div className="max-w-4xl mx-auto mb-24 pb-8">
      {/* 1. Header Banner */}
      <div
        className="relative h-44 sm:h-52 w-full rounded-b-3xl overflow-hidden px-4 pt-4 sm:px-6 flex justify-end items-start shadow-md"
        style={{
          background: 'linear-gradient(135deg, #134E4A 0%, #064E3B 50%, #042F2C 100%)',
        }}
      >
        {/* Subtle decorative circles */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        {/* Top Right Menu / Settings button */}
        <Link
          to="/settings"
          className="relative z-10 p-2.5 rounded-xl bg-black/30 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/40 transition-all active:scale-95"
          title="Баптаулар"
          aria-label="Баптаулар"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>

      <div className="px-4 sm:px-6">
        {/* 2. Avatar & Action Buttons Bar */}
        <div className="relative flex items-end justify-between -mt-14 sm:-mt-16 mb-4">
          {/* Circular Avatar */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-teal-800 text-white shadow-lg overflow-hidden flex items-center justify-center font-black text-2xl sm:text-3xl tracking-wider select-none">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{getInitials(user.name)}</span>
              )}
            </div>
            {isPremiumActive && (
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm" title="Tanda Premium">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Action buttons (Right) */}
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              Профильді өңдеу
            </Link>
            <button
              type="button"
              onClick={handleShareProfile}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shadow-sm active:scale-95"
              title="Бөлісу"
              aria-label="Профильмен бөлісу"
            >
              <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>

        {/* 3. User Identity Details */}
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            {user.name || 'Оқырман'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium mt-1">
            <span>ID: {user.idNumber || user.id?.substring(0, 8)}</span>
            <span>•</span>
            <span className="text-slate-700 font-semibold">@{user.username || 'username'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500 mt-2">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatDateDMY(user.createdAt)} ж. тіркелген
            </span>
            <span>•</span>
            <span className="text-slate-600 font-medium">
              {myReviews.length} пікір • {savedBooks.length} сақталған
            </span>
          </div>
        </div>

        {/* 4. Premium Banner Card */}
        <div
          onClick={() => (!isPremiumActive ? setIsPremiumModalOpen(true) : navigate('/premium'))}
          className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white mb-5 cursor-pointer shadow-md transition-all hover:shadow-lg active:scale-[0.99] flex items-center justify-between gap-4"
          style={{
            background: isPremiumActive
              ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
              : 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="font-extrabold text-base sm:text-lg leading-tight flex items-center gap-2">
                Tanda Premium
                {isPremiumActive && (
                  <span className="text-[10px] bg-white/30 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Белсенді
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm text-white/90 mt-0.5">
                {isPremiumActive
                  ? 'Барлық аудио және электронды кітаптар қолжетімді'
                  : 'Өзіңіз үшін премиум мүмкіндіктерді ашыңыз'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="shrink-0 px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-xs sm:text-sm font-bold flex items-center gap-1 backdrop-blur-sm transition-all"
          >
            {isPremiumActive ? 'Толығырақ' : 'Премиум'}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5. 2x2 Statistics Matrix */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 mb-6">
          {/* Card 1: Бонус балансы */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 transition-all hover:bg-slate-100/80">
            <div className="text-[11px] sm:text-xs text-slate-500 font-medium mb-1">Бонус балансы</div>
            <div className="flex items-center gap-1.5 text-base sm:text-lg font-black text-slate-900">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-black shrink-0">
                🪙
              </span>
              <span>{bonusBalance}</span>
            </div>
          </div>

          {/* Card 2: Жалпы оқу */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 transition-all hover:bg-slate-100/80">
            <div className="text-[11px] sm:text-xs text-slate-500 font-medium mb-1">Жалпы оқу/тыңдау</div>
            <div className="flex items-center gap-1.5 text-base sm:text-lg font-black text-slate-900">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-black shrink-0">
                ⏱️
              </span>
              <span>{formatReadingTime(totalSecondsRead)}</span>
            </div>
          </div>

          {/* Card 3: Көшбасшылар рейтингі */}
          <Link
            to="/leaderboard"
            className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 transition-all hover:bg-slate-100/80 flex items-center justify-between group"
          >
            <div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium mb-1">Рейтингтегі орын</div>
              <div className="flex items-center gap-1.5 text-base sm:text-lg font-black text-slate-900">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-black shrink-0">
                  🏆
                </span>
                <span>{userRank ? `#${userRank}` : '-'}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </Link>

          {/* Card 4: Соңғы 7 күн */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 transition-all hover:bg-slate-100/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium mb-1">Соңғы 7 күн</div>
              <div className="flex items-center gap-1.5 text-base sm:text-lg font-black text-slate-900">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0">
                  📅
                </span>
                <span>{formatReadingTime(last7DaysSeconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Tabs Navigation */}
        <div className="border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-6 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 text-sm sm:text-base font-bold transition-all relative ${
                activeTab === 'reviews'
                  ? 'text-orange-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Пікірлер ({myReviews.length})
              {activeTab === 'reviews' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shelves')}
              className={`pb-3 text-sm sm:text-base font-bold transition-all relative ${
                activeTab === 'shelves'
                  ? 'text-orange-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Сөрелер ({shelfBooks.length})
              {activeTab === 'shelves' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('certificates')}
              className={`pb-3 text-sm sm:text-base font-bold transition-all relative ${
                activeTab === 'certificates'
                  ? 'text-orange-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Сертификаттар ({myCertificates.length})
              {activeTab === 'certificates' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quotes')}
              className={`pb-3 text-sm sm:text-base font-bold transition-all relative ${
                activeTab === 'quotes'
                  ? 'text-orange-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Дәйексөздер
              {activeTab === 'quotes' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`pb-3 text-sm sm:text-base font-bold transition-all relative ${
                activeTab === 'saved'
                  ? 'text-orange-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Сақталғандар ({savedBooks.length})
              {activeTab === 'saved' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* 7. Tab Contents */}

        {/* Tab A: Пікірлер (Reviews) */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {/* Quick action card: "Ойыңызбен бөлісіңіз..." */}
            <Link
              to="/catalog"
              className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 font-bold flex items-center justify-center shrink-0">
                  {getInitials(user.name)[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-400">Кітап таңдап, пікір немесе ой бөлісіңіз...</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </Link>

            {isLoadingReviews ? (
              <div className="space-y-3">
                <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
              </div>
            ) : myReviews.length > 0 ? (
              <div className="space-y-3">
                {myReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <Link
                        to={`/book/${rev.bookId}`}
                        className="font-bold text-slate-900 hover:text-[#005494] transition-colors text-sm sm:text-base line-clamp-1"
                      >
                        «{rev.bookTitle}»
                      </Link>
                      <div className="flex items-center gap-1 text-amber-500 shrink-0">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-slate-700">{rev.rating}</span>
                      </div>
                    </div>

                    {rev.reviewText && (
                      <p className="text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-line">
                        {rev.reviewText}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                      <span>{formatDateDMY(rev.createdAt)}</span>
                      <span className="flex items-center gap-1">
                        👍 {rev.likesCount || 0} ұнату
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-base mb-1">Әзірге пікірлеріңіз жоқ</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
                  Оқыған кітаптарыңызға пікір қалдырып, басқа оқырмандармен ой бөлісіңіз.
                </p>
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005494] text-white text-xs sm:text-sm font-bold shadow hover:bg-[#004275] transition-colors"
                >
                  Кітап таңдау
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab B: Сөрелер (Shelves) */}
        {activeTab === 'shelves' && (
          <div>
            {/* Sub-filter chips */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'Барлығы' },
                { id: 'reading', label: 'Оқып жатырмын' },
                { id: 'completed', label: 'Оқып болдым' },
                { id: 'planned', label: 'Жоспарда' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setShelfFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    shelfFilter === f.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredShelfBooks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filteredShelfBooks.map((ub: UserBookRecord) => {
                  return (
                    <div
                      key={ub.bookId}
                      onClick={() => navigate(`/book/${ub.bookId}`)}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                        {ub.coverImage ? (
                          <img
                            src={ub.coverImage}
                            alt={ub.title || 'Кітап'}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-3 text-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white font-bold text-xs">
                            {ub.title || 'Кітап'}
                          </div>
                        )}
                        {!ub.isFree && <TandaPremiumBadge />}
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 mb-0.5">
                            {ub.title || 'Кітап'}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {ub.author || 'Автор'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                <BookMarked className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-base mb-1">Сөреде кітаптар жоқ</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
                  Кітаптар қорынан кітап қосып, жеке сөреңізді толықтырыңыз.
                </p>
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005494] text-white text-xs sm:text-sm font-bold shadow hover:bg-[#004275] transition-colors"
                >
                  Кітаптар қорына өту
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab C: Сертификаттар (Certificates) */}
        {activeTab === 'certificates' && (
          <div>
            {isLoadingCertificates ? (
              <div className="space-y-3">
                <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
              </div>
            ) : myCertificates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          {cert.category || 'Сертификат'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {formatDateDMY(cert.issuedAt)}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base mb-1">
                        {cert.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {cert.description || 'Tanda платформасы бойынша оқу марапаты'}
                      </p>
                      <div className="text-xs font-mono font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-4">
                        № {cert.certificateNumber}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Link
                        to={`/certificate/${encodeURIComponent(cert.certificateNumber)}`}
                        className="flex-1 py-2 rounded-xl bg-[#005494] text-white text-xs font-bold text-center hover:bg-[#004275] transition-colors"
                      >
                        Сертификатты көру
                      </Link>
                      {cert.pdfUrl && (
                        <a
                          href={cert.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                          title="PDF жүктеп алу"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-base mb-1">Әзірге сертификаттар жоқ</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
                  Кітаптарды толық оқып немесе аудиосын тыңдап, білім деңгейіңізді көтеріңіз және ресми сертификаттарға ие болыңыз!
                </p>
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005494] text-white text-xs sm:text-sm font-bold shadow hover:bg-[#004275] transition-colors"
                >
                  Оқуды бастау
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab D: Дәйексөздер (Quotes) */}
        {activeTab === 'quotes' && (
          <div className="space-y-3">
            {quotes.filter((q) => q.isActive).length > 0 ? (
              quotes
                .filter((q) => q.isActive)
                .slice(0, 15)
                .map((q) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative group"
                  >
                    <QuoteIcon className="w-6 h-6 text-slate-300 mb-2 opacity-60" />
                    <p className="text-sm sm:text-base font-serif italic text-slate-800 leading-relaxed mb-3">
                      «{q.text}»
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="font-bold text-slate-700">
                        — {q.author} {q.bookTitle && <span className="font-normal text-slate-500">({q.bookTitle})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyQuote(q)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold p-1"
                        title="Көшіріп алу"
                      >
                        {copiedQuoteId === q.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Көшірілді</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Көшіру</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                <QuoteIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-base mb-1">Дәйексөздер табылмады</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
                  Кітаптан үзінділерді көру үшін дәйексөздер бөліміне өтіңіз.
                </p>
                <Link
                  to="/quotes"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005494] text-white text-xs sm:text-sm font-bold shadow hover:bg-[#004275] transition-colors"
                >
                  Дәйексөздерге өту
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab E: Сақталғандар (Saved) */}
        {activeTab === 'saved' && (
          <div>
            {savedBooks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {savedBooks.map((book) => {
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
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                        {book.coverImage ? (
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-3 text-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white font-bold text-xs">
                            {book.title}
                          </div>
                        )}
                        {!book.isFree && <TandaPremiumBadge />}
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 mb-0.5">
                            {book.title}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {book.author}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                          {hasText && (
                            <Link
                              to={`/read/${book.id}`}
                              className="flex-1 py-1.5 rounded-lg bg-sky-50 text-[#005494] text-[11px] font-bold text-center hover:bg-sky-100 transition-colors"
                            >
                              Оқу
                            </Link>
                          )}
                          {hasAudio && (
                            <button
                              type="button"
                              onClick={() => {
                                playBook(book);
                                navigate(`/listen/${book.id}`);
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-orange-100 transition-colors"
                            >
                              <Headphones className="w-3 h-3" />
                              Тыңдау
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSaved(book.id, book.title)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Сақталғаннан өшіру"
                          >
                            <Bookmark className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-base mb-1">Сақталған кітаптар жоқ</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
                  Кітаптар қорына өтіп, өзіңізге ұнаған кез келген кітаптағы «Кейін оқимын» батырмасын басыңыз.
                </p>
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005494] text-white text-xs sm:text-sm font-bold shadow hover:bg-[#004275] transition-colors"
                >
                  Кітаптар қорына өту
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Premium Modal */}
      {isPremiumModalOpen && (
        <PremiumModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
      )}
    </div>
  );
};
