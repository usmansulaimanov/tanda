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
public class BonusSettingsDto {
    private boolean bonusSystemEnabled;
    private String bonusCurrencyName;
    private boolean bonusSignupEnabled;
    private int bonusSignupAmount;
    private boolean bonusDailyLoginEnabled;
    private int bonusDailyLoginAmount;
    private boolean bonusListeningEnabled;
    private int bonusListeningAmount;
    private int bonusListeningIntervalHours;
    private boolean bonusReviewEnabled;
    private int bonusReviewAmount;
}
