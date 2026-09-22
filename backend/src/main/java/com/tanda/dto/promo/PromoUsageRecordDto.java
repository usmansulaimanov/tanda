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
public class PromoUsageRecordDto {
    private String userId;
    private String userName;
    private String userEmail;
    private OffsetDateTime usedAt;
}
