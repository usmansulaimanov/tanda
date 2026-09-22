package com.tanda.controller;

import com.tanda.dto.royalty.PayoutRejectRequestDto;
import com.tanda.dto.royalty.PayoutRequestResponseDto;
import com.tanda.dto.royalty.RoyaltyCalculateRequestDto;
import com.tanda.dto.royalty.RoyaltyEarningResponseDto;
import com.tanda.dto.royalty.RoyaltyPeriodResponseDto;
import com.tanda.service.RoyaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminRoyaltyController {

    private final RoyaltyService royaltyService;

    // --- Royalty Periods ---

    @GetMapping("/royalty/periods")
    public ResponseEntity<List<RoyaltyPeriodResponseDto>> getAllPeriods() {
        return ResponseEntity.ok(royaltyService.getAllPeriods());
    }

    @GetMapping("/royalty/periods/{month}")
    public ResponseEntity<RoyaltyPeriodResponseDto> getPeriod(@PathVariable String month) {
        return ResponseEntity.ok(royaltyService.getPeriod(month));
    }

    @PostMapping("/royalty/periods/{month}/calculate")
    public ResponseEntity<RoyaltyPeriodResponseDto> calculatePeriod(
            @PathVariable String month,
            @RequestBody(required = false) RoyaltyCalculateRequestDto request
    ) {
        return ResponseEntity.ok(royaltyService.calculatePeriod(month, request));
    }

    @PostMapping("/royalty/periods/{month}/finalize")
    public ResponseEntity<RoyaltyPeriodResponseDto> finalizePeriod(@PathVariable String month) {
        return ResponseEntity.ok(royaltyService.finalizePeriod(month));
    }

    @GetMapping("/royalty/periods/{month}/earnings")
    public ResponseEntity<List<RoyaltyEarningResponseDto>> getPeriodEarnings(@PathVariable String month) {
        return ResponseEntity.ok(royaltyService.getPeriodEarnings(month));
    }

    // --- Payouts Management ---

    @GetMapping("/payouts")
    public ResponseEntity<List<PayoutRequestResponseDto>> getAllPayouts() {
        return ResponseEntity.ok(royaltyService.getAllPayouts());
    }

    @PatchMapping("/payouts/{id}/approve")
    public ResponseEntity<PayoutRequestResponseDto> approvePayout(@PathVariable String id) {
        return ResponseEntity.ok(royaltyService.approvePayout(id));
    }

    @PatchMapping("/payouts/{id}/reject")
    public ResponseEntity<PayoutRequestResponseDto> rejectPayout(
            @PathVariable String id,
            @RequestBody(required = false) PayoutRejectRequestDto request
    ) {
        return ResponseEntity.ok(royaltyService.rejectPayout(id, request));
    }
}
