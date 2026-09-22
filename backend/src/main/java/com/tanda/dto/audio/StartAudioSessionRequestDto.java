package com.tanda.dto.audio;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartAudioSessionRequestDto {

    @NotBlank(message = "Book ID is required")
    private String bookId;

    private String chapterId;
}
