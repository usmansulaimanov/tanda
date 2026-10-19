package com.tanda.dto.royalty;

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
public class AuthorBookItemDto {
    private String id;
    private String title;
    private String author;
    private String coverUrl;
    private Integer pages;
    private Long viewsCount;
    private Long readsCount;
    private Long totalMinutes;
    private Long totalSeconds;
    private Long readingMinutes;
    private Long readingSeconds;
    private Long savedCount;
    private Boolean hasAudio;
    private Boolean hasEbook;
    private String audioUrl;
    private String audioDuration;
    private String category;
    private String gradient;
    private Boolean isArchived;
    private Boolean isDeleted;
    private Boolean isFree;
}
