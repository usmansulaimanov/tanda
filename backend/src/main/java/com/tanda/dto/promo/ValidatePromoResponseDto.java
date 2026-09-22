package com.tanda.dto.promo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidatePromoResponseDto {
    private boolean valid;
    private String code;
    private String rewardType;
    private String rewardTitle;
    private Integer durationDays;
    private Integer discountPercent;
    private String message;
}
