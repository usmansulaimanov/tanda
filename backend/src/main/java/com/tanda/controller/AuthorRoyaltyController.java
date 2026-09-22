package com.tanda.controller;

import com.tanda.dto.royalty.AuthorStatsResponseDto;
import com.tanda.dto.royalty.PayoutRequestCreateDto;
import com.tanda.dto.royalty.PayoutRequestResponseDto;
import com.tanda.dto.royalty.RoyaltyEarningResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.RoyaltyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/authors")
@RequiredArgsConstructor
public class AuthorRoyaltyController {

    private final RoyaltyService royaltyService;

    // --- Current Author Endpoints ---

    @GetMapping("/me/earnings")
    public ResponseEntity<List<RoyaltyEarningResponseDto>> getMyEarnings(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(royaltyService.getAuthorEarnings(principal.getId()));
    }

    @GetMapping("/me/stats")
    public ResponseEntity<AuthorStatsResponseDto> getMyStats(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String authorId
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // If an admin provides authorId query param, allow inspecting that author
        String targetAuthorId = principal.getId();
        if (authorId != null && !authorId.isBlank()) {
            boolean isAdmin = principal.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (isAdmin) {
                targetAuthorId = authorId;
            }
        }

        return ResponseEntity.ok(royaltyService.getAuthorStats(targetAuthorId, month));
    }

    @PostMapping("/me/payouts")
    public ResponseEntity<PayoutRequestResponseDto> requestPayout(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PayoutRequestCreateDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        PayoutRequestResponseDto response = royaltyService.requestPayout(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me/payouts")
    public ResponseEntity<List<PayoutRequestResponseDto>> getMyPayouts(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(royaltyService.getAuthorPayouts(principal.getId()));
    }

    // --- Specific Author by ID (for Admin or authorized users) ---

    @GetMapping("/{authorId}/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthorStatsResponseDto> getAuthorStatsById(
            @PathVariable String authorId,
            @RequestParam(required = false) String month
    ) {
        return ResponseEntity.ok(royaltyService.getAuthorStats(authorId, month));
    }

    @GetMapping("/{authorId}/earnings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RoyaltyEarningResponseDto>> getAuthorEarningsById(
            @PathVariable String authorId
    ) {
        return ResponseEntity.ok(royaltyService.getAuthorEarnings(authorId));
    }

    @GetMapping("/{authorId}/payouts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PayoutRequestResponseDto>> getAuthorPayoutsById(
            @PathVariable String authorId
    ) {
        return ResponseEntity.ok(royaltyService.getAuthorPayouts(authorId));
    }
}
