package com.tanda.dto.content;

import jakarta.validation.constraints.NotBlank;
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
public class NewsRequestDto {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    private String summary;
    private String imageUrl;
    private List<String> images;
    private String linkUrl;
    private String linkText;
    private String authorName;
    private Boolean isPublished;
    private OffsetDateTime publishedAt;
    private OffsetDateTime scheduledAt;
}
