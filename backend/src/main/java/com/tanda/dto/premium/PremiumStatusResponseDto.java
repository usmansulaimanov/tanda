package com.tanda.dto.premium;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PremiumStatusResponseDto {
    private Boolean isPremium;
    private OffsetDateTime expiresAt;
    private String source;
    private Long daysRemaining;
}
