package com.tanda.dto.promo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromoCodeResponseDto {
    private String id;
    private String batchId;
    private String batchName;
    private String code;
    private String rewardType;
    private String rewardTitle;
    private String description;
    private Integer durationDays;
    private Integer discountPercent;
    private OffsetDateTime expiresAt;
    private Integer maxUses;
    private Integer usedCount;
    @Builder.Default
    private List<PromoUsageRecordDto> usedBy = new ArrayList<>();
    private Boolean isActive;
    private Boolean isIssued;
    private String note;
    private OffsetDateTime createdAt;
}
