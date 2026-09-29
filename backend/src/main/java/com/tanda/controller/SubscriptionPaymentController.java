package com.tanda.controller;

import com.tanda.dto.media.MediaUploadResponseDto;
import com.tanda.dto.premium.CreateSubscriptionPaymentRequestDto;
import com.tanda.dto.premium.ReviewSubscriptionPaymentRequestDto;
import com.tanda.dto.premium.SubscriptionPaymentRequestResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.MediaUploadService;
import com.tanda.service.SubscriptionPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping({"/api/v1", "/api"})
@RequiredArgsConstructor
@Tag(name = "Subscription Payments", description = "Kaspi receipt uploads and admin approval")
public class SubscriptionPaymentController {

    private final SubscriptionPaymentService paymentService;
    private final MediaUploadService mediaUploadService;

    @PostMapping({"/premium/receipts/upload", "/premium/upload-receipt"})
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload payment receipt image for subscription (authenticated users)")
    public ResponseEntity<MediaUploadResponseDto> uploadReceipt(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mediaUploadService.uploadFile(file, "covers"));
    }

    @PostMapping("/premium/subscription-requests")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Submit Kaspi receipt for premium subscription approval")
    public ResponseEntity<SubscriptionPaymentRequestResponseDto> createRequest(
            @Valid @RequestBody CreateSubscriptionPaymentRequestDto request,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication) {
        String userId = principal != null && principal.getId() != null ? principal.getId() : authentication.getName();
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.createRequest(userId, request));
    }

    @GetMapping("/premium/subscription-requests/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current user's subscription requests history")
    public ResponseEntity<List<SubscriptionPaymentRequestResponseDto>> getMyRequests(
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication) {
        String userId = principal != null && principal.getId() != null ? principal.getId() : authentication.getName();
        return ResponseEntity.ok(paymentService.getMyRequests(userId));
    }

    @GetMapping("/admin/premium/subscription-requests")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all subscription payment requests (Admin only)")
    public ResponseEntity<List<SubscriptionPaymentRequestResponseDto>> getAllRequests(
            @RequestParam(value = "status", required = false) String status) {
        return ResponseEntity.ok(paymentService.getAllRequests(status));
    }

    @PostMapping("/admin/premium/subscription-requests/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve subscription request and grant premium (Admin only)")
    public ResponseEntity<SubscriptionPaymentRequestResponseDto> approveRequest(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication) {
        String adminId = principal != null && principal.getId() != null ? principal.getId() : authentication.getName();
        return ResponseEntity.ok(paymentService.approveRequest(id, adminId));
    }

    @PostMapping("/admin/premium/subscription-requests/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reject subscription request with reason (Admin only)")
    public ResponseEntity<SubscriptionPaymentRequestResponseDto> rejectRequest(
            @PathVariable String id,
            @RequestBody(required = false) ReviewSubscriptionPaymentRequestDto body,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication) {
        String adminId = principal != null && principal.getId() != null ? principal.getId() : authentication.getName();
        String reason = body != null ? body.getRejectionReason() : null;
        return ResponseEntity.ok(paymentService.rejectRequest(id, reason, adminId));
    }

    @PostMapping("/admin/premium/subscription-requests/{id}/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Revoke previously approved subscription request and remove premium (Admin only)")
    public ResponseEntity<SubscriptionPaymentRequestResponseDto> revokeRequest(
            @PathVariable String id,
            @RequestBody(required = false) ReviewSubscriptionPaymentRequestDto body,
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication) {
        String adminId = principal != null && principal.getId() != null ? principal.getId() : authentication.getName();
        String reason = body != null ? body.getRejectionReason() : null;
        return ResponseEntity.ok(paymentService.revokeApprovedRequest(id, reason, adminId));
    }
}

