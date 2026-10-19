package com.tanda.controller;

import com.tanda.dto.ebook.EbookEndSessionRequestDto;
import com.tanda.dto.ebook.EbookHeartbeatRequestDto;
import com.tanda.dto.ebook.EbookSessionHeartbeatResponseDto;
import com.tanda.dto.ebook.EbookSessionResponseDto;
import com.tanda.dto.ebook.StartEbookSessionRequestDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.EbookSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ebook/sessions")
@RequiredArgsConstructor
public class EbookSessionController {

    private final EbookSessionService ebookSessionService;

    @PostMapping
    public ResponseEntity<EbookSessionResponseDto> startSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody StartEbookSessionRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        EbookSessionResponseDto response = ebookSessionService.startSession(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{sessionId}/heartbeat")
    public ResponseEntity<EbookSessionHeartbeatResponseDto> heartbeat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String sessionId,
            @RequestBody(required = false) @Valid EbookHeartbeatRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(ebookSessionService.heartbeat(principal.getId(), sessionId, request));
    }

    @PatchMapping("/{sessionId}/end")
    public ResponseEntity<EbookSessionResponseDto> endSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String sessionId,
            @RequestBody(required = false) @Valid EbookEndSessionRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(ebookSessionService.endSession(principal.getId(), sessionId, request));
    }
}
