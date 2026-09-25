package com.tanda.dto.book;

import com.tanda.dto.royalty.AuthorDailyStatDto;
import com.tanda.dto.royalty.PeakDayDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBookListeningStatsResponseDto {

    private String userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String userAvatarUrl;
    private String userIdNumber;
    private String userUsername;

    private String bookId;
    private String bookTitle;
    private String bookAuthor;
    private String bookCoverImage;
    private String bookCategory;

    private String selectedMonth;
    private String selectedMonthLabel;

    private long userTodayTotalSeconds;
    private double userTodayTotalMinutes;

    private long todayBookSeconds;
    private double todayBookMinutes;

    private long monthBookSeconds;
    private double monthBookMinutes;
    private double monthBookHours;

    private long allTimeBookSeconds;
    private double allTimeBookMinutes;
    private double allTimeBookHours;

    private PeakDayDto peakDay;
    private List<AuthorDailyStatDto> dailyList;

    private int totalListenedDays;
    private double averageDailyMinutes;
}
