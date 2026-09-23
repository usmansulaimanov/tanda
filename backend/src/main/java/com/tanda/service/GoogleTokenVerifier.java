package com.tanda.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class GoogleTokenVerifier {

    private final GoogleOAuthProperties googleProps;
    private final ObjectMapper objectMapper;
    private GoogleIdTokenVerifier verifier;
    private final Set<String> allowedAudiences = new HashSet<>();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

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

        // Allow 300 seconds (5 min) time skew tolerance to prevent server clock drift rejection
        builder.setAcceptableTimeSkewSeconds(300L);
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

        String trimmed = idToken.trim();

        // 1. First attempt verification using the Google API Client library (fast, cached certs)
        try {
            GoogleIdToken token = verifier.verify(trimmed);
            if (token != null && token.getPayload() != null) {
                return token.getPayload();
            }
            log.warn("Local GoogleIdTokenVerifier returned null for token, trying Google tokeninfo endpoint fallback...");
        } catch (BadCredentialsException bce) {
            throw bce;
        } catch (Exception e) {
            log.warn("Local GoogleIdTokenVerifier threw exception: {}, trying Google tokeninfo fallback...", e.getMessage());
        }

        // 2. Fallback: Authoritative online verification with Google oauth2 tokeninfo
        return verifyOnlineWithGoogle(trimmed);
    }

    private GoogleIdToken.Payload verifyOnlineWithGoogle(String idToken) {
        try {
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Google tokeninfo returned status {}: {}", response.statusCode(), response.body());
                throw new BadCredentialsException("Жарамсыз немесе мерзімі өтіп кеткен Google токені");
            }

            JsonNode json = objectMapper.readTree(response.body());

            String iss = json.path("iss").asText("");
            if (!"accounts.google.com".equals(iss) && !"https://accounts.google.com".equals(iss)) {
                log.warn("Invalid Google token issuer: {}", iss);
                throw new BadCredentialsException("Жарамсыз Google токені: белгісіз қайнаркөз");
            }

            String aud = json.path("aud").asText("");
            String azp = json.path("azp").asText("");
            if (!allowedAudiences.contains(aud) && !allowedAudiences.contains(azp)) {
                log.warn("Google token audience mismatch! aud={}, azp={}, allowed={}", aud, azp, allowedAudiences);
                throw new BadCredentialsException("Google токенінің аудиториясы сәйкес келмейді");
            }

            boolean emailVerified = json.path("email_verified").asBoolean(false)
                    || "true".equalsIgnoreCase(json.path("email_verified").asText(""));
            if (!emailVerified) {
                throw new BadCredentialsException("Google email расталмаған");
            }

            String sub = json.path("sub").asText(null);
            String email = json.path("email").asText(null);
            if (email == null || email.isBlank()) {
                throw new BadCredentialsException("Google профилінде email табылмады");
            }

            String name = json.path("name").asText(email.split("@")[0]);
            String picture = json.path("picture").asText(null);

            GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
            payload.setSubject(sub);
            payload.setEmail(email.trim().toLowerCase());
            payload.setEmailVerified(true);
            payload.set("name", name);
            if (picture != null && !picture.isBlank()) {
                payload.set("picture", picture);
            }
            payload.setAudience(aud.isBlank() ? azp : aud);
            payload.setIssuer(iss);

            log.info("Google token successfully verified online for email: {}", email);
            return payload;

        } catch (BadCredentialsException bce) {
            throw bce;
        } catch (Exception e) {
            log.error("Failed to verify Google token online: {}", e.getMessage());
            throw new BadCredentialsException("Google токенін тексеру сәтсіз аяқталды: " + e.getMessage());
        }
    }
}
