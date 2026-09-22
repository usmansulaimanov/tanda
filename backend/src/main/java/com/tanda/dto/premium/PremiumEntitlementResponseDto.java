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
public class PremiumEntitlementResponseDto {
    private String id;
    private String userId;
    private String userName;
    private String userEmail;
    private String source;
    private OffsetDateTime startsAt;
    private OffsetDateTime expiresAt;
    private String grantedBy;
    private Boolean isActive;
    private OffsetDateTime createdAt;
}
