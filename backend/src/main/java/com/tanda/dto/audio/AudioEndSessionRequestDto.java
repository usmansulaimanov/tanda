package com.tanda.dto.audio;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioEndSessionRequestDto {

    @Min(value = 0, message = "Position must be non-negative")
    private Integer positionSeconds;

    private Double playbackRate;
}
