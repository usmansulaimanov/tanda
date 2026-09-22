package com.tanda.controller;

import com.tanda.dto.audio.AdminAudioStatsResponseDto;
import com.tanda.dto.audio.TopAudioBookResponseDto;
import com.tanda.service.AudioAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AudioAnalyticsController {

    private final AudioAnalyticsService audioAnalyticsService;

    @GetMapping({"/api/v1/books/top-audio", "/api/books/top-audio"})
    public ResponseEntity<List<TopAudioBookResponseDto>> getTopAudio(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(audioAnalyticsService.getTopAudioBooks(limit));
    }

    @GetMapping({"/api/v1/admin/stats/audio", "/api/admin/stats/audio"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminAudioStatsResponseDto> getAdminAudioStats() {
        return ResponseEntity.ok(audioAnalyticsService.getAdminAudioStats());
    }
}
