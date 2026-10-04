package com.tanda.service;

import com.tanda.dto.review.BookReviewResponseDto;
import com.tanda.dto.review.CreateReviewRequestDto;
import com.tanda.dto.review.RatingSummaryResponseDto;
import com.tanda.entity.Book;
import com.tanda.entity.BookReview;
import com.tanda.entity.BookReviewLike;
import com.tanda.entity.BookReviewLikeId;
import com.tanda.entity.User;
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

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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

        Set<Long> likedReviewIds = new HashSet<>();
        if (currentUserId != null && !reviewsPage.isEmpty()) {
            List<Long> reviewIds = reviewsPage.getContent().stream()
                    .map(BookReview::getId)
                    .collect(Collectors.toList());
            likedReviewIds = bookReviewLikeRepository.findByIdUserIdAndIdReviewIdIn(currentUserId, reviewIds).stream()
                    .map(like -> like.getId().getReviewId())
                    .collect(Collectors.toSet());
        }

        final Set<Long> finalLikedReviewIds = likedReviewIds;
        return reviewsPage.map(review -> mapToDtoWithLikes(review, currentUserId, isAdmin, finalLikedReviewIds.contains(review.getId())));
    }

    @Transactional(readOnly = true)
    public BookReviewResponseDto getMyReview(String bookId, String userId) {
        return bookReviewRepository.findByBookIdAndUserId(bookId, userId)
                .map(review -> {
                    boolean isLiked = bookReviewLikeRepository.existsByIdReviewIdAndIdUserId(review.getId(), userId);
                    return mapToDtoWithLikes(review, userId, false, isLiked);
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
    public Map<String, Object> toggleLike(Long reviewId, String userId) {
        BookReview review = bookReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("BookReview", "id", reviewId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        BookReviewLikeId likeId = new BookReviewLikeId(reviewId, userId);
        boolean isLiked;
        if (bookReviewLikeRepository.existsById(likeId)) {
            bookReviewLikeRepository.deleteById(likeId);
            review.setLikesCount(Math.max(0, (review.getLikesCount() != null ? review.getLikesCount() : 1) - 1));
            isLiked = false;
        } else {
            BookReviewLike like = BookReviewLike.builder()
                    .id(likeId)
                    .review(review)
                    .user(user)
                    .build();
            bookReviewLikeRepository.save(like);
            review.setLikesCount((review.getLikesCount() != null ? review.getLikesCount() : 0) + 1);
            isLiked = true;
        }

        bookReviewRepository.save(review);

        Map<String, Object> response = new HashMap<>();
        response.put("isLiked", isLiked);
        response.put("likesCount", review.getLikesCount());
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

    private BookReviewResponseDto mapToDto(BookReview review, String currentUserId, boolean isAdmin) {
        boolean isLiked = false;
        if (currentUserId != null) {
            isLiked = bookReviewLikeRepository.existsByIdReviewIdAndIdUserId(review.getId(), currentUserId);
        }
        return mapToDtoWithLikes(review, currentUserId, isAdmin, isLiked);
    }

    private BookReviewResponseDto mapToDtoWithLikes(BookReview review, String currentUserId, boolean isAdmin, boolean isLiked) {
        User author = review.getUser();
        boolean isOwner = currentUserId != null && currentUserId.equals(author.getId());
        boolean isVerified = readingProgressRepository.findByUserIdAndBookId(author.getId(), review.getBook().getId()).isPresent()
                || userBookRepository.findByUserIdAndBookId(author.getId(), review.getBook().getId()).isPresent();

        return BookReviewResponseDto.builder()
                .id(review.getId())
                .bookId(review.getBook().getId())
                .userId(author.getId())
                .userName(author.getName())
                .userAvatar(author.getAvatarUrl())
                .userRole(author.getRole())
                .rating(review.getRating())
                .reviewText(review.getReviewText())
                .isSpoiler(Boolean.TRUE.equals(review.getIsSpoiler()))
                .likesCount(review.getLikesCount() != null ? review.getLikesCount() : 0)
                .isLikedByCurrentUser(isLiked)
                .isVerifiedReader(isVerified)
                .canEdit(isOwner)
                .canDelete(isOwner || isAdmin)
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
