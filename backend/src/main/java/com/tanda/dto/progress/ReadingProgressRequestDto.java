package com.tanda.dto.progress;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
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

    /** EPUB CFI string identifying the exact reading position */
    private String epubCfi;

    @Min(value = 12, message = "Font size must be at least 12")
    @Max(value = 32, message = "Font size must be at most 32")
    private Integer fontSize;

    @Pattern(regexp = "light|sepia|dark", message = "Reader theme must be light, sepia, or dark")
    private String readerTheme;

    @Min(value = -50, message = "Color temperature must be >= -50")
    @Max(value = 50, message = "Color temperature must be <= 50")
    private Integer colorTemperature;
}

