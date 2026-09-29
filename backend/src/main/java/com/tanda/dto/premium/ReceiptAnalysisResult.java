package com.tanda.dto.premium;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptAnalysisResult {
    private boolean isReceipt;
    private String bankName;
    private String receiptNumber;
    private String dateTime;
    private Integer amountKzt;
    private String recipientName;
    private String recipientCardLast4;
    private String senderName;
    private Double confidence;
    private String rawSummary;
    private String rawJson;
    private boolean aiUnavailable;
}
