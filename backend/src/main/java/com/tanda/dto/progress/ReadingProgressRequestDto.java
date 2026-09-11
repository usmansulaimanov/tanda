package com.tanda.dto.progress;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingProgressRequestDto {

    @Min(value = 1, message = "Current page must be at least 1")
    private Integer currentPage;

    private String currentAudioChapterId;

    @Min(value = 0, message = "Current audio time must be non-negative")
    private Integer currentAudioTime;
}
