package com.tanda.dto.leaderboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalStatsResponseDto {
    private String userId;
    private String fullName;
    private String avatarUrl;
    private long todaySeconds;
    private long todayMinutes;
    private long last7DaysSeconds;
    private long last7DaysMinutes;
    private long thisMonthSeconds;
    private long thisMonthMinutes;
    private long allTimeSeconds;
    private long allTimeMinutes;
    private List<DailyActivityDto> dailyActivity;
}
