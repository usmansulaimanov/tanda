package com.tanda.controller;

import com.tanda.dto.shelf.UserBookRequestDto;
import com.tanda.dto.shelf.UserBookResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.UserBookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me/books")
@RequiredArgsConstructor
public class UserBookController {

    private final UserBookService userBookService;

    @GetMapping
    public ResponseEntity<List<UserBookResponseDto>> getUserShelf(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String status
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userBookService.getUserShelf(principal.getId(), status));
    }

    @GetMapping("/{bookId}")
    public ResponseEntity<UserBookResponseDto> getUserBook(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bookId
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userBookService.getUserBook(principal.getId(), bookId));
    }

    @PostMapping("/{bookId}")
    public ResponseEntity<UserBookResponseDto> addToShelf(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bookId,
            @Valid @RequestBody(required = false) UserBookRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserBookResponseDto result = userBookService.addOrUpdateBook(principal.getId(), bookId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PatchMapping("/{bookId}")
    public ResponseEntity<UserBookResponseDto> updateProgress(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bookId,
            @Valid @RequestBody UserBookRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userBookService.updateProgress(principal.getId(), bookId, request));
    }

    @DeleteMapping("/{bookId}")
    public ResponseEntity<Void> removeFromShelf(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bookId
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        userBookService.removeBookFromShelf(principal.getId(), bookId);
        return ResponseEntity.noContent().build();
    }
}
