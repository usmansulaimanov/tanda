package com.tanda.controller;

import com.tanda.dto.bonus.AdjustBonusRequestDto;
import com.tanda.dto.bonus.BonusSettingsDto;
import com.tanda.dto.bonus.BonusStatsSummaryResponseDto;
import com.tanda.dto.bonus.BonusTransactionResponseDto;
import com.tanda.dto.bonus.UpdateBonusSettingsRequestDto;
import com.tanda.service.BonusService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/admin/bonus", "/api/admin/bonus"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminBonusController {

    private final BonusService bonusService;

    @GetMapping("/settings")
    public ResponseEntity<BonusSettingsDto> getBonusSettings() {
        return ResponseEntity.ok(bonusService.getBonusSettings());
    }

    @PutMapping("/settings")
    public ResponseEntity<BonusSettingsDto> updateBonusSettings(@Valid @RequestBody UpdateBonusSettingsRequestDto dto) {
        return ResponseEntity.ok(bonusService.updateBonusSettings(dto));
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<BonusTransactionResponseDto>> getAllTransactions(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(bonusService.getAllTransactionsAdmin(search, type, PageRequest.of(page, size)));
    }

    @GetMapping("/summary")
    public ResponseEntity<BonusStatsSummaryResponseDto> getSummaryStats() {
        return ResponseEntity.ok(bonusService.getBonusStatsSummaryAdmin());
    }

    @GetMapping("/readers")
    public ResponseEntity<Page<com.tanda.dto.user.UserListResponseDto>> getBonusReaders(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "bonus_desc") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(bonusService.getBonusReadersAdmin(search, sortBy, page, size));
    }

    @GetMapping("/readers/{userId}/transactions")
    public ResponseEntity<Page<BonusTransactionResponseDto>> getReaderTransactions(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(bonusService.getUserTransactionsAdmin(userId, PageRequest.of(page, size)));
    }

    @GetMapping("/lookup-user")
    public ResponseEntity<com.tanda.dto.user.UserResponseDto> lookupUser(@RequestParam String query) {
        return ResponseEntity.ok(bonusService.lookupUserForAdmin(query));
    }

    @PostMapping("/adjust/{userId}")
    public ResponseEntity<Map<String, Object>> adjustBonus(
            @PathVariable String userId,
            @Valid @RequestBody AdjustBonusRequestDto dto
    ) {
        bonusService.adjustUserBonusAdmin(userId, dto);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Бонус сәтті түзетілді"
        ));
    }
}
