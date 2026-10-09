package com.tanda.dto.tracker;

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
public class UserReadingStatsResponseDto {

    private Long totalReadingSeconds;
    private Long todayReadingSeconds;
    private Long weekReadingSeconds;
    private Long monthReadingSeconds;
    private Boolean allowGroupInvites;
}
