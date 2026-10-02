package com.tanda.dto.bonus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BonusStatsSummaryResponseDto {
    private long totalBonusesEarned;
    private long totalBonusesSpent;
    private long totalActiveBonusesInCirculation;
    private long totalUsersWithBonuses;
    private long totalTransactionsCount;
}
