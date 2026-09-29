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
public class SubscriptionPaymentRequestResponseDto {
    private String id;
    private String userId;
    private String userName;
    private String userEmail;
    private String planName;
    private Integer planDays;
    private Integer amountKzt;
    private String receiptUrl;
    private String phoneOrAccount;
    private String notes;
    private String status; // 'PENDING', 'APPROVED', 'REJECTED'
    private String rejectionReason;
    private String reviewedBy;
    private OffsetDateTime reviewedAt;
    private String receiptNumber;
    private Boolean aiVerified;
    private String aiStatus;
    private Double aiConfidence;
    private String aiExtractedData;
    private String aiRejectionReason;
    private OffsetDateTime createdAt;
}

