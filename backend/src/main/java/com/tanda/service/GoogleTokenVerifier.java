package com.tanda.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.tanda.config.GoogleOAuthProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
@RequiredArgsConstructor
@Slf4j
public class GoogleTokenVerifier {

    private final GoogleOAuthProperties googleProps;
    private GoogleIdTokenVerifier verifier;

    @PostConstruct
    public void init() {
        String clientId = googleProps.getClientId();
        GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        );

        if (clientId != null && !clientId.isBlank()) {
            builder.setAudience(Collections.singletonList(clientId.trim()));
        }

        this.verifier = builder.build();
    }

    /**
     * Verifies the Google ID token and returns its verified Payload.
     *
     * @param idToken raw Google JWT ID token
     * @return GoogleIdToken.Payload containing claims (sub, email, name, picture, email_verified)
     * @throws BadCredentialsException if token verification fails or is invalid
     */
    public GoogleIdToken.Payload verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new BadCredentialsException("Google токені көрсетілмеген");
        }

        try {
            GoogleIdToken token = verifier.verify(idToken.trim());
            if (token == null) {
                log.warn("Google token verification returned null for token");
                throw new BadCredentialsException("Жарамсыз немесе мерзімі өтіп кеткен Google токені");
            }
            return token.getPayload();
        } catch (BadCredentialsException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Google token verification exception: {}", e.getMessage());
            throw new BadCredentialsException("Google токенін тексеру сәтсіз аяқталды: " + e.getMessage());
        }
    }
}
