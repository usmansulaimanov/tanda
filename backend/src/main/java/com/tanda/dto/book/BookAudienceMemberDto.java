package com.tanda.dto.book;

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
public class BookAudienceMemberDto {

    private String userId;
    private String idNumber;
    private String name;
    private String email;
    private String phone;
    private String username;
    private String avatarUrl;
    private long totalSeconds;
    private long totalMinutes;
    private String formattedDuration;
    private OffsetDateTime lastListenedAt;
}
