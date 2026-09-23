package com.tanda.dto.auth;

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
public class VerifyGoogleReauthRequestDto {

    @NotBlank(message = "Google токені көрсетілмеген")
    private String googleIdToken;
}
