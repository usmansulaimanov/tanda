package com.tanda.dto.audio;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioSessionResponseDto {

    private String sessionId;
    private String bookId;
    private String chapterId;
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;
    private Integer validSeconds;
}
