package com.tanda.dto.audio;

import com.tanda.dto.BookResponseDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopAudioBookResponseDto {
    private int rank;
    private BookResponseDto book;
    private long todayListens;
    private long totalListens;
    private long totalSeconds;
}
