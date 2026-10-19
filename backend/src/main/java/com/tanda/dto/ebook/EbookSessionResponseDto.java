package com.tanda.dto.ebook;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EbookSessionResponseDto {

    private String sessionId;
    private String bookId;
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;
    private Integer validSeconds;
    private Integer creditedSeconds;
}
