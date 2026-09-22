package com.tanda.dto.promo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromoBatchResponseDto {
    private String id;
    private String name;
    private String rewardType;
    private String rewardTitle;
    private Integer durationDays;
    private OffsetDateTime expiresAt;
    private String prefix;
    private Integer totalCodes;
    private OffsetDateTime createdAt;
}
