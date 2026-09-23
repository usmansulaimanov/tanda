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

import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class GoogleTokenVerifier {

    private final GoogleOAuthProperties googleProps;
    private GoogleIdTokenVerifier verifier;
    private final Set<String> allowedAudiences = new HashSet<>();

    @PostConstruct
    public void init() {
        // Support all known Google Client IDs for Tanda (current, legacy, or configured)
        allowedAudiences.add("470329734598-c32dk937vu2hgkbvblqjuvi43noc1mu9.apps.googleusercontent.com");
        allowedAudiences.add("249161344734-j51fft6shbogf2clnrhofn3l0c1euihl.apps.googleusercontent.com");

        String clientId = googleProps.getClientId();
        if (clientId != null && !clientId.isBlank()) {
            for (String id : clientId.split("[,;\\s]+")) {
                if (!id.isBlank()) {
                    allowedAudiences.add(id.trim());
                }
            }
        }

        log.info("Initialized GoogleTokenVerifier with allowed audiences: {}", allowedAudiences);

        GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        );

        builder.setAudience(allowedAudiences);
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
                try {
                    GoogleIdToken parsed = GoogleIdToken.parse(GsonFactory.getDefaultInstance(), idToken.trim());
                    if (parsed != null && parsed.getPayload() != null) {
                        var p = parsed.getPayload();
                        log.warn("Google token verification returned null! aud={}, iss={}, exp={}, email={}. Allowed audiences: {}",
                                p.getAudience(), p.getIssuer(), p.getExpirationTimeSeconds(), p.getEmail(), allowedAudiences);
                    }
                } catch (Exception ex) {
                    log.warn("Failed to parse rejected Google token for diagnostics: {}", ex.getMessage());
                }
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
