import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { StarRating } from '../../../components/ui/StarRating';
import { BookReview, RatingSummary } from '../../../types';
import { reviewsApi } from '../../../shared/api/reviews.api';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToastStore } from '../../../store/useToastStore';

interface ReviewSectionProps {
  bookId: string;
  bookTitle?: string;
  onRatingUpdated?: (newAvg: number, newCount: number) => void;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  bookId,
  bookTitle,
  onRatingUpdated,
}) => {
  const { isAuthenticated, user, openAuthModal, role } = useAuthStore();
  const { showToast } = useToastStore();

  const [summary, setSummary] = React.useState<RatingSummary | null>(null);
  const [reviews, setReviews] = React.useState<BookReview[]>([]);
  const [myReview, setMyReview] = React.useState<BookReview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [sort, setSort] = React.useState<'newest' | 'helpful' | 'rating_desc' | 'rating_asc'>('newest');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formRating, setFormRating] = React.useState(5);
  const [formText, setFormText] = React.useState('');
  const [formIsSpoiler, setFormIsSpoiler] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = React.useState<Record<number, boolean>>({});

  const ratingLabels: Record<number, string> = {
    1: 'Өте нашар',
    2: 'Орташа',
    3: 'Жақсы',
    4: 'Өте жақсы',
    5: 'Керемет!',
  };

  const loadInitialData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, revData, myRevData] = await Promise.all([
        reviewsApi.getSummary(bookId).catch(() => null),
        reviewsApi.getReviews(bookId, 0, 10, sort).catch(() => ({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 10,
          last: true,
        })),
        isAuthenticated ? reviewsApi.getMyReview(bookId).catch(() => null) : Promise.resolve(null),
      ]);

      if (sumData) setSummary(sumData);
      setReviews(revData.content || []);
      setHasMore(!revData.last && revData.totalPages > 1);
      setPage(0);
      setMyReview(myRevData);
    } catch (err) {
      console.error('Failed to load reviews data', err);
    } finally {
      setLoading(false);
    }
  }, [bookId, sort, isAuthenticated]);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await reviewsApi.getReviews(bookId, nextPage, 10, sort);
      setReviews((prev) => [...prev, ...(data.content || [])]);
      setPage(nextPage);
      setHasMore(!data.last);
    } catch (err) {
      showToast('Пікірлерді жүктеу кезінде қате кетті', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenWriteModal = () => {
    if (!isAuthenticated) {
      showToast('Пікір немесе баға қалдыру үшін тіркеліңіз', 'info');
      openAuthModal();
      return;
    }

    if (myReview) {
      setFormRating(myReview.rating);
      setFormText(myReview.reviewText || '');
      setFormIsSpoiler(myReview.isSpoiler || false);
    } else {
      setFormRating(5);
      setFormText('');
      setFormIsSpoiler(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (formRating < 1 || formRating > 5) {
      showToast('1-ден 5-ке дейін баға таңдаңыз', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const saved = await reviewsApi.submitReview(bookId, {
        rating: formRating,
        reviewText: formText.trim() || undefined,
        isSpoiler: formIsSpoiler,
      });

      showToast(myReview ? 'Пікіріңіз сәтті жаңартылды!' : 'Бағаңыз үшін рақмет!', 'success');
      setMyReview(saved);
      setIsModalOpen(false);

      // Refresh data
      const [sumData, revData] = await Promise.all([
        reviewsApi.getSummary(bookId),
        reviewsApi.getReviews(bookId, 0, 10, sort),
      ]);
      setSummary(sumData);
      setReviews(revData.content || []);
      setHasMore(!revData.last);
      setPage(0);

      if (onRatingUpdated && sumData) {
        onRatingUpdated(sumData.averageRating, sumData.ratingCount);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Пікірді сақтау мүмкін болмады';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!window.confirm('Пікірді өшіргіңіз келетініне сенімдісіз бе?')) return;

    try {
      await reviewsApi.deleteReview(bookId, reviewId);
      showToast('Пікір өшірілді', 'info');
      if (myReview && myReview.id === reviewId) {
        setMyReview(null);
      }
      const [sumData, revData] = await Promise.all([
        reviewsApi.getSummary(bookId),
        reviewsApi.getReviews(bookId, 0, 10, sort),
      ]);
      setSummary(sumData);
      setReviews(revData.content || []);
      setHasMore(!revData.last);
      setPage(0);

      if (onRatingUpdated && sumData) {
        onRatingUpdated(sumData.averageRating, sumData.ratingCount);
      }
    } catch (err: any) {
      showToast('Пікірді өшіру кезінде қате шықты', 'error');
    }
  };

  const handleToggleReaction = async (reviewId: number, type: 'LIKE' | 'DISLIKE') => {
    if (!isAuthenticated) {
      showToast('Пікірге баға беру үшін жүйеге кіріңіз', 'info');
      openAuthModal();
      return;
    }

    try {
      const res = await reviewsApi.toggleReaction(reviewId, type);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                userReaction: res.userReaction,
                isLikedByCurrentUser: res.isLiked,
                likesCount: res.likesCount,
                dislikesCount: res.dislikesCount,
              }
            : r
        )
      );
      if (myReview && myReview.id === reviewId) {
        setMyReview((prev) =>
          prev
            ? {
                ...prev,
                userReaction: res.userReaction,
                isLikedByCurrentUser: res.isLiked,
                likesCount: res.likesCount,
                dislikesCount: res.dislikesCount,
              }
            : null
        );
      }
    } catch (err) {
      showToast('Қате орын алды', 'error');
    }
  };

  const toggleSpoiler = (id: number) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const totalRatingCount = summary?.ratingCount || 0;
  const avgRating = summary?.averageRating || 0;

  return (
    <div className="mt-8 sm:mt-12 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-sm">
      {/* Top Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Пікірлер: {totalRatingCount}
          </h2>
        </div>

        <button
          type="button"
          onClick={handleOpenWriteModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>{myReview ? 'Өз пікіріңізді өңдеу' : 'Бағалау және пікір жазу'}</span>
        </button>
      </div>

      {/* User's own pinned review card (if exists) */}
      {myReview && (
        <div className="my-6 p-4 sm:p-5 bg-blue-50/60 border border-blue-100 rounded-2xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                Сіздің бағаңыз
              </span>
              <StarRating value={myReview.rating} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenWriteModal}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
              >
                Өңдеу
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReview(myReview.id)}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 ml-2"
              >
                Өшіру
              </button>
            </div>
          </div>
          {myReview.reviewText ? (
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line mt-2">
              {myReview.reviewText}
            </p>
          ) : (
            <p className="text-xs text-slate-500 italic mt-1">
              (Сіз тек жұлдызша бағасын қойдыңыз, мәтіндік пікір жазбадыңыз)
            </p>
          )}
        </div>
      )}

      {/* Sorting Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-6 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'newest', label: 'Ең жаңасы' },
            { id: 'helpful', label: 'Ең пайдалысы' },
            { id: 'rating_desc', label: 'Жоғары баға' },
            { id: 'rating_asc', label: 'Төмен баға' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSort(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                sort === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4 mt-2">
        {loading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse flex gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/6" />
                  <div className="h-12 bg-slate-200 rounded w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">Әзірге пікірлер жоқ</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Бұл кітапқа алғашқы болып баға беріп, өз әсеріңізбен бөлісіңіз!
            </p>
            <button
              type="button"
              onClick={handleOpenWriteModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all"
            >
              Бірінші болып пікір жазу
            </button>
          </div>
        ) : (
          reviews.map((rev) => {
            const isSpoilerHidden = rev.isSpoiler && !revealedSpoilers[rev.id];
            return (
              <div
                key={rev.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 transition-all"
              >
                {/* Review Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {rev.userAvatar ? (
                      <img
                        src={rev.userAvatar}
                        alt={rev.userName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs">
                        {getInitials(rev.userName)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{rev.userName}</span>
                        {rev.isVerifiedReader && (
                          <span className="inline-flex items-center" title="Тексерілген оқырман (Кітаптың 20%+ оқыған)">
                            <img
                              src="/assets/verified-reader-badge.png"
                              alt="Тексерілген оқырман"
                              className="w-4 h-4 object-contain inline-block drop-shadow-sm"
                            />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating value={rev.rating} size="sm" />
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Delete if admin or owner) */}
                  {(rev.canDelete || role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      title="Өшіру"
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Review Body */}
                {rev.reviewText && (
                  <div className="mt-3 text-sm text-slate-700 leading-relaxed">
                    {isSpoilerHidden ? (
                      <button
                        type="button"
                        onClick={() => toggleSpoiler(rev.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer py-1 text-left"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Бұл пікірде сюжеттік спойлер бар. Оқу үшін басыңыз.</span>
                      </button>
                    ) : (
                      <p className="whitespace-pre-line">{rev.reviewText}</p>
                    )}
                  </div>
                )}

                {/* Like / Dislike Buttons */}
                <div className="mt-3 pt-2.5 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-50">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleReaction(rev.id, 'LIKE')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
                      rev.userReaction === 'LIKE' || rev.isLikedByCurrentUser
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title="Лайк"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill={rev.userReaction === 'LIKE' || rev.isLikedByCurrentUser ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                    </svg>
                    {rev.likesCount > 0 && <span className="text-xs font-bold">{rev.likesCount}</span>}
                  </button>

                  {/* Dislike Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleReaction(rev.id, 'DISLIKE')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
                      rev.userReaction === 'DISLIKE'
                        ? 'bg-rose-50 text-rose-600'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title="Дизлайк"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill={rev.userReaction === 'DISLIKE' ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ transform: 'rotate(180deg)' }}
                    >
                      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                    </svg>
                    {(rev.dislikesCount || 0) > 0 && <span className="text-xs font-bold">{rev.dislikesCount}</span>}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-6">
          <button
            type="button"
            disabled={loadingMore}
            onClick={handleLoadMore}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
          >
            {loadingMore ? 'Жүктелуде...' : 'Тағы пікірлерді көру'}
          </button>
        </div>
      )}

      {/* Modal: Write or Edit Review */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-black text-slate-900">
              {myReview ? 'Пікірді өңдеу' : 'Бағалау және пікір қалдыру'}
            </h3>
            {bookTitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
                «{bookTitle}»
              </p>
            )}

            <form onSubmit={handleSubmitReview} className="mt-6 space-y-5">
              {/* Star Rating Select */}
              <div className="p-4 bg-slate-50 rounded-2xl text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Кітапты бағалаңыз
                </p>
                <div className="flex justify-center">
                  <StarRating
                    value={formRating}
                    size="xl"
                    interactive
                    onChange={(newVal) => setFormRating(newVal)}
                  />
                </div>
                <p className="text-sm font-black text-blue-600 mt-2">
                  {ratingLabels[formRating] || ''}
                </p>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Пікіріңіз
                </label>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Бұл кітап сізге несімен ұнады? Басқа оқырмандарға нені білгені жөн?.."
                  className="w-full p-3.5 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                />
                <div className="text-right text-[11px] text-slate-400 font-medium mt-1">
                  {formText.length} / 2000
                </div>
              </div>

              {/* Spoiler Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/80 transition-colors">
                <input
                  type="checkbox"
                  checked={formIsSpoiler}
                  onChange={(e) => setFormIsSpoiler(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Бұл пікірде сюжеттік спойлер бар
                </span>
              </label>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Бас тарту
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
                >
                  {isSubmitting ? 'Сақталуда...' : myReview ? 'Өзгерісті сақтау' : 'Жариялау'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
