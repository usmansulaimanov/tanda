package com.tanda.controller;

import com.tanda.dto.audio.AdminAudioStatsResponseDto;
import com.tanda.dto.audio.TopAudioBookResponseDto;
import com.tanda.service.AudioAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AudioAnalyticsController {

    private final AudioAnalyticsService audioAnalyticsService;

    @GetMapping({"/api/v1/books/top-audio", "/api/books/top-audio", "/api/v1/analytics/audio/top-daily"})
    public ResponseEntity<List<TopAudioBookResponseDto>> getTopAudio(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(audioAnalyticsService.getTopAudioBooks(limit));
    }

    @PostMapping({"/api/v1/admin/analytics/audio/calculate-top-daily", "/api/admin/analytics/audio/calculate-top-daily"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> recalculateTopDaily() {
        audioAnalyticsService.calculateDailyTopBooks();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Daily top 10 books snapshot recalculated successfully."
        ));
    }

    @GetMapping({"/api/v1/admin/stats/audio", "/api/admin/stats/audio"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminAudioStatsResponseDto> getAdminAudioStats() {
        return ResponseEntity.ok(audioAnalyticsService.getAdminAudioStats());
    }
}
