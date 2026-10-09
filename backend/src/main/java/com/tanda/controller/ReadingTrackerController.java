package com.tanda.controller;

import com.tanda.dto.tracker.ReadingSessionRequestDto;
import com.tanda.dto.tracker.ReadingSessionResponseDto;
import com.tanda.dto.tracker.UserReadingStatsResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.ReadingTrackerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/reading-tracker", "/api/reading-tracker"})
@RequiredArgsConstructor
public class ReadingTrackerController {

    private final ReadingTrackerService trackerService;

    @PostMapping("/sessions")
    public ResponseEntity<ReadingSessionResponseDto> saveSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ReadingSessionRequestDto dto
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(trackerService.saveSession(principal.getId(), dto));
    }

    @GetMapping("/stats")
    public ResponseEntity<UserReadingStatsResponseDto> getStats(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(trackerService.getUserStats(principal.getId()));
    }

    @PutMapping("/invite-setting")
    public ResponseEntity<Map<String, Object>> updateInviteSetting(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Boolean> body
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        boolean allow = body.getOrDefault("allowGroupInvites", true);
        trackerService.updateUserInviteSetting(principal.getId(), allow);
        return ResponseEntity.ok(Map.of("success", true, "allowGroupInvites", allow));
    }

    @GetMapping("/sessions")
    public ResponseEntity<Page<ReadingSessionResponseDto>> getSessions(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Pageable pageable = PageRequest.of(page, Math.min(50, size));
        return ResponseEntity.ok(trackerService.getUserSessions(principal.getId(), pageable));
    }
}
