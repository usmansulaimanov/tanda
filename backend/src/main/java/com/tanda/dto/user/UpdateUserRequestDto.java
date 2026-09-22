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
public class UpdateUserRequestDto {

    private String name;
    private String email;
    private String role;
    private Boolean isActive;
    private Boolean isBlocked;
    private String phone;
    private String username;
    private String idNumber;
    private String birthDate;
    private String gender;
    private String duty;
    private String password;
    private String avatarUrl;
    private String personalMessage;
    private Integer personalMessageDays;
    private Boolean personalMessageActive;
}
