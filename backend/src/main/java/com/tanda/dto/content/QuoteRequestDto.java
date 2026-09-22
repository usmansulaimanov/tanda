package com.tanda.dto.content;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuoteRequestDto {

    @NotBlank(message = "Quote text is required")
    private String text;

    private String author;
    private String bookId;
    private String bookTitle;
    private Boolean isActive;
}
