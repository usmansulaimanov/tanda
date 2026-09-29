package com.tanda.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSessionDto {
    private String id;
    private String userId;
    private String deviceName;
    private String deviceType;
    private String location;
    private String ipAddress;
    private String userAgent;
    private OffsetDateTime createdAt;
    private OffsetDateTime lastActiveAt;
    private OffsetDateTime expiresAt;
    private Boolean revoked;
    private String revocationReason;
}
