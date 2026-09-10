package com.tanda.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AudioChapterDto {

    private String id;
    private String bookId;
    private String title;
    private String audioUrl;
    private String duration;
    private Integer chapterOrder;
}
