package com.tanda.dto.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.AssertTrue;
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
public class GoogleAuthRequestDto {

    @JsonAlias({"idToken", "id_token", "token"})
    private String credential;

    /**
     * Fallback/helper to get credential string regardless of field name used.
     */
    public String getCredential() {
        return credential != null ? credential.trim() : null;
    }

    @AssertTrue(message = "Google токені міндетті")
    public boolean isValid() {
        return credential != null && !credential.trim().isEmpty();
    }
}
