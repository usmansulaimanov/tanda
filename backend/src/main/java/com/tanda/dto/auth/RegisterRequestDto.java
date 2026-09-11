package com.tanda.dto.auth;

import jakarta.validation.constraints.Email;
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
public class RegisterRequestDto {

    @NotBlank(message = "Аты-жөні міндетті түрде толтырылуы керек")
    @Size(min = 2, max = 255, message = "Аты-жөні 2 мен 255 таңба аралығында болуы керек")
    private String name;

    @NotBlank(message = "Email міндетті түрде толтырылуы керек")
    @Email(message = "Email пішімі дұрыс емес")
    private String email;

    @NotBlank(message = "Құпия сөз міндетті түрде толтырылуы керек")
    @Size(min = 6, message = "Құпия сөз кемінде 6 таңбадан тұруы керек")
    private String password;
}
