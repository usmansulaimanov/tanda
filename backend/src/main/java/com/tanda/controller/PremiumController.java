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
import org.springframework.web.bind.annotation.DeleteMapping;
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

    @GetMapping({"/api/v1/me/premium", "/api/v1/premium/status"})
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

    @PostMapping({"/api/v1/admin/premium/{userId}", "/api/v1/admin/premium/grant"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PremiumEntitlementResponseDto> grantPremiumManually(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable(required = false) String userId,
            @Valid @RequestBody GrantPremiumRequestDto request
    ) {
        String adminId = principal != null ? principal.getId() : "ADMIN";
        String targetUserId = userId != null ? userId : request.getUserId();
        if (targetUserId == null || targetUserId.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "userId көрсетілмеген");
        }
        int days = request.getDays() != null ? request.getDays() : 30;
        String source = request.getSource() != null ? request.getSource() : "MANUAL_ADMIN";
        return ResponseEntity.ok(premiumService.grantPremium(targetUserId, days, source, adminId));
    }

    @DeleteMapping("/api/v1/admin/premium/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> revokePremiumManually(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String userId,
            @RequestParam(required = false) String reason
    ) {
        String adminId = principal != null ? principal.getId() : "ADMIN";
        premiumService.revokePremium(userId, reason != null ? reason : "MANUAL_ADMIN_REVOKE", adminId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Премиум жазылым сәтті өшірілді"));
    }

    @PostMapping({"/api/v1/admin/premium/{userId}/revoke", "/api/v1/admin/premium/revoke"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> revokePremiumPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable(required = false) String userId,
            @RequestParam(required = false) String reason,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String targetUserId = userId;
        if (targetUserId == null && body != null) {
            targetUserId = body.get("userId");
        }
        String finalReason = reason;
        if (finalReason == null && body != null) {
            finalReason = body.get("reason");
        }
        return revokePremiumManually(principal, targetUserId, finalReason);
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
