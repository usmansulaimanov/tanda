package com.tanda.dto.royalty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoyaltyEarningResponseDto {
    private String id;
    private String periodId;
    private String authorId;
    private String authorName;
    private String bookId;
    private String bookTitle;
    private Long minutesListened;
    private BigDecimal amount;
    private String status;
    private OffsetDateTime createdAt;
}
