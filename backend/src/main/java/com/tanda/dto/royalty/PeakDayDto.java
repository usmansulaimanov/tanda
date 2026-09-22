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
public class PeakDayDto {
    private String date;
    private String label;
    private Long seconds;
    private Double minutes;
}
