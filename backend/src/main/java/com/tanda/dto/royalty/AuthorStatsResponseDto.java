package com.tanda.dto.royalty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorStatsResponseDto {
    private String authorId;
    private String authorName;
    private String month;
    private List<AuthorBookItemDto> authorBooks;
    private Long totalMinutes;
    private Long totalSeconds;
    private BigDecimal estimatedEarned;
    private BigDecimal ratePerMinute;
    private BigDecimal currentBalance;
    private String periodStatus; // "calculated", "paid", "estimated", "draft"
    private List<AuthorDailyStatDto> dailyList;
    private PeakDayDto peakDay;
    private Double peakMinutes;
    private Long peakSeconds;
    private Integer totalListenedDays;
    private Double averageMinutes;
    private OffsetDateTime lastListenedAt;
}
