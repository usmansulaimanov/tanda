package com.tanda.dto.audio;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDailyLimitResponseDto {
    private Integer totalSeconds;
    private Integer maxSeconds;
    private Integer remainingSeconds;
    private Boolean limitReached;
}
