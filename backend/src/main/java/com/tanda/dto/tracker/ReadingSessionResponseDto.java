package com.tanda.dto.tracker;

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
public class ReadingSessionResponseDto {

    private String id;
    private String userId;
    private String groupId;
    private Long bookId;
    private String bookTitle;
    private String sessionType;
    private Long durationSeconds;
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;
    private OffsetDateTime createdAt;
}
