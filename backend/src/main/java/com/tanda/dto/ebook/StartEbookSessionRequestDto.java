package com.tanda.dto.ebook;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartEbookSessionRequestDto {

    @NotBlank(message = "Book ID is required")
    private String bookId;

    private Integer currentPage;
    private Integer totalPages;
    private String currentCfi;
}
