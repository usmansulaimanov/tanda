package com.tanda.dto.auth;

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
public class SendVerificationCodeRequestDto {

    @NotBlank(message = "Email міндетті түрде толтырылуы керек")
    @Email(message = "Email пішімі дұрыс емес")
    private String email;

    @Builder.Default
    private String type = "REGISTER";
}
