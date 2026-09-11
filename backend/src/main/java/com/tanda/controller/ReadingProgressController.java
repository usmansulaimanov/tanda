package com.tanda.controller;

import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.dto.progress.ReadingProgressResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.ReadingProgressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/progress", "/api/v1/progress"})
@RequiredArgsConstructor
public class ReadingProgressController {

    private final ReadingProgressService readingProgressService;

    @GetMapping("/{bookId}")
    public ResponseEntity<ReadingProgressResponseDto> getProgress(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bookId
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(readingProgressService.getProgress(principal.getId(), bookId));
    }

    @PutMapping("/{bookId}")
    public ResponseEntity<ReadingProgressResponseDto> updateProgress(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bookId,
            @Valid @RequestBody ReadingProgressRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(readingProgressService.updateProgress(principal.getId(), bookId, request));
    }
}
