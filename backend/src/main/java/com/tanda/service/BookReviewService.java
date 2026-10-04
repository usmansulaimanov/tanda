package com.tanda.service;

import com.tanda.dto.review.BookReviewResponseDto;
import com.tanda.dto.review.CreateReviewRequestDto;
import com.tanda.dto.review.RatingSummaryResponseDto;
import com.tanda.entity.Book;
import com.tanda.entity.BookReview;
import com.tanda.entity.BookReviewLike;
import com.tanda.entity.BookReviewLikeId;
import com.tanda.entity.ReadingProgress;
import com.tanda.entity.User;
import com.tanda.entity.UserBook;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.exception.UnauthorizedException;
import com.tanda.repository.BookRepository;
import com.tanda.repository.BookReviewLikeRepository;
import com.tanda.repository.BookReviewRepository;
import com.tanda.repository.ReadingProgressRepository;
import com.tanda.repository.UserBookRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookReviewService {

    private final BookReviewRepository bookReviewRepository;
    private final BookReviewLikeRepository bookReviewLikeRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final ReadingProgressRepository readingProgressRepository;
    private final UserBookRepository userBookRepository;

    @Transactional
    public BookReviewResponseDto addOrUpdateReview(String bookId, String userId, CreateReviewRequestDto dto) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", bookId));

        if (Boolean.TRUE.equals(book.getIsDeleted())) {
            throw new BadRequestException("Өшірілген кітапқа пікір қалдыруға болмайды");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        BookReview review = bookReviewRepository.findByBookIdAndUserId(bookId, userId)
                .orElseGet(() -> BookReview.builder()
                        .book(book)
                        .user(user)
                        .build());

        review.setRating(dto.getRating());
        review.setReviewText(dto.getReviewText() != null && !dto.getReviewText().trim().isEmpty() ? dto.getReviewText().trim() : null);
        review.setIsSpoiler(Boolean.TRUE.equals(dto.getIsSpoiler()));

        review = bookReviewRepository.save(review);
        recalculateAndSaveBookRating(book);

        log.info("Review saved for bookId={} by userId={}, rating={}", bookId, userId, dto.getRating());
        return mapToDto(review, userId, false);
    }

    @Transactional
    public void deleteReview(Long reviewId, String userId, boolean isAdmin) {
        BookReview review = bookReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("BookReview", "id", reviewId));

        boolean isOwner = review.getUser().getId().equals(userId);
        if (!isOwner && !isAdmin) {
            throw new UnauthorizedException("Бұл пікірді өшіруге құқығыңыз жоқ");
        }

        Book book = review.getBook();
        bookReviewRepository.delete(review);
        recalculateAndSaveBookRating(book);

        log.info("Review deleted reviewId={} for bookId={} by userId={}, isAdmin={}", reviewId, book.getId(), userId, isAdmin);
    }

    @Transactional(readOnly = true)
    public Page<BookReviewResponseDto> getReviews(String bookId, Pageable pageable, String currentUserId, boolean isAdmin) {
        if (!bookRepository.existsById(bookId)) {
            throw new ResourceNotFoundException("Book", "id", bookId);
        }

        Page<BookReview> reviewsPage = bookReviewRepository.findByBookIdWithUser(bookId, pageable);

        Map<Long, String> userReactions = new HashMap<>();
        if (currentUserId != null && !reviewsPage.isEmpty()) {
            List<Long> reviewIds = reviewsPage.getContent().stream()
                    .map(BookReview::getId)
                    .collect(Collectors.toList());
            List<BookReviewLike> likes = bookReviewLikeRepository.findByIdUserIdAndIdReviewIdIn(currentUserId, reviewIds);
            for (BookReviewLike like : likes) {
                userReactions.put(like.getId().getReviewId(), like.getReactionType() != null ? like.getReactionType() : "LIKE");
            }
        }

        return reviewsPage.map(review -> mapToDtoWithReactions(review, currentUserId, isAdmin, userReactions.get(review.getId())));
    }

    @Transactional(readOnly = true)
    public BookReviewResponseDto getMyReview(String bookId, String userId) {
        return bookReviewRepository.findByBookIdAndUserId(bookId, userId)
                .map(review -> {
                    String reaction = bookReviewLikeRepository.findByIdReviewIdAndIdUserId(review.getId(), userId)
                            .map(BookReviewLike::getReactionType)
                            .orElse(null);
                    return mapToDtoWithReactions(review, userId, false, reaction);
                })
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public RatingSummaryResponseDto getRatingSummary(String bookId) {
        if (!bookRepository.existsById(bookId)) {
            throw new ResourceNotFoundException("Book", "id", bookId);
        }

        Double avg = bookReviewRepository.getAverageRatingByBookId(bookId);
        Long total = bookReviewRepository.countByBookId(bookId);

        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }

        List<Object[]> grouped = bookReviewRepository.countRatingsGroupedByRating(bookId);
        for (Object[] row : grouped) {
            if (row[0] != null && row[1] != null) {
                Integer rating = ((Number) row[0]).intValue();
                Long count = ((Number) row[1]).longValue();
                distribution.put(rating, count);
            }
        }

        Map<Integer, Double> percentages = new HashMap<>();
        long totalCount = total != null ? total : 0L;
        for (int i = 1; i <= 5; i++) {
            long count = distribution.getOrDefault(i, 0L);
            double pct = totalCount > 0 ? (double) count / totalCount * 100.0 : 0.0;
            percentages.put(i, Math.round(pct * 10.0) / 10.0);
        }

        double finalAvg = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;

        return RatingSummaryResponseDto.builder()
                .averageRating(finalAvg)
                .ratingCount((int) totalCount)
                .distribution(distribution)
                .percentages(percentages)
                .build();
    }

    @Transactional
    public Map<String, Object> toggleReaction(Long reviewId, String userId, String reactionType) {
        String normalizedType = "DISLIKE".equalsIgnoreCase(reactionType) ? "DISLIKE" : "LIKE";

        BookReview review = bookReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("BookReview", "id", reviewId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        BookReviewLikeId likeId = new BookReviewLikeId(reviewId, userId);
        Optional<BookReviewLike> existingOpt = bookReviewLikeRepository.findById(likeId);

        String finalReaction;
        int likes = review.getLikesCount() != null ? review.getLikesCount() : 0;
        int dislikes = review.getDislikesCount() != null ? review.getDislikesCount() : 0;

        if (existingOpt.isPresent()) {
            BookReviewLike existing = existingOpt.get();
            String currentType = existing.getReactionType() != null ? existing.getReactionType() : "LIKE";
            if (normalizedType.equalsIgnoreCase(currentType)) {
                // Clicked same button -> toggle off (remove)
                bookReviewLikeRepository.delete(existing);
                if ("LIKE".equals(normalizedType)) {
                    likes = Math.max(0, likes - 1);
                } else {
                    dislikes = Math.max(0, dislikes - 1);
                }
                finalReaction = null;
            } else {
                // Switched from LIKE to DISLIKE or vice versa
                if ("LIKE".equals(normalizedType)) {
                    likes += 1;
                    dislikes = Math.max(0, dislikes - 1);
                } else {
                    dislikes += 1;
                    likes = Math.max(0, likes - 1);
                }
                existing.setReactionType(normalizedType);
                bookReviewLikeRepository.save(existing);
                finalReaction = normalizedType;
            }
        } else {
            // New reaction
            BookReviewLike newReaction = BookReviewLike.builder()
                    .id(likeId)
                    .review(review)
                    .user(user)
                    .reactionType(normalizedType)
                    .build();
            bookReviewLikeRepository.save(newReaction);
            if ("LIKE".equals(normalizedType)) {
                likes += 1;
            } else {
                dislikes += 1;
            }
            finalReaction = normalizedType;
        }

        review.setLikesCount(likes);
        review.setDislikesCount(dislikes);
        bookReviewRepository.save(review);

        Map<String, Object> response = new HashMap<>();
        response.put("userReaction", finalReaction);
        response.put("isLiked", "LIKE".equals(finalReaction));
        response.put("likesCount", review.getLikesCount());
        response.put("dislikesCount", review.getDislikesCount());
        return response;
    }

    private void recalculateAndSaveBookRating(Book book) {
        Double avg = bookReviewRepository.getAverageRatingByBookId(book.getId());
        Long total = bookReviewRepository.countByBookId(book.getId());

        double finalAvg = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
        int finalCount = total != null ? total.intValue() : 0;

        book.setAverageRating(finalAvg);
        book.setRatingCount(finalCount);
        bookRepository.save(book);
    }

    @Transactional(readOnly = true)
    public Page<BookReviewResponseDto> getAdminReviews(String bookId, Integer rating, String search, Pageable pageable, String currentUserId) {
        String searchTrimmed = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        String bookIdTrimmed = (bookId != null && !bookId.trim().isEmpty()) ? bookId.trim() : null;

        Page<BookReview> reviewsPage = bookReviewRepository.findAllForAdmin(bookIdTrimmed, rating, searchTrimmed, pageable);

        Map<Long, String> userReactions = new HashMap<>();
        if (currentUserId != null && !reviewsPage.isEmpty()) {
            List<Long> reviewIds = reviewsPage.getContent().stream()
                    .map(BookReview::getId)
                    .collect(Collectors.toList());
            List<BookReviewLike> likes = bookReviewLikeRepository.findByIdUserIdAndIdReviewIdIn(currentUserId, reviewIds);
            for (BookReviewLike like : likes) {
                userReactions.put(like.getId().getReviewId(), like.getReactionType() != null ? like.getReactionType() : "LIKE");
            }
        }

        return reviewsPage.map(review -> mapToDtoWithReactions(review, currentUserId, true, userReactions.get(review.getId())));
    }

    private BookReviewResponseDto mapToDto(BookReview review, String currentUserId, boolean isAdmin) {
        String reaction = null;
        if (currentUserId != null) {
            reaction = bookReviewLikeRepository.findByIdReviewIdAndIdUserId(review.getId(), currentUserId)
                    .map(BookReviewLike::getReactionType)
                    .orElse(null);
        }
        return mapToDtoWithReactions(review, currentUserId, isAdmin, reaction);
    }

    private BookReviewResponseDto mapToDtoWithReactions(BookReview review, String currentUserId, boolean isAdmin, String userReaction) {
        User author = review.getUser();
        Book book = review.getBook();
        boolean isOwner = currentUserId != null && currentUserId.equals(author.getId());
        boolean isVerified = checkIsVerifiedReader(author, book);
        boolean isEdited = review.getUpdatedAt() != null
                && review.getCreatedAt() != null
                && Duration.between(review.getCreatedAt(), review.getUpdatedAt()).abs().toSeconds() > 1;

        return BookReviewResponseDto.builder()
                .id(review.getId())
                .bookId(book.getId())
                .bookTitle(book.getTitle())
                .bookCoverImage(book.getCoverImage())
                .userId(author.getId())
                .userName(author.getName())
                .userEmail(author.getEmail())
                .userAvatar(author.getAvatarUrl())
                .userRole(author.getRole())
                .rating(review.getRating())
                .reviewText(review.getReviewText())
                .isSpoiler(Boolean.TRUE.equals(review.getIsSpoiler()))
                .likesCount(review.getLikesCount() != null ? review.getLikesCount() : 0)
                .dislikesCount(review.getDislikesCount() != null ? review.getDislikesCount() : 0)
                .userReaction(userReaction)
                .isLikedByCurrentUser("LIKE".equalsIgnoreCase(userReaction))
                .isVerifiedReader(isVerified)
                .canEdit(isOwner)
                .canDelete(isOwner || isAdmin)
                .isEdited(isEdited)
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    private boolean checkIsVerifiedReader(User author, Book book) {
        if (author == null || book == null) return false;

        // 1. Check shelf status: If marked completed or progress >= 20%
        Optional<UserBook> userBookOpt = userBookRepository.findByUserIdAndBookId(author.getId(), book.getId());
        if (userBookOpt.isPresent()) {
            UserBook ub = userBookOpt.get();
            if (Boolean.TRUE.equals(ub.getIsCompleted()) || "completed".equalsIgnoreCase(ub.getStatus())) {
                return true;
            }
            if (ub.getCurrentPage() != null && book.getPages() != null && book.getPages() > 0) {
                double pct = (double) ub.getCurrentPage() / book.getPages();
                if (pct >= 0.20) {
                    return true;
                }
            }
        }

        // 2. Check ReadingProgress
        Optional<ReadingProgress> progressOpt = readingProgressRepository.findByUserIdAndBookId(author.getId(), book.getId());
        if (progressOpt.isPresent()) {
            ReadingProgress rp = progressOpt.get();
            if (rp.getCurrentPage() != null && book.getPages() != null && book.getPages() > 0) {
                double pct = (double) rp.getCurrentPage() / book.getPages();
                if (pct >= 0.20) {
                    return true;
                }
            }
            if (rp.getCurrentAudioTime() != null && rp.getCurrentAudioTime() >= 120) {
                return true;
            }
            if (rp.getEpubCfi() != null && !rp.getEpubCfi().isBlank()) {
                return true;
            }
        }

        return false;
    }
}
