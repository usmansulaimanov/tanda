package com.tanda.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class CreateUserRequestDto {

    @NotBlank(message = "Аты-жөнін жазыңыз")
    private String name;

    @NotBlank(message = "Электронды поштасын жазыңыз")
    @Email(message = "Жарамды электронды пошта енгізіңіз")
    private String email;

    private String password;
    private String phone;
    private String username;
    private String idNumber;
    private String birthDate;
    private String gender;
    private String duty;
    private String role; // "admin" | "client" | "author"
    private String avatarUrl;
    private String personalMessage;
    private Integer personalMessageDays;
    private Boolean personalMessageActive;
}
