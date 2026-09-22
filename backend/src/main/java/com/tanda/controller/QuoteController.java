package com.tanda.controller;

import com.tanda.dto.content.QuoteRequestDto;
import com.tanda.dto.content.QuoteResponseDto;
import com.tanda.service.QuoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class QuoteController {

    private final QuoteService quoteService;

    @GetMapping({"/api/v1/quotes", "/api/quotes"})
    public ResponseEntity<List<QuoteResponseDto>> getActiveQuotes() {
        return ResponseEntity.ok(quoteService.getActiveQuotes());
    }

    @GetMapping({"/api/v1/quotes/random", "/api/quotes/random"})
    public ResponseEntity<QuoteResponseDto> getRandomQuote() {
        return ResponseEntity.ok(quoteService.getRandomQuote());
    }

    @GetMapping({"/api/v1/admin/quotes", "/api/admin/quotes"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<QuoteResponseDto>> getAllQuotesAdmin() {
        return ResponseEntity.ok(quoteService.getAllQuotesAdmin());
    }

    @PostMapping({"/api/v1/admin/quotes", "/api/admin/quotes"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<QuoteResponseDto> createQuote(@Valid @RequestBody QuoteRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quoteService.createQuote(request));
    }

    @PostMapping({"/api/v1/admin/quotes/bulk", "/api/admin/quotes/bulk"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<QuoteResponseDto>> createBulkQuotes(@RequestBody List<QuoteRequestDto> requests) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quoteService.createBulkQuotes(requests));
    }

    @PatchMapping({"/api/v1/admin/quotes/{id}", "/api/admin/quotes/{id}"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<QuoteResponseDto> updateQuote(
            @PathVariable String id,
            @RequestBody QuoteRequestDto request
    ) {
        return ResponseEntity.ok(quoteService.updateQuote(id, request));
    }

    @DeleteMapping({"/api/v1/admin/quotes/{id}", "/api/admin/quotes/{id}"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteQuote(@PathVariable String id) {
        quoteService.deleteQuote(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping({"/api/v1/admin/quotes", "/api/admin/quotes"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBulkQuotes(@RequestBody List<String> ids) {
        quoteService.deleteBulkQuotes(ids);
        return ResponseEntity.noContent().build();
    }
}
