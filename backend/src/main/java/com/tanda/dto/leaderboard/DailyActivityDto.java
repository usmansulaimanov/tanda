package com.tanda.dto.leaderboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyActivityDto {
    private LocalDate date;
    private int dayOfMonth;
    private String dayLabel; // e.g., "01.09 (Сс)"
    private long seconds;
    private long minutes;
}
