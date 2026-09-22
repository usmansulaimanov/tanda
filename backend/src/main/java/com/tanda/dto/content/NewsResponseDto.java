package com.tanda.dto.content;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsResponseDto {

    private String id;
    private String title;
    private String content;
    private String summary;
    private String imageUrl;
    private List<String> images;
    private String linkUrl;
    private String linkText;
    private String authorName;
    private Integer viewsCount;
    private Boolean isPublished;
    private OffsetDateTime publishedAt;
    private OffsetDateTime scheduledAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
