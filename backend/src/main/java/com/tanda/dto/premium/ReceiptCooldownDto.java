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
public class ReceiptCooldownDto {
    private boolean locked;
    private long remainingSeconds;
    private int currentStage;
    private OffsetDateTime unlockAt;
    private String message;
}
