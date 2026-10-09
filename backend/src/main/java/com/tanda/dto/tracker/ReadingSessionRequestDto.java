package com.tanda.dto.tracker;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
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
public class ReadingSessionRequestDto {

    private String groupId;
    private Long bookId;
    private String bookTitle;

    @Builder.Default
    private String sessionType = "STOPWATCH";

    @NotNull
    @Min(value = 1, message = "Duration must be at least 1 second")
    @Max(value = 14400, message = "Single session duration cannot exceed 4 hours (14400 seconds)")
    private Long durationSeconds;

    @NotNull
    private OffsetDateTime startedAt;

    @NotNull
    private OffsetDateTime endedAt;
}
