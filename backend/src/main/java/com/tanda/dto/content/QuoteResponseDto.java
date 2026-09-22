package com.tanda.dto.content;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuoteResponseDto {

    private String id;
    private String text;
    private String author;
    private String bookId;
    private String bookTitle;
    private Boolean isActive;
    private Integer sentCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
