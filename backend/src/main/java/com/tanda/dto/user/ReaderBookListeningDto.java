package com.tanda.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReaderBookListeningDto {

    private String bookId;
    private String bookTitle;
    private String bookAuthor;
    private String coverImage;
    private String category;
    private long todaySeconds;
    private String todayFormatted;
    private long monthSeconds;
    private String monthFormatted;
    private long allTimeSeconds;
    private String allTimeFormatted;
}
