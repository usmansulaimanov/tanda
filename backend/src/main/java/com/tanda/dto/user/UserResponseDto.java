package com.tanda.dto.user;

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
public class UserResponseDto {

    private String id;
    private String idNumber;
    private String name;
    private String email;
    private String role;
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private String avatarUrl;
    private String authProvider;
    private Boolean hasPassword;
    private String phone;
    private String username;
    private String birthDate;
    private String gender;
    private String duty;
    private String personalMessage;
    private Integer personalMessageDays;
    private Boolean personalMessageActive;
    private Boolean isBlocked;
    private List<String> permissions;
    private Boolean isPremium;
    private OffsetDateTime premiumExpiresAt;
    private Integer lastBirthdayGiftYear;
}
