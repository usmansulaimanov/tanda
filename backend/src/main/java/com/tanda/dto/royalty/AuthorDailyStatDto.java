package com.tanda.dto.royalty;

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
public class AuthorDailyStatDto {
    private String date; // "YYYY-MM-DD"
    private String label; // "DD.MM"
    private String shortLabel;
    private Long seconds;
    private Double minutes;
    private Boolean isToday;
    private Boolean isPeak;
}
