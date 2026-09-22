package com.tanda.dto.promo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplyPromoResponseDto {
    private boolean success;
    private String code;
    private String rewardType;
    private String rewardTitle;
    private String message;
}
