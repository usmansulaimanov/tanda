package com.tanda.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingSummaryResponseDto {

    @Builder.Default
    private Double averageRating = 0.0;

    @Builder.Default
    private Integer ratingCount = 0;

    @Builder.Default
    private Map<Integer, Long> distribution = new HashMap<>();

    @Builder.Default
    private Map<Integer, Double> percentages = new HashMap<>();
}
