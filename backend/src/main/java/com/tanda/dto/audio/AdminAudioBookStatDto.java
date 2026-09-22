package com.tanda.dto.audio;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAudioBookStatDto {
    private String bookId;
    private String title;
    private String author;
    private String coverImage;
    private long sessionsCount;
    private long totalSeconds;
    private long uniqueListeners;
}
