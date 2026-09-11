package com.tanda.controller;

import com.tanda.dto.saved.SavedBookResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.SavedBookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/saved-books", "/api/v1/saved-books"})
@RequiredArgsConstructor
public class SavedBookController {

    private final SavedBookService savedBookService;

    @GetMapping
    public ResponseEntity<SavedBookResponseDto> getSavedBooks(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(savedBookService.getSavedBooks(principal.getId()));
    }

    @PostMapping("/{bookId}")
    public ResponseEntity<Map<String, Object>> saveBook(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bookId
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        savedBookService.saveBook(principal.getId(), bookId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "bookId", bookId,
                "saved", true
        ));
    }

    @DeleteMapping("/{bookId}")
    public ResponseEntity<Void> removeSavedBook(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bookId
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        savedBookService.removeSavedBook(principal.getId(), bookId);
        return ResponseEntity.noContent().build();
    }
}
