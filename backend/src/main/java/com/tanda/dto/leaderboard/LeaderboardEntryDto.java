package com.tanda.dto.leaderboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardEntryDto {
    private int rank;
    private String userId;
    private String fullName;
    private String avatarUrl;
    private long periodSeconds;
    private long periodMinutes;
    private long allTimeSeconds;
    private long allTimeMinutes;
    private String email; // Only provided to admins
}
