package com.tanda.dto.promo;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratePromoCodesRequestDto {
    private String batchName;
    @Builder.Default
    private Integer count = 10;
    @Builder.Default
    private String rewardType = "subscription_1m";
    @NotBlank
    private String rewardTitle;
    @Builder.Default
    private Integer durationDays = 30;
    private String customWord;
    @Builder.Default
    private String prefix = "TANDA";
    @Builder.Default
    private Integer maxUses = 1;
    private Integer discountPercent;
}
