package com.tanda.controller;

import com.tanda.dto.leaderboard.LeaderboardPeriod;
import com.tanda.dto.leaderboard.LeaderboardResponseDto;
import com.tanda.dto.leaderboard.PersonalStatsResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/leaderboard")
@RequiredArgsConstructor
@Slf4j
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping
    public ResponseEntity<LeaderboardResponseDto> getLeaderboard(
            @RequestParam(required = false, defaultValue = "THIS_WEEK") LeaderboardPeriod period,
            Authentication authentication
    ) {
        String currentUserId = null;
        boolean isAdmin = false;

        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            if (authentication.getPrincipal() instanceof UserPrincipal principal) {
                currentUserId = principal.getId();
            } else {
                currentUserId = authentication.getName();
            }
            if (authentication.getAuthorities() != null) {
                isAdmin = authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
            }
        }

        LeaderboardResponseDto response = leaderboardService.getLeaderboard(period, currentUserId, isAdmin);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/personal")
    public ResponseEntity<PersonalStatsResponseDto> getPersonalStats(
            @AuthenticationPrincipal UserPrincipal principal,
            Authentication authentication
    ) {
        String userId = principal != null ? principal.getId() : authentication.getName();
        PersonalStatsResponseDto response = leaderboardService.getPersonalStats(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LeaderboardResponseDto> getAdminLeaderboard(
            @RequestParam(required = false) LeaderboardPeriod period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication
    ) {
        String currentUserId = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            currentUserId = principal.getId();
        }

        LeaderboardResponseDto response;
        if (startDate != null && endDate != null) {
            response = leaderboardService.getCustomLeaderboard(startDate, endDate, currentUserId, true);
        } else {
            response = leaderboardService.getLeaderboard(period != null ? period : LeaderboardPeriod.THIS_WEEK, currentUserId, true);
        }

        return ResponseEntity.ok(response);
    }
}
