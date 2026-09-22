package com.tanda.controller;

import com.tanda.dto.premium.GrantPremiumRequestDto;
import com.tanda.dto.premium.PremiumEntitlementResponseDto;
import com.tanda.dto.premium.PremiumStatusResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.PremiumService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PremiumController {

    private final PremiumService premiumService;

    // --- Reader Endpoints ---

    @GetMapping("/api/v1/me/premium")
    public ResponseEntity<PremiumStatusResponseDto> getMyPremiumStatus(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(premiumService.getPremiumStatus(principal.getId()));
    }

    @GetMapping("/api/v1/me/premium/entitlements")
    public ResponseEntity<List<PremiumEntitlementResponseDto>> getMyEntitlements(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(premiumService.getUserEntitlements(principal.getId()));
    }

    // --- Admin Endpoints ---

    @GetMapping("/api/v1/admin/premium")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PremiumEntitlementResponseDto>> getAllPremiumUsers() {
        return ResponseEntity.ok(premiumService.getAllActivePremiumEntitlements());
    }

    @PostMapping("/api/v1/admin/premium/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PremiumEntitlementResponseDto> grantPremiumManually(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String userId,
            @Valid @RequestBody GrantPremiumRequestDto request
    ) {
        String adminId = principal != null ? principal.getId() : "ADMIN";
        int days = request.getDays() != null ? request.getDays() : 30;
        String source = request.getSource() != null ? request.getSource() : "MANUAL_ADMIN";
        return ResponseEntity.ok(premiumService.grantPremium(userId, days, source, adminId));
    }

    @PostMapping("/api/v1/admin/users/{userId}/birthday-gift")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> grantBirthdayGiftManually(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String userId,
            @RequestParam(required = false) Integer year
    ) {
        String adminId = principal != null ? principal.getId() : "ADMIN";
        return ResponseEntity.ok(premiumService.grantBirthdayGift(userId, year, adminId));
    }

    @PostMapping("/api/v1/admin/birthday-rewards/run")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> triggerBirthdayJob() {
        premiumService.processDailyBirthdayGifts();
        return ResponseEntity.ok(Map.of("message", "Birthday check triggered successfully"));
    }
}
