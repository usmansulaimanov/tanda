package com.tanda.dto.shelf;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBookRequestDto {

    private String status; // 'reading', 'completed', 'want_to_read'

    @Min(value = 1, message = "Current page must be at least 1")
    private Integer currentPage;

    @Min(value = 1, message = "Total pages must be at least 1")
    private Integer totalPages;

    @Min(value = 0, message = "Progress percent must be at least 0")
    @Max(value = 100, message = "Progress percent cannot exceed 100")
    private Double progressPercent;
}
