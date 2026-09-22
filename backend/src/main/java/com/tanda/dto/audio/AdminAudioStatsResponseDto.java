package com.tanda.dto.audio;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAudioStatsResponseDto {
    private long totalSessions;
    private long totalSeconds;
    private double totalListeningHours;
    private long uniqueListeners;
    private List<AdminAudioBookStatDto> topBooks;
}
