package com.tanda.dto.royalty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorEarningSummaryDto {
    private String authorId;
    private String authorUserId;
    private String authorName;
    private List<String> assignedBookIds;
    private Long totalMinutes;
    private Long totalSeconds;
    private BigDecimal totalEarned;
    private String status;
}
