package com.tanda.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
    @Size(min = 8, message = "Құпиясөз кемінде 8 таңбадан тұруы керек")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[\\x21-\\x7E]{8,}$",
            message = "Құпиясөз кемінде 8 таңбадан тұруы және 1 бас әріп, 1 кіші әріп, 1 саннан құралуы шарт"
    )
    private String newPassword;

    private String googleIdToken;
}
