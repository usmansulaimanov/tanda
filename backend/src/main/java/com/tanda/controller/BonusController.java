package com.tanda.controller;

import com.tanda.dto.bonus.BonusPurchaseSubscriptionRequestDto;
import com.tanda.dto.bonus.BonusSettingsDto;
import com.tanda.dto.bonus.BonusTransactionResponseDto;
import com.tanda.entity.User;
import com.tanda.repository.UserRepository;
import com.tanda.service.BonusService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/bonus", "/api/bonus"})
@RequiredArgsConstructor
public class BonusController {

    private final BonusService bonusService;
    private final UserRepository userRepository;

    @GetMapping("/settings")
    public ResponseEntity<BonusSettingsDto> getSettings() {
        return ResponseEntity.ok(bonusService.getBonusSettings());
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<BonusTransactionResponseDto>> getUserTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String userId = resolveUserId(userDetails);
        return ResponseEntity.ok(bonusService.getUserTransactions(userId, PageRequest.of(page, size)));
    }

    @PostMapping("/redeem-subscription")
    public ResponseEntity<Map<String, Object>> redeemSubscription(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BonusPurchaseSubscriptionRequestDto dto
    ) {
        String userId = resolveUserId(userDetails);
        bonusService.purchaseSubscriptionWithBonus(userId, dto);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Премиум жазылым бонуспен сәтті қосылды!"
        ));
    }

    @PostMapping("/daily-checkin")
    public ResponseEntity<Map<String, Object>> dailyCheckin(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String userId = resolveUserId(userDetails);
        User user = userRepository.findById(userId).orElse(null);
        boolean awarded = bonusService.checkAndAwardDailyBonus(user);
        return ResponseEntity.ok(Map.of(
                "awarded", awarded,
                "bonusBalance", user != null ? (user.getBonusBalance() != null ? user.getBonusBalance() : 0) : 0
        ));
    }

    private String resolveUserId(UserDetails userDetails) {
        if (userDetails == null) {
            throw new org.springframework.security.access.AccessDeniedException("Unauthorized");
        }
        return userRepository.findById(userDetails.getUsername())
                .or(() -> userRepository.findByEmail(userDetails.getUsername()))
                .map(User::getId)
                .orElse(userDetails.getUsername());
    }
}
