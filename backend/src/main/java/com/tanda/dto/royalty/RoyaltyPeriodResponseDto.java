package com.tanda.dto.royalty;

import com.tanda.dto.leaderboard.DailyActivityDto;
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
public class RoyaltyPeriodResponseDto {
    private String id;
    private String month;
    private String monthLabel;
    private String status;
    private BigDecimal totalRevenue;
    private BigDecimal adminExpense;
    private BigDecimal netPool;
    private BigDecimal companyShare;
    private BigDecimal royaltyPool;
    private Long totalMinutes;
    private BigDecimal ratePerMinute;
    private String adminNote;
    private OffsetDateTime calculatedAt;
    private OffsetDateTime finalizedAt;
    private OffsetDateTime createdAt;
    private List<RoyaltyEarningResponseDto> earnings;
    private List<AuthorEarningSummaryDto> authorEarnings;
    private List<DailyActivityDto> dailyActivity;
}
