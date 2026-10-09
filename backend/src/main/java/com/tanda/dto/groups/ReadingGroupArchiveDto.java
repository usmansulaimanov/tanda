package com.tanda.dto.groups;

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
public class ReadingGroupArchiveDto {

    private String id;
    private String yearMonth;
    private String winnerUserId;
    private String winnerName;
    private Long winnerReadingSeconds;
    private Long totalGroupReadingSeconds;
    private OffsetDateTime createdAt;
}
