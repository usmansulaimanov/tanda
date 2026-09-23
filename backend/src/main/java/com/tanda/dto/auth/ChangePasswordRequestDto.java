package com.tanda.dto.auth;

import jakarta.validation.constraints.NotBlank;
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
public class ChangePasswordRequestDto {

    private String currentPassword;

    @NotBlank(message = "Жаңа құпиясөзді енгізіңіз")
    @Size(min = 6, message = "Жаңа құпиясөз кемінде 6 таңбадан тұруы керек")
    private String newPassword;
}
