package com.tanda.dto.book;

import com.tanda.dto.royalty.AuthorDailyStatDto;
import com.tanda.dto.royalty.PeakDayDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookStatsResponseDto {

    private String bookId;
    private String title;
    private String author;
    private String coverImage;
    private String category;
    private Integer pages;
    private Boolean hasAudio;
    private Boolean hasEbook;
    private String audioDuration;
    private String assignedAuthorId;

    private String selectedMonth;
    private String selectedMonthLabel;

    private Long todaySeconds;
    private Double todayMinutes;

    private Long monthSeconds;
    private Double monthMinutes;
    private Double monthHours;

    private Long allTimeSeconds;
    private Double allTimeMinutes;
    private Double allTimeHours;

    private Long monthUniqueListeners;
    private Long allTimeUniqueListeners;

    private PeakDayDto peakDay;

    @Builder.Default
    private List<AuthorDailyStatDto> dailyList = new ArrayList<>();

    private Integer totalListenedDays;
    private Double averageDailyMinutes;
}
