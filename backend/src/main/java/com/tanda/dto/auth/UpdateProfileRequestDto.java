package com.tanda.dto.auth;

import jakarta.validation.constraints.Size;
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
public class UpdateProfileRequestDto {

    @Size(min = 2, max = 255, message = "Аты-жөні 2-ден 255 таңбаға дейін болуы керек")
    private String name;

    @jakarta.validation.constraints.Email(message = "Электронды пошта дұрыс форматта болуы керек")
    private String email;

    private String avatarUrl;

    private String phone;

    private String username;

    private String birthDate;

    private String gender;
}
