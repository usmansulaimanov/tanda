package com.tanda.dto.royalty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayoutRequestResponseDto {
    private String id;
    private String authorId;
    private String authorName;
    private String authorEmail;
    private String authorPhone;
    private BigDecimal amount;
    private String method;
    private String cardOrAccount;
    private String status;
    private String rejectionReason;
    private OffsetDateTime requestedAt;
    private OffsetDateTime processedAt;
}
