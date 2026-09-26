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
    private String dayLabel; // e.g., "Дүйсенбі", "22 қыр"
    private long seconds;
    private long minutes;
}
