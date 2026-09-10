package com.tanda.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BookResponseDto {

    private String id;
    private String title;
    private String author;
    private String description;
    private String category;
    private Integer pages;
    private Boolean hasAudio;
    private String audioNarrator;
    private String audioDuration;
    private String audioUrl;
    private String coverImage;
    private Boolean isFree;
    private Boolean isArchived;
    private String gradient;
    private OffsetDateTime createdAt;
}
