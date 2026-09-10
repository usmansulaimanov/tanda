package com.tanda.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBookRequestDto {

    private String id;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Author is required")
    private String author;

    private String description;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Pages count is required")
    @Min(value = 1, message = "Pages must be at least 1")
    private Integer pages;

    @Builder.Default
    private Boolean hasAudio = false;

    private String audioNarrator;
    private String audioDuration;
    private String audioUrl;
    private String coverImage;

    @Builder.Default
    private Boolean isFree = true;

    @Builder.Default
    private Boolean isArchived = false;

    private String gradient;

    private List<AudioChapterDto> audioChapters;
}
