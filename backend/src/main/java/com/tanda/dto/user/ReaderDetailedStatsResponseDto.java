package com.tanda.dto.user;

import com.tanda.dto.royalty.AuthorDailyStatDto;
import com.tanda.dto.royalty.PeakDayDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReaderDetailedStatsResponseDto {

    private String userId;
    private String idNumber;
    private String name;
    private String email;
    private String phone;
    private String username;
    private String avatarUrl;
    private String birthDate;
    private String gender;
    private Boolean isActive;
    private Boolean isBlocked;
    private Boolean isPremium;
    private OffsetDateTime createdAt;

    private String selectedMonth;
    private String selectedMonthLabel;

    private long todaySeconds;
    private double todayMinutes;
    private String todayFormatted;

    private long monthSeconds;
    private double monthMinutes;
    private double monthHours;
    private String monthFormatted;

    private long allTimeSeconds;
    private double allTimeMinutes;
    private double allTimeHours;
    private String allTimeFormatted;

    private PeakDayDto peakDay;
    private List<AuthorDailyStatDto> dailyList;
    private int totalListenedDays;
    private double averageDailyMinutes;

    private List<ReaderBookListeningDto> books;
}
