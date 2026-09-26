package com.tanda.controller;

import com.tanda.dto.BookDetailResponseDto;

import com.tanda.dto.BookResponseDto;
import com.tanda.dto.CreateBookRequestDto;
import com.tanda.dto.UpdateBookRequestDto;
import com.tanda.dto.book.BookAudienceMemberDto;
import com.tanda.dto.book.BookStatsResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.AudioAnalyticsService;
import com.tanda.service.BookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import java.util.List;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/books", "/api/books"})
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;
    private final AudioAnalyticsService audioAnalyticsService;

    @GetMapping
    public ResponseEntity<Page<BookResponseDto>> getAllBooks(
            org.springframework.security.core.Authentication authentication,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "false") boolean includeArchived,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        boolean isAdmin = authentication != null && authentication.getAuthorities() != null &&
                authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<BookResponseDto> books = bookService.getBooks(category, search, includeArchived, includeDeleted, isAdmin, pageable);
        return ResponseEntity.ok(books);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookDetailResponseDto> getBookById(
            @PathVariable String id,
            org.springframework.security.core.Authentication authentication) {
        boolean isAdmin = authentication != null && authentication.getAuthorities() != null &&
                authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        BookDetailResponseDto book = bookService.getBookById(id, isAdmin);
        return ResponseEntity.ok(book);
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<BookStatsResponseDto> getBookStats(
            @PathVariable String id,
            @RequestParam(required = false) String month,
            org.springframework.security.core.Authentication authentication,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        boolean isAdmin = authentication.getAuthorities() != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        String userId = principal != null ? principal.getId() : authentication.getName();
        return ResponseEntity.ok(audioAnalyticsService.getBookStats(id, month, userId, isAdmin));
    }

    @GetMapping("/{id}/audience")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<com.tanda.dto.book.BookAudienceMemberDto>> getBookAudience(
            @PathVariable String id,
            @RequestParam(defaultValue = "LISTENERS") String tier,
            @RequestParam(defaultValue = "MONTH") String scope,
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(audioAnalyticsService.getBookAudience(id, tier, scope, month));
    }

    @GetMapping("/{bookId}/readers/{userId}/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<com.tanda.dto.book.UserBookListeningStatsResponseDto> getUserBookListeningStats(
            @PathVariable String bookId,
            @PathVariable String userId,
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(audioAnalyticsService.getUserBookListeningStats(bookId, userId, month));
    }


    @PostMapping

    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookResponseDto> createBook(@Valid @RequestBody CreateBookRequestDto request) {
        BookResponseDto created = bookService.createBook(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookResponseDto> updateBook(
            @PathVariable String id,
            @Valid @RequestBody UpdateBookRequestDto request) {
        BookResponseDto updated = bookService.updateBook(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/archive")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookResponseDto> toggleArchive(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Boolean> body) {
        boolean isArchived = true;
        if (body != null && body.containsKey("isArchived")) {
            isArchived = Boolean.TRUE.equals(body.get("isArchived"));
        }
        BookResponseDto updated = bookService.toggleArchive(id, isArchived);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookResponseDto> restoreBook(@PathVariable String id) {
        BookResponseDto restored = bookService.restoreBook(id);
        return ResponseEntity.ok(restored);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> deleteBook(@PathVariable String id) {
        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }
}
