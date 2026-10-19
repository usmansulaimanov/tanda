package com.tanda.dto.ebook;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EbookSessionHeartbeatResponseDto {

    private String sessionId;
    private Integer validSeconds;
    private Integer creditedSeconds;
    private Boolean idlePaused;
    private Boolean dailyLimitReached;
    private Integer remainingDailySeconds;
}
