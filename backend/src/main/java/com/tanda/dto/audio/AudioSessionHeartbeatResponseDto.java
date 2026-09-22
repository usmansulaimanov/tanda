package com.tanda.dto.audio;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioSessionHeartbeatResponseDto {

    private String sessionId;
    private Integer validSeconds;
    private Integer positionSeconds;
}
