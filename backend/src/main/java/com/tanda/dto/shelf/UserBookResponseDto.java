package com.tanda.dto.shelf;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBookResponseDto {

    private String id;
    private String bookId;
    private String status;
    private Integer currentPage;
    private Integer totalPages;
    private Double progressPercent;
    private OffsetDateTime addedAt;
    private OffsetDateTime lastReadAt;
    private OffsetDateTime completedAt;
    private OffsetDateTime updatedAt;

    // Book preview metadata
    private String title;
    private String author;
    private String coverImage;
    private String category;
    private Boolean hasAudio;
    private String audioDuration;
    private Boolean isFree;
    private String gradient;
}
