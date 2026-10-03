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
public class UpdateBonusSettingsRequestDto {
    private Boolean bonusSystemEnabled;
    private String bonusCurrencyName;
    private Boolean bonusSignupEnabled;
    private Integer bonusSignupAmount;
    private Boolean bonusDailyLoginEnabled;
    private Integer bonusDailyLoginAmount;
    private Boolean bonusListeningEnabled;
    private Integer bonusListeningAmount;
    private Integer bonusListeningIntervalHours;
    private Boolean bonusReviewEnabled;
    private Integer bonusReviewAmount;
    private String bonusDescription;
}
