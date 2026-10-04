package com.tanda.unit;

import com.tanda.dto.review.BookReviewResponseDto;
import com.tanda.dto.review.CreateReviewRequestDto;
import com.tanda.dto.review.RatingSummaryResponseDto;
import com.tanda.entity.Book;
import com.tanda.entity.BookReview;
import com.tanda.entity.BookReviewLike;
import com.tanda.entity.BookReviewLikeId;
import com.tanda.entity.ReadingProgress;
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
import com.tanda.service.BookReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookReviewServiceTest {

    @Mock
    private BookReviewRepository bookReviewRepository;

    @Mock
    private BookReviewLikeRepository bookReviewLikeRepository;

    @Mock
    private BookRepository bookRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ReadingProgressRepository readingProgressRepository;

    @Mock
    private UserBookRepository userBookRepository;

    @InjectMocks
    private BookReviewService bookReviewService;

    private Book testBook;
    private User testUser;
    private BookReview testReview;

    @BeforeEach
    void setUp() {
        testBook = Book.builder()
                .id("book-1")
                .title("Абай жолы")
                .author("Мұхтар Әуезов")
                .category("Көркем әдебиет")
                .averageRating(0.0)
                .ratingCount(0)
                .isDeleted(false)
                .build();

        testUser = User.builder()
                .id("user-1")
                .name("Айдос Смағұлов")
                .email("aidos@example.com")
                .role("client")
                .avatarUrl("https://example.com/avatar.jpg")
                .build();

        testReview = BookReview.builder()
                .id(100L)
                .book(testBook)
                .user(testUser)
                .rating(5)
                .reviewText("Керемет туынды! Барлық қазақ оқуы керек.")
                .isSpoiler(false)
                .likesCount(0)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should successfully add a new review and recalculate book rating")
    void testAddReviewSuccess() {
        CreateReviewRequestDto request = CreateReviewRequestDto.builder()
                .rating(5)
                .reviewText("Керемет кітап!")
                .isSpoiler(false)
                .build();

        when(bookRepository.findById("book-1")).thenReturn(Optional.of(testBook));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(bookReviewRepository.findByBookIdAndUserId("book-1", "user-1")).thenReturn(Optional.empty());
        when(bookReviewRepository.save(any(BookReview.class))).thenReturn(testReview);
        when(bookReviewRepository.getAverageRatingByBookId("book-1")).thenReturn(5.0);
        when(bookReviewRepository.countByBookId("book-1")).thenReturn(1L);
        when(readingProgressRepository.findByUserIdAndBookId("user-1", "book-1"))
                .thenReturn(Optional.of(ReadingProgress.builder().id("p-1").build()));

        BookReviewResponseDto response = bookReviewService.addOrUpdateReview("book-1", "user-1", request);

        assertThat(response).isNotNull();
        assertThat(response.getRating()).isEqualTo(5);
        assertThat(response.getUserName()).isEqualTo("Айдос Смағұлов");
        assertThat(response.getIsVerifiedReader()).isTrue();

        verify(bookRepository).save(testBook);
        assertThat(testBook.getAverageRating()).isEqualTo(5.0);
        assertThat(testBook.getRatingCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should throw BadRequestException when trying to review a deleted book")
    void testAddReviewToDeletedBook() {
        testBook.setIsDeleted(true);
        when(bookRepository.findById("book-1")).thenReturn(Optional.of(testBook));

        CreateReviewRequestDto request = CreateReviewRequestDto.builder().rating(4).build();

        assertThatThrownBy(() -> bookReviewService.addOrUpdateReview("book-1", "user-1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Өшірілген кітапқа");
    }

    @Test
    @DisplayName("Should allow owner or admin to delete review and update book stats")
    void testDeleteReviewSuccess() {
        when(bookReviewRepository.findById(100L)).thenReturn(Optional.of(testReview));
        when(bookReviewRepository.getAverageRatingByBookId("book-1")).thenReturn(null);
        when(bookReviewRepository.countByBookId("book-1")).thenReturn(0L);

        bookReviewService.deleteReview(100L, "user-1", false);

        verify(bookReviewRepository).delete(testReview);
        verify(bookRepository).save(testBook);
        assertThat(testBook.getAverageRating()).isEqualTo(0.0);
        assertThat(testBook.getRatingCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("Should throw UnauthorizedException when stranger tries to delete review")
    void testDeleteReviewStrangerFails() {
        when(bookReviewRepository.findById(100L)).thenReturn(Optional.of(testReview));

        assertThatThrownBy(() -> bookReviewService.deleteReview(100L, "stranger-user", false))
                .isInstanceOf(UnauthorizedException.class);

        verify(bookReviewRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Should return rating summary with distributions and percentages")
    void testGetRatingSummary() {
        when(bookRepository.existsById("book-1")).thenReturn(true);
        when(bookReviewRepository.getAverageRatingByBookId("book-1")).thenReturn(4.6666);
        when(bookReviewRepository.countByBookId("book-1")).thenReturn(3L);
        when(bookReviewRepository.countRatingsGroupedByRating("book-1")).thenReturn(List.of(
                new Object[]{5, 2L},
                new Object[]{4, 1L}
        ));

        RatingSummaryResponseDto summary = bookReviewService.getRatingSummary("book-1");

        assertThat(summary.getAverageRating()).isEqualTo(4.7);
        assertThat(summary.getRatingCount()).isEqualTo(3);
        assertThat(summary.getDistribution().get(5)).isEqualTo(2L);
        assertThat(summary.getDistribution().get(4)).isEqualTo(1L);
        assertThat(summary.getDistribution().get(1)).isEqualTo(0L);
        assertThat(summary.getPercentages().get(5)).isEqualTo(66.7);
    }

    @Test
    @DisplayName("Should toggle like correctly (add like then remove like)")
    void testToggleLike() {
        when(bookReviewRepository.findById(100L)).thenReturn(Optional.of(testReview));
        when(userRepository.findById("user-2")).thenReturn(Optional.of(testUser));
        BookReviewLikeId likeId = new BookReviewLikeId(100L, "user-2");

        // First click: Add like
        when(bookReviewLikeRepository.existsById(likeId)).thenReturn(false);
        Map<String, Object> res1 = bookReviewService.toggleLike(100L, "user-2");
        assertThat(res1.get("isLiked")).isEqualTo(true);
        assertThat(res1.get("likesCount")).isEqualTo(1);
        verify(bookReviewLikeRepository).save(any(BookReviewLike.class));

        // Second click: Remove like
        when(bookReviewLikeRepository.existsById(likeId)).thenReturn(true);
        Map<String, Object> res2 = bookReviewService.toggleLike(100L, "user-2");
        assertThat(res2.get("isLiked")).isEqualTo(false);
        assertThat(res2.get("likesCount")).isEqualTo(0);
        verify(bookReviewLikeRepository).deleteById(likeId);
    }
}
