package com.tanda.dto.leaderboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardResponseDto {
    private LeaderboardPeriod period;
    private String periodLabel;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<LeaderboardEntryDto> topEntries;
    private LeaderboardEntryDto currentUserEntry;
    private long totalParticipants;
}
