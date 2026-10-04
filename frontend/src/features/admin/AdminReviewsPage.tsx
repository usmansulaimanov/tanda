import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../../shared/api/reviews.api';
import { booksApi } from '../../shared/api/books.api';
import { useToastStore } from '../../store/useToastStore';
import { BookReview, Book } from '../../types';
import { Search, Filter, Trash2, MessageSquare, Star, BookOpen, AlertTriangle, ExternalLink, User, X, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';

const formatDate = (isoString?: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

export const AdminReviewsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const [search, setSearch] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [page, setPage] = useState(0);
  const [reviewToDelete, setReviewToDelete] = useState<BookReview | null>(null);

  const pageSize = 15;

  // 1. Fetch all books from the API so the dropdown always has complete real database books
  const { data: allBooks = [], isLoading: isBooksLoading } = useQuery({
    queryKey: ['adminAllBooksList'],
    queryFn: () => booksApi.getAll({ includeDeleted: false }),
    staleTime: 60 * 1000,
  });

  // 2. Fetch reviews list based on current filters
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminReviews', page, selectedRating, selectedBookId, search],
    queryFn: () =>
      reviewsApi.getAdminReviews({
        page,
        size: pageSize,
        rating: selectedRating !== null ? selectedRating : undefined,
        bookId: selectedBookId || undefined,
        search: search.trim() || undefined,
      }),
    staleTime: 10 * 1000,
  });

  // 3. If a specific book is selected, fetch its rating summary breakdown
  const { data: ratingSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['adminBookRatingSummary', selectedBookId],
    queryFn: () => reviewsApi.getSummary(selectedBookId),
    enabled: Boolean(selectedBookId),
    staleTime: 10 * 1000,
  });

  const booksList: Book[] = Array.isArray(allBooks) ? allBooks : ((allBooks as any)?.content || []);
  const selectedBook = booksList.find((b) => String(b.id) === String(selectedBookId));

  const deleteMutation = useMutation({
    mutationFn: (reviewId: number) => reviewsApi.adminDeleteReview(reviewId),
    onSuccess: () => {
      showToast('Пікір сәтті өшірілді', 'success');
      setReviewToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      queryClient.invalidateQueries({ queryKey: ['adminBookRatingSummary'] });
      queryClient.invalidateQueries({ queryKey: ['bookReviews'] });
      queryClient.invalidateQueries({ queryKey: ['ratingSummary'] });
    },
    onError: () => {
      showToast('Пікірді өшіру кезінде қате орын алды', 'error');
    },
  });

  const handleDeleteConfirm = () => {
    if (!reviewToDelete) return;
    deleteMutation.mutate(reviewToDelete.id);
  };

  const reviews = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Пікірлерді басқару
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Оқырмандардың кітаптарға жазған барлық пікірлері мен бағаларын бақылау және модерациялау
          </p>
        </div>

        <Link
          to="/admin/home"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors self-start sm:self-auto bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl"
        >
          <span>← Басқару орталығы</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
          {/* Search box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Кітап аты, оқырман есімі немесе пікір мәтіні бойынша іздеу..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Book selector (populated from all database books) */}
          <div className="md:col-span-6">
            <select
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(e.target.value);
                setPage(0);
              }}
              disabled={isBooksLoading}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium cursor-pointer"
            >
              <option value="">Барлық кітаптар</option>
              {booksList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} — {b.author}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rating filter pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Бағасы:
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedRating(null);
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRating === null
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Барлығы
          </button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => {
                setSelectedRating(selectedRating === rating ? null : rating);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                selectedRating === rating
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{rating} жұлдыз</span>
            </button>
          ))}

          {/* Reset Filters button if any filter is active */}
          {(selectedRating !== null || selectedBookId || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedRating(null);
                setSelectedBookId('');
                setSearch('');
                setPage(0);
              }}
              className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Сүзгілерді тазалау</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Book Rating Summary Card (Shown when a book is selected) */}
      {selectedBook && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 mb-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            {/* Book Info */}
            <div className="flex items-start gap-4">
              {selectedBook.coverImage ? (
                <img
                  src={selectedBook.coverImage}
                  alt={selectedBook.title}
                  className="w-16 sm:w-20 h-24 sm:h-28 object-cover rounded-xl shadow-md shrink-0 border border-slate-200"
                />
              ) : (
                <div className="w-16 sm:w-20 h-24 sm:h-28 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 text-slate-400">
                  <BookOpen className="w-8 h-8" />
                </div>
              )}

              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 mb-2">
                  Таңдалған кітап
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                  {selectedBook.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-0.5">
                  Авторы: <span className="text-slate-900 font-bold">{selectedBook.author}</span>
                </p>
                {selectedBook.category && (
                  <span className="text-xs text-slate-400 mt-1 block">
                    Санаты: {selectedBook.category}
                  </span>
                )}

                <div className="flex items-center gap-3 mt-3">
                  <Link
                    to={`/books/${selectedBook.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <span>Кітап парақшасын ашу</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBookId('');
                      setPage(0);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Барлық кітаптарды көрсету</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Rating Score & Breakdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 w-full lg:w-auto bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/70">
              {/* Overall Score */}
              <div className="text-center sm:text-left pr-0 sm:pr-6 sm:border-r sm:border-slate-200">
                <div className="flex items-center justify-center sm:justify-start gap-1 text-amber-500 font-black text-3xl sm:text-4xl">
                  <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
                  <span>
                    {ratingSummary?.averageRating !== undefined && ratingSummary.averageRating > 0
                      ? (ratingSummary.averageRating % 1 === 0 ? ratingSummary.averageRating.toFixed(0) : ratingSummary.averageRating.toFixed(1))
                      : (selectedBook.averageRating && selectedBook.averageRating > 0
                          ? (selectedBook.averageRating % 1 === 0 ? selectedBook.averageRating.toFixed(0) : selectedBook.averageRating.toFixed(1))
                          : '0')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  Орташа бағасы
                </p>
                <p className="text-[11px] text-slate-700 font-bold mt-0.5">
                  {ratingSummary?.ratingCount ?? selectedBook.ratingCount ?? 0} баға / пікір
                </p>
              </div>

              {/* Breakdown Bars */}
              <div className="space-y-1.5 min-w-[200px] flex-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingSummary?.distribution?.[star] || 0;
                  const pct = ratingSummary?.percentages?.[star] || 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-7 font-bold text-slate-700 text-right flex items-center justify-end gap-0.5">
                        <span>{star}</span>
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />
                      </span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-[11px] font-medium text-slate-500 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <span>Пікірлер тізімі</span>
          {selectedBook && (
            <span className="text-xs font-bold text-slate-500">
              («{selectedBook.title}» бойынша)
            </span>
          )}
        </h3>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
          Барлығы: {totalElements} пікір
        </span>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full" />
                  <div className="space-y-1.5">
                    <div className="w-32 h-4 bg-slate-200 rounded" />
                    <div className="w-20 h-3 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="w-16 h-6 bg-slate-200 rounded-lg" />
              </div>
              <div className="w-full h-12 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-rose-700">Пікірлерді жүктеу кезінде қате орын алды</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors"
          >
            Қайта көру
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Пікірлер табылмады</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {search || selectedRating !== null || selectedBookId
              ? 'Іздеу сүзгілері бойынша ешқандай пікір табылмады. Сүзгілерді тазалап көріңіз.'
              : 'Платформада әлі ешқандай пікір жазылмаған.'}
          </p>
          {(selectedRating !== null || selectedBookId || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedRating(null);
                setSelectedBookId('');
                setSearch('');
                setPage(0);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Барлық пікірлерді көру
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Top Row: User and Book info */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
                {/* User Info */}
                <div className="flex items-center gap-3">
                  {review.userAvatar ? (
                    <img
                      src={review.userAvatar}
                      alt={review.userName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                      {review.userName ? review.userName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900">
                        {review.userName || 'Оқырман'}
                      </span>

                      {/* Verified reader rosette */}
                      {review.isVerifiedReader && (
                        <img
                          src="/assets/verified-reader-badge.png"
                          alt="Тексерілген оқырман"
                          title="Кітапты оқыған немесе тыңдаған тексерілген оқырман"
                          className="w-4 h-4 object-contain inline-block shrink-0"
                        />
                      )}

                      {review.userRole === 'admin' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          Әкімші
                        </span>
                      )}
                      {review.userRole === 'author' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                          Автор
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      {review.userEmail && <span>{review.userEmail}</span>}
                      {review.userEmail && <span>•</span>}
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Book Link Info */}
                <div className="flex items-center gap-2.5 self-start bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 max-w-full sm:max-w-xs">
                  {review.bookCoverImage ? (
                    <img
                      src={review.bookCoverImage}
                      alt={review.bookTitle || ''}
                      className="w-7 h-10 object-cover rounded-md shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-10 bg-slate-200 rounded-md flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/books/${review.bookId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors truncate block"
                      title={review.bookTitle || 'Кітапты ашу'}
                    >
                      {review.bookTitle || `Кітап #${review.bookId}`}
                    </Link>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      Кітап парақшасы <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Rating & Review Content */}
              <div className="py-3">
                <div className="flex items-center gap-2 mb-2">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating ? 'fill-amber-400' : 'text-slate-200 fill-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-slate-800">
                    {review.rating}
                  </span>

                  {review.isSpoiler && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Спойлер
                    </span>
                  )}
                </div>

                {review.reviewText ? (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {review.reviewText}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    (Мәтінсіз тек баға қойылған)
                  </p>
                )}
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {/* Like / Dislike Counts */}
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600" title="Лайктар саны">
                    <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                    <span>{review.likesCount || 0}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600" title="Дизлайктар саны">
                    <ThumbsDown className="w-3.5 h-3.5 text-slate-500" />
                    <span>{review.dislikesCount || 0}</span>
                  </span>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => setReviewToDelete(review)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl transition-all border border-rose-200/60 shadow-xs active:scale-95 cursor-pointer"
                  title="Пікірді платформадан өшіру"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Өшіру</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Алдыңғы
          </button>
          <span className="text-xs font-bold text-slate-600 px-2">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Келесі →
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Пікірді өшіруді растайсыз ба?
              </h3>
              <p className="text-xs text-slate-500">
                Бұл пікір платформадан біржолата жойылады және кітаптың орташа рейтингі автоматты түрде қайта есептеледі.
              </p>
            </div>

            {/* Review Preview in Modal */}
            <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-700 border border-slate-200/70 max-h-36 overflow-y-auto">
              <div className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>{reviewToDelete.userName || 'Оқырман'}</span>
                <span className="text-amber-500 font-extrabold">★ {reviewToDelete.rating}</span>
              </div>
              <p className="line-clamp-3 text-slate-600">
                {reviewToDelete.reviewText || '(Тек баға қойылған)'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Өшірілуде...' : 'Иә, өшіру'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
