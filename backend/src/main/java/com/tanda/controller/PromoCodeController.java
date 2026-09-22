package com.tanda.controller;

import com.tanda.dto.promo.ApplyPromoRequestDto;
import com.tanda.dto.promo.ApplyPromoResponseDto;
import com.tanda.dto.promo.GeneratePromoCodesRequestDto;
import com.tanda.dto.promo.PromoBatchResponseDto;
import com.tanda.dto.promo.PromoCodeResponseDto;
import com.tanda.dto.promo.UpdatePromoCodeRequestDto;
import com.tanda.dto.promo.ValidatePromoRequestDto;
import com.tanda.dto.promo.ValidatePromoResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.PromoCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PromoCodeController {

    private final PromoCodeService promoCodeService;

    // --- Reader Endpoints ---

    @PostMapping("/api/v1/promo-codes/validate")
    public ResponseEntity<ValidatePromoResponseDto> validatePromoCode(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ValidatePromoRequestDto request
    ) {
        String userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(promoCodeService.validatePromoCode(request.getCode(), userId));
    }

    @PostMapping("/api/v1/promo-codes/apply")
    public ResponseEntity<ApplyPromoResponseDto> applyPromoCode(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ApplyPromoRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(promoCodeService.applyPromoCode(request.getCode(), principal.getId()));
    }

    @GetMapping("/api/v1/me/promo-codes")
    public ResponseEntity<List<PromoCodeResponseDto>> getMyPromoCodes(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(promoCodeService.getUserActivatedPromos(principal.getId()));
    }

    // --- Admin Endpoints ---

    @GetMapping("/api/v1/admin/promo-codes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PromoCodeResponseDto>> getAllPromoCodes() {
        return ResponseEntity.ok(promoCodeService.getAllCodes());
    }

    @PostMapping("/api/v1/admin/promo-codes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> generatePromoCodes(@Valid @RequestBody GeneratePromoCodesRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(promoCodeService.generatePromoCodes(request));
    }

    @PatchMapping("/api/v1/admin/promo-codes/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromoCodeResponseDto> updatePromoCode(
            @PathVariable String id,
            @RequestBody UpdatePromoCodeRequestDto request
    ) {
        return ResponseEntity.ok(promoCodeService.updateCode(id, request));
    }

    @DeleteMapping("/api/v1/admin/promo-codes/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePromoCode(@PathVariable String id) {
        promoCodeService.deleteCode(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/admin/promo-codes/batches")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PromoBatchResponseDto>> getAllBatches() {
        return ResponseEntity.ok(promoCodeService.getAllBatches());
    }

    @DeleteMapping("/api/v1/admin/promo-codes/batches/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBatch(@PathVariable String id) {
        promoCodeService.deleteBatch(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/v1/admin/promo-codes/batches/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> toggleBatchStatus(
            @PathVariable String id,
            @RequestParam(required = false) Boolean isActive
    ) {
        promoCodeService.toggleBatchStatus(id, isActive);
        return ResponseEntity.ok().build();
    }
}
