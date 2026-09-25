package com.tanda.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReaderListeningOverviewDto {

    private String id;
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

    private long todaySeconds;
    private double todayMinutes;
    private String todayFormatted;

    private long monthSeconds;
    private double monthMinutes;
    private String monthFormatted;

    private long allTimeSeconds;
    private double allTimeMinutes;
    private String allTimeFormatted;
}
