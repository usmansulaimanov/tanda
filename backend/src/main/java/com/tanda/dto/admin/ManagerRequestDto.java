package com.tanda.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
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
public class ManagerRequestDto {

    @NotBlank(message = "Көмекшінің аты-жөнін жазыңыз")
    private String name;

    @NotBlank(message = "Электронды поштасын жазыңыз")
    @Email(message = "Жарамды электронды пошта енгізіңіз")
    private String email;

    private String password;
    private String duty;
    private String avatarUrl;
    private String idNumber;

    @NotEmpty(message = "Кем дегенде бір рұқсат (функция) таңдалуы керек")
    private List<String> permissions;

    private Boolean isActive;
}
