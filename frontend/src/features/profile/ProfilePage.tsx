import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Menu,
  Share2,
  Sparkles,
  ChevronRight,
  Star,
  Headphones,
  Copy,
  Check,
  ExternalLink,
  BookMarked,
  MessageSquare,
  Award,
  Quote as QuoteIcon,
  Bookmark,
  Clock,
  Calendar,
  Zap,
  BarChart2,
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

  // Peak listening day of current month
  const peakDay = useMemo(() => {
    if (!personalStats?.dailyActivity || personalStats.dailyActivity.length === 0) return null;
    let max = personalStats.dailyActivity[0];
    for (const item of personalStats.dailyActivity) {
      if (item.seconds > max.seconds) {
        max = item;
      }
    }
    if (!max || max.seconds <= 0) return null;
    return max;
  }, [personalStats]);

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
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 24px' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '48px 32px', height: '240px', border: '1px solid #E2E8F0', opacity: 0.6 }} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '48px 32px',
            boxShadow: '0 12px 36px rgba(0, 84, 148, 0.08)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(0, 84, 148, 0.1)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '10px' }}>
            Сақталған кітаптарды көру үшін кіріңіз
          </h2>
          <p style={{ color: 'var(--text-mid)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            Сақталған кітаптарыңызды көру үшін жүйеге кіріңіз немесе жаңа аккаунт ашыңыз.
          </p>
          <Link to="/" className="btn-primary" style={{ padding: '12px 32px', fontSize: '14px', textDecoration: 'none' }}>
            Басты бетке оралу
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
    <>
      {/* ============================================================
          1. MOBILE VIEW (Тек мобилкада: screen < 768px / md:hidden)
          ============================================================ */}
      <div className="block md:hidden w-full max-w-md mx-auto bg-[#FAFAFA] min-h-screen pb-24 text-slate-900">
        {/* Mobile Header Hero Background */}
        <div
          className="relative h-28 w-full px-4 pt-3 flex justify-end items-start"
          style={{
            background: 'linear-gradient(180deg, #3A5B52 0%, #2A4840 100%)',
          }}
        >
          {/* Top Right Menu button */}
          <Link
            to="/settings"
            className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-white/90 hover:text-white transition-colors"
            title="Баптаулар"
            aria-label="Баптаулар"
          >
            <Menu className="w-4 h-4" />
          </Link>
        </div>

        {/* Content Body */}
        <div className="px-4">
          {/* Avatar & Action Buttons Bar */}
          <div className="flex items-end justify-between -mt-10 mb-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-[74px] h-[74px] rounded-full border-2 border-white bg-[#25453D] text-white shadow flex items-center justify-center font-bold text-xl select-none overflow-hidden">
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
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px]">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* Action button: Share */}
            <div className="flex items-center gap-1.5 mb-1">
              <button
                type="button"
                onClick={handleShareProfile}
                className="p-2 rounded-xl bg-[#F1F5F9] text-slate-700 hover:bg-slate-200 transition-colors"
                title="Бөлісу"
                aria-label="Профильмен бөлісу"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Name and Meta */}
          <div className="mb-3.5">
            <h1 className="text-xl font-black text-slate-900 leading-snug">
              {user.name || 'Оқырман'}
            </h1>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              <span>ID: {user.idNumber || user.id?.substring(0, 7)}</span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span className="text-slate-600 font-semibold">@{user.username || 'username'}</span>
            </div>
            <div className="text-xs text-amber-700 font-bold mt-1 flex items-center gap-1.5">
              <img src="/bonus-coin.png" alt="Бонус" className="w-3.5 h-3.5 object-contain shrink-0" />
              <span>Бонус: {bonusBalance}</span>
            </div>
          </div>

          {/* 2x2 Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {/* Card 1: Сол жақ жоғары - Бүгін */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-col justify-between min-h-[66px]">
              <div className="text-[11px] text-slate-500 font-medium">Бүгін</div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 mt-1">
                <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                <span>{formatReadingTime(personalStats?.todaySeconds || 0)}</span>
              </div>
            </div>

            {/* Card 2: Оң жақ жоғары - Бұл ай */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-col justify-between min-h-[66px]">
              <div className="text-[11px] text-slate-500 font-medium">Бұл ай</div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 mt-1">
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{formatReadingTime(personalStats?.thisMonthSeconds || 0)}</span>
              </div>
            </div>

            {/* Card 3: Сол жақ төмен - Бұл айдағы пик тыңдаған күні мен минуты */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-col justify-between min-h-[66px]">
              <div className="text-[11px] text-slate-500 font-medium truncate">Пик тыңдау</div>
              <div className="mt-1">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{peakDay ? formatReadingTime(peakDay.seconds) : '0 мин'}</span>
                </div>
                {peakDay && (
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {formatDateDMY(peakDay.date)}
                  </div>
                )}
              </div>
            </div>

            {/* Card 4: Оң жақ төмен - Соңғы 7 күн */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-col justify-between min-h-[66px]">
              <div className="text-[11px] text-slate-500 font-medium">Соңғы 7 күн</div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 mt-1">
                <BarChart2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>{formatReadingTime(last7DaysSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="border-b border-slate-200 mb-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-5 min-w-max">
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  activeTab === 'reviews' ? 'text-orange-600' : 'text-slate-500'
                }`}
              >
                Пікірлер
                {activeTab === 'reviews' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shelves')}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  activeTab === 'shelves' ? 'text-orange-600' : 'text-slate-500'
                }`}
              >
                Сөрелер
                {activeTab === 'shelves' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('certificates')}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  activeTab === 'certificates' ? 'text-orange-600' : 'text-slate-500'
                }`}
              >
                Сертификаттар
                {activeTab === 'certificates' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quotes')}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  activeTab === 'quotes' ? 'text-orange-600' : 'text-slate-500'
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
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  activeTab === 'saved' ? 'text-orange-600' : 'text-slate-500'
                }`}
              >
                Ұнағандар
                {activeTab === 'saved' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Tab Contents */}
          {activeTab === 'reviews' && (
            <div className="space-y-2.5">
              {/* Quick Thought card */}
              <Link
                to="/catalog"
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#EA580C] text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {getInitials(user.name)[0]}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{user.name}</div>
                    <div className="text-[11px] text-slate-400">Пікіріңізбен бөлісіңіз...</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              {isLoadingReviews ? (
                <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
              ) : myReviews.length > 0 ? (
                myReviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <Link to={`/book/${rev.bookId}`} className="font-bold text-slate-900 text-xs line-clamp-1">
                        «{rev.bookTitle}»
                      </Link>
                      <div className="flex items-center gap-1 text-amber-500 shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-bold text-slate-700">{rev.rating}</span>
                      </div>
                    </div>
                    {rev.reviewText && (
                      <p className="text-xs text-slate-700 leading-relaxed mb-2 whitespace-pre-line">{rev.reviewText}</p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-50">
                      <span>{formatDateDMY(rev.createdAt)}</span>
                      <span>👍 {rev.likesCount || 0}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                  <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500 mb-2.5">Әзірге пікірлеріңіз жоқ</p>
                  <Link to="/catalog" className="inline-block px-3.5 py-1.5 rounded-xl bg-[#005494] text-white text-xs font-bold">
                    Кітап таңдау
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shelves' && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: 'Барлығы' },
                  { id: 'reading', label: 'Оқып жатырмын' },
                  { id: 'completed', label: 'Оқып болдым' },
                  { id: 'want_to_read', label: 'Жоспарда' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setShelfFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                      shelfFilter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredShelfBooks.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredShelfBooks.map((ub: UserBookRecord) => (
                    <div
                      key={ub.bookId}
                      onClick={() => navigate(`/book/${ub.bookId}`)}
                      className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col"
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                        {ub.coverImage ? (
                          <img src={ub.coverImage} alt={ub.title || 'Кітап'} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2 text-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white font-bold text-xs">
                            {ub.title || 'Кітап'}
                          </div>
                        )}
                        {!ub.isFree && <TandaPremiumBadge />}
                      </div>
                      <div className="p-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900 line-clamp-1">{ub.title || 'Кітап'}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">{ub.author || 'Автор'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                  <BookMarked className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500 mb-2.5">Сөреде кітаптар жоқ</p>
                  <Link to="/catalog" className="inline-block px-3.5 py-1.5 rounded-xl bg-[#005494] text-white text-xs font-bold">
                    Кітаптар қорына өту
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'certificates' && (
            <div>
              {isLoadingCertificates ? (
                <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
              ) : myCertificates.length > 0 ? (
                <div className="space-y-2.5">
                  {myCertificates.map((cert) => (
                    <div key={cert.id} className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          {cert.category || 'Сертификат'}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDateDMY(cert.issuedAt)}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs mb-1">{cert.title}</h4>
                      <div className="text-[10px] font-mono text-slate-600 bg-slate-50 p-1 rounded mb-2">
                        № {cert.certificateNumber}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/certificate/${encodeURIComponent(cert.certificateNumber)}`}
                          className="flex-1 py-1.5 rounded-xl bg-[#005494] text-white text-xs font-bold text-center"
                        >
                          Сертификатты көру
                        </Link>
                        {cert.pdfUrl && (
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-700"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                  <Award className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500 mb-2.5">Әзірге сертификаттар жоқ</p>
                  <Link to="/catalog" className="inline-block px-3.5 py-1.5 rounded-xl bg-[#005494] text-white text-xs font-bold">
                    Оқуды бастау
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-2">
              {quotes.filter((q) => q.isActive).length > 0 ? (
                quotes
                  .filter((q) => q.isActive)
                  .slice(0, 15)
                  .map((q) => (
                    <div key={q.id} className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                      <p className="text-xs font-serif italic text-slate-800 leading-relaxed mb-1.5">«{q.text}»</p>
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 text-[10px]">
                        <div className="font-bold text-slate-700">— {q.author}</div>
                        <button
                          type="button"
                          onClick={() => handleCopyQuote(q)}
                          className="text-slate-500 font-semibold p-0.5 inline-flex items-center gap-1"
                        >
                          {copiedQuoteId === q.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                  <QuoteIcon className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500 mb-2.5">Дәйексөздер табылмады</p>
                  <Link to="/quotes" className="inline-block px-3.5 py-1.5 rounded-xl bg-[#005494] text-white text-xs font-bold">
                    Дәйексөздерге өту
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div>
              {savedBooks.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {savedBooks.map((book) => {
                    const hasAudio = Boolean(book.hasAudio || (book.audioUrl && book.audioUrl.trim()) || (book.audioChapters && book.audioChapters.length > 0));
                    const hasText = Boolean(book.hasEbook || (book.ebookUrl && book.ebookUrl.trim()) || (book.pdfUrl && book.pdfUrl.trim()) || (book.epubUrl && book.epubUrl.trim()) || (book.content && book.content.trim()));

                    return (
                      <div
                        key={book.id}
                        onClick={() => navigate(`/book/${book.id}`)}
                        className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col"
                      >
                        <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                          {book.coverImage ? (
                            <img src={book.coverImage} alt={book.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-2 text-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white font-bold text-xs">
                              {book.title}
                            </div>
                          )}
                          {!book.isFree && <TandaPremiumBadge />}
                        </div>

                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="font-bold text-xs text-slate-900 line-clamp-1">{book.title}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{book.author}</div>
                          </div>

                          <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                            {hasText && (
                              <Link to={`/read/${book.id}`} className="flex-1 py-1 rounded bg-sky-50 text-[#005494] text-[10px] font-bold text-center">
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
                                className="flex-1 py-1 rounded bg-orange-50 text-orange-600 text-[10px] font-bold flex items-center justify-center gap-0.5"
                              >
                                <Headphones className="w-2.5 h-2.5" />
                                Тыңдау
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveSaved(book.id, book.title)}
                              className="p-1 rounded bg-rose-50 text-rose-600"
                              title="Өшіру"
                            >
                              <Bookmark className="w-3 h-3 fill-rose-600 text-rose-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                  <Bookmark className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500 mb-2.5">Сақталған кітаптар жоқ</p>
                  <Link to="/catalog" className="inline-block px-3.5 py-1.5 rounded-xl bg-[#005494] text-white text-xs font-bold">
                    Кітаптар қорына өту
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          2. DESKTOP VIEW (Комп нұсқасы өзгеріссіз: screen >= 768px / hidden md:block)
          ============================================================ */}
      <div className="hidden md:block max-w-7xl mx-auto my-8 px-6">
        {/* Top back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-mid)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← Артқа оралу
        </button>

        {/* Saved Books Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 className="section-title" style={{ fontSize: '26px', margin: 0 }}>
                Сақталған кітаптар: {savedBooks.length}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link
                to="/my-books"
                className="btn-primary"
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                Менің сөрем
              </Link>
              <Link
                to="/catalog"
                className="btn-outline"
                style={{
                  borderColor: 'var(--blue)',
                  color: 'var(--blue)',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                + Жаңа кітап қосу
              </Link>
            </div>
          </div>

          {/* Books Grid */}
          {savedBooks.length > 0 ? (
            <div className="books-grid">
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
                    className="book-card"
                    onClick={() => navigate(`/book/${book.id}`)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    <div
                      className="book-cover"
                      style={{
                        background: book.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {book.coverImage && (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          referrerPolicy="no-referrer"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 1,
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      {!book.isFree && <TandaPremiumBadge />}
                      <div style={{ position: 'relative', zIndex: 2 }}>
                        {!book.coverImage && (
                          <>
                            <div className="cover-title">{book.title}</div>
                            <div className="cover-author-text">{book.author}</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="book-meta">
                      <div className="book-title">{book.title}</div>
                      <div className="book-author">{book.author}</div>
                      <span className="book-category">{book.category}</span>
                    </div>

                    <div className="book-actions" onClick={(e) => e.stopPropagation()}>
                      {hasText ? (
                        <Link to={`/read/${book.id}`} className="btn-book-action btn-read">
                          Оқу
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="btn-book-action btn-disabled"
                          title="Электронды кітап нұсқасы жүктелмеген"
                        >
                          Оқу
                        </button>
                      )}

                      {hasAudio ? (
                        <button
                          type="button"
                          onClick={() => {
                            playBook(book);
                            navigate(`/listen/${book.id}`);
                          }}
                          className="btn-book-action btn-listen"
                        >
                          Тыңдау
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="btn-book-action btn-disabled"
                          title="Аудио нұсқасы жүктелмеген"
                        >
                          Тыңдау
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(book.id, book.title)}
                        className="btn-book-action"
                        title="Сақталғандардан өшіру"
                        style={{
                          background: '#FEF2F2',
                          color: '#DC2626',
                          borderColor: '#FCA5A5',
                        }}
                      >
                        Өшіру
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '60px 24px',
                textAlign: 'center',
                border: '2px dashed #E2E8F0',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#F8FAFC',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                Әзірге сақталған кітаптар жоқ
              </h3>
              <p style={{ color: 'var(--text-mid)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                Кітаптар қорына өтіп, өзіңізге ұнаған кез келген кітаптағы <strong>«Кейін оқимын»</strong> батырмасын басыңыз. Олар осы бетке сақталады.
              </p>
              <Link
                to="/catalog"
                className="btn-primary"
                style={{ padding: '12px 28px', fontSize: '14px', textDecoration: 'none' }}
              >
                Кітаптар қорына өту
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Premium Modal */}
      {isPremiumModalOpen && (
        <PremiumModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
      )}
    </>
  );
};
