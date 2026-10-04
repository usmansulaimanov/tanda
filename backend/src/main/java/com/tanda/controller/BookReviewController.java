package com.tanda.controller;

import com.tanda.dto.review.BookReviewResponseDto;
import com.tanda.dto.review.CreateReviewRequestDto;
import com.tanda.dto.review.RatingSummaryResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.BookReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1", "/api"})
@RequiredArgsConstructor
public class BookReviewController {

    private final BookReviewService bookReviewService;

    @GetMapping("/admin/reviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<BookReviewResponseDto>> getAdminReviews(
            @RequestParam(required = false) String bookId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        String currentUserId = principal != null ? principal.getId() : null;
        Page<BookReviewResponseDto> reviews = bookReviewService.getAdminReviews(bookId, rating, search, pageable, currentUserId);
        return ResponseEntity.ok(reviews);
    }

    @DeleteMapping("/admin/reviews/{reviewId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> adminDeleteReview(
            @PathVariable Long reviewId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        bookReviewService.deleteReview(reviewId, principal.getId(), true);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/books/{bookId}/reviews")
    public ResponseEntity<Page<BookReviewResponseDto>> getBookReviews(
            @PathVariable String bookId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "newest") String sort,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Sort sortObj;
        switch (sort.toLowerCase()) {
            case "helpful":
                sortObj = Sort.by(Sort.Direction.DESC, "likesCount").and(Sort.by(Sort.Direction.DESC, "createdAt"));
                break;
            case "rating_desc":
                sortObj = Sort.by(Sort.Direction.DESC, "rating").and(Sort.by(Sort.Direction.DESC, "createdAt"));
                break;
            case "rating_asc":
                sortObj = Sort.by(Sort.Direction.ASC, "rating").and(Sort.by(Sort.Direction.DESC, "createdAt"));
                break;
            case "newest":
            default:
                sortObj = Sort.by(Sort.Direction.DESC, "createdAt");
                break;
        }

        Pageable pageable = PageRequest.of(page, Math.min(size, 50), sortObj);
        String currentUserId = principal != null ? principal.getId() : null;
        boolean isAdmin = principal != null && "admin".equalsIgnoreCase(principal.getRole());

        Page<BookReviewResponseDto> reviews = bookReviewService.getReviews(bookId, pageable, currentUserId, isAdmin);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/books/{bookId}/reviews/summary")
    public ResponseEntity<RatingSummaryResponseDto> getRatingSummary(@PathVariable String bookId) {
        return ResponseEntity.ok(bookReviewService.getRatingSummary(bookId));
    }

    @GetMapping("/books/{bookId}/reviews/my")
    public ResponseEntity<BookReviewResponseDto> getMyReview(
            @PathVariable String bookId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        BookReviewResponseDto myReview = bookReviewService.getMyReview(bookId, principal.getId());
        if (myReview == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(myReview);
    }

    @PostMapping("/books/{bookId}/reviews")
    public ResponseEntity<BookReviewResponseDto> addOrUpdateReview(
            @PathVariable String bookId,
            @Valid @RequestBody CreateReviewRequestDto requestDto,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        BookReviewResponseDto review = bookReviewService.addOrUpdateReview(bookId, principal.getId(), requestDto);
        return ResponseEntity.ok(review);
    }

    @DeleteMapping("/books/{bookId}/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable String bookId,
            @PathVariable Long reviewId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        boolean isAdmin = "admin".equalsIgnoreCase(principal.getRole());
        bookReviewService.deleteReview(reviewId, principal.getId(), isAdmin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reviews/{reviewId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable Long reviewId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Map<String, Object> result = bookReviewService.toggleReaction(reviewId, principal.getId(), "LIKE");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/reviews/{reviewId}/reaction")
    public ResponseEntity<Map<String, Object>> toggleReaction(
            @PathVariable Long reviewId,
            @RequestParam(defaultValue = "LIKE") String type,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Map<String, Object> result = bookReviewService.toggleReaction(reviewId, principal.getId(), type);
        return ResponseEntity.ok(result);
    }
}
