package com.tanda.dto.progress;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingProgressResponseDto {

    private String id;
    private String bookId;
    private String userId;
    private Integer currentPage;
    private String currentAudioChapterId;
    private Integer currentAudioTime;
    private OffsetDateTime updatedAt;

    /** EPUB CFI for exact position restore */
    private String epubCfi;
    private Integer fontSize;
    private String readerTheme;
    private Integer colorTemperature;
}

