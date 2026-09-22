package com.tanda.dto.audio;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioHeartbeatRequestDto {

    @NotNull(message = "Position in seconds is required")
    @Min(value = 0, message = "Position must be non-negative")
    private Integer positionSeconds;
}
