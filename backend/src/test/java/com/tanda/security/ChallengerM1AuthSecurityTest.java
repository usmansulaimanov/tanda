package com.tanda.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.config.JwtProperties;
import com.tanda.controller.AuthController;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.dto.auth.RegisterRequestDto;
import com.tanda.entity.RefreshToken;
import com.tanda.entity.User;
import com.tanda.repository.RefreshTokenRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.RefreshTokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Adversarial Empirical Challenge Test Suite for Milestone 1:
 * Backend Auth & Session Hardening.
 *
 * Verifies:
 * 1. Token Lifetime & Boundary Timing (15m = 900,000ms duration, boundary evaluation, expired token rejection).
 * 2. Signature Tampering & Forgery Resistance (tampered payload, corrupted signature, "none" alg, foreign secret, malformed tokens).
 * 3. Cookie Security Attributes (HttpOnly, SameSite=Lax, Path=/, Max-Age=2592000, Max-Age=0 on logout).
 * 4. Refresh Token Multi-Device Concurrent Session Revocation & Reuse Detection.
 * 5. Database State Integrity (SHA-256 token hashing, expiration handling, account deactivation).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ChallengerM1AuthSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtProperties jwtProperties;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String CHALLENGE_EMAIL = "challenger_target@tanda.kz";
    private static final String CHALLENGE_PASSWORD = "HardenedPassword2026!";
    private User testUser;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        userRepository.findByEmail(CHALLENGE_EMAIL).ifPresent(userRepository::delete);

        String uniqueIdNum = "c1" + String.format("%08d", (int)(Math.random() * 100000000));
        testUser = User.builder()
                .id("challenger-user-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber(uniqueIdNum)
                .name("Challenger Target User")
                .email(CHALLENGE_EMAIL)
                .passwordHash(passwordEncoder.encode(CHALLENGE_PASSWORD))
                .authProvider("LOCAL")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build();
        testUser = userRepository.save(testUser);
    }

    // =========================================================================
    // SECTION 1: ACCESS TOKEN EXPIRATION & BOUNDARY TIMING CHALLENGES
    // =========================================================================

    @Test
    @DisplayName("CHALLENGE 1.1: JwtProperties default and bound expiration must be exactly 900,000 ms (15 minutes)")
    void challenge_tokenExpiration_isConfiguredTo900000ms() {
        assertThat(jwtProperties.getExpiration())
                .as("Access token expiration must be configured to 900,000 ms (15 minutes)")
                .isEqualTo(900000L);
    }

    @Test
    @DisplayName("CHALLENGE 1.2: Generated access token must have duration = exactly 900,000 ms")
    void challenge_generatedToken_durationIsExactly15Minutes() {
        String token = jwtTokenProvider.generateToken(testUser);
        assertThat(token).isNotBlank();

        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        Claims claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(keyBytes))
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Date issuedAt = claims.getIssuedAt();
        Date expiration = claims.getExpiration();

        assertThat(issuedAt).isNotNull();
        assertThat(expiration).isNotNull();

        long durationMs = expiration.getTime() - issuedAt.getTime();
        assertThat(durationMs)
                .as("Difference between expiration and issuedAt must be exactly 900,000 ms (15 min)")
                .isEqualTo(900000L);
    }

    @Test
    @DisplayName("CHALLENGE 1.3: Boundary timing - token expired by 1 millisecond must be rejected")
    void challenge_boundaryTiming_tokenExpiredBy1msRejected() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        SecretKey key = Keys.hmacShaKeyFor(keyBytes);

        long now = System.currentTimeMillis();
        Date issuedAt = new Date(now - 900001L);
        Date expiredAt = new Date(now - 1L); // Expired 1 millisecond ago

        String expiredToken = Jwts.builder()
                .subject(testUser.getEmail())
                .claim("userId", testUser.getId())
                .claim("role", testUser.getRole())
                .issuedAt(issuedAt)
                .expiration(expiredAt)
                .signWith(key)
                .compact();

        // 1. validateToken must return false
        assertThat(jwtTokenProvider.validateToken(expiredToken))
                .as("validateToken must reject token expired by 1ms")
                .isFalse();

        // 2. getEmailFromToken must throw ExpiredJwtException
        assertThatThrownBy(() -> jwtTokenProvider.getEmailFromToken(expiredToken))
                .isInstanceOf(ExpiredJwtException.class);

        // 3. getUserIdFromToken must throw ExpiredJwtException
        assertThatThrownBy(() -> jwtTokenProvider.getUserIdFromToken(expiredToken))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    @DisplayName("CHALLENGE 1.4: Protected endpoint GET /api/v1/auth/me rejects expired access token with HTTP 401")
    void challenge_endpointRejectsExpiredTokenWith401() throws Exception {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        SecretKey key = Keys.hmacShaKeyFor(keyBytes);

        long now = System.currentTimeMillis();
        Date issuedAt = new Date(now - 1000000L);
        Date expiredAt = new Date(now - 100000L); // expired 100 seconds ago

        String expiredToken = Jwts.builder()
                .subject(testUser.getEmail())
                .claim("userId", testUser.getId())
                .claim("role", testUser.getRole())
                .issuedAt(issuedAt)
                .expiration(expiredAt)
                .signWith(key)
                .compact();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CHALLENGE 1.5: Valid access token before expiration allows access to GET /api/v1/auth/me")
    void challenge_validTokenBeforeExpirationSucceeds() throws Exception {
        String token = jwtTokenProvider.generateToken(testUser);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(testUser.getEmail()))
                .andExpect(jsonPath("$.id").value(testUser.getId()));
    }

    // =========================================================================
    // SECTION 2: SIGNATURE TAMPERING & FORGERY RESISTANCE CHALLENGES
    // =========================================================================

    @Test
    @DisplayName("CHALLENGE 2.1: Tampered payload (privilege escalation client -> admin) is rejected with 401")
    void challenge_tamperedPayload_rejected() throws Exception {
        String validToken = jwtTokenProvider.generateToken(testUser);
        String[] parts = validToken.split("\\.");
        assertThat(parts).hasSize(3);

        String header = parts[0];
        String payload = parts[1];
        String signature = parts[2];

        // Decode payload JSON
        byte[] payloadBytes = Base64.getUrlDecoder().decode(payload);
        String payloadJson = new String(payloadBytes, StandardCharsets.UTF_8);

        // Tamper role: change "client" to "admin"
        assertThat(payloadJson).contains("\"role\":\"client\"");
        String tamperedPayloadJson = payloadJson.replace("\"role\":\"client\"", "\"role\":\"admin\"");
        String tamperedPayloadEncoded = Base64.getUrlEncoder().withoutPadding().encodeToString(tamperedPayloadJson.getBytes(StandardCharsets.UTF_8));

        String tamperedToken = header + "." + tamperedPayloadEncoded + "." + signature;

        // 1. validateToken must return false
        assertThat(jwtTokenProvider.validateToken(tamperedToken))
                .as("Tampered payload must be rejected by validateToken")
                .isFalse();

        // 2. Request with tampered token to /api/v1/auth/me must return 401
        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tamperedToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CHALLENGE 2.2: Corrupted signature is rejected with 401")
    void challenge_corruptedSignature_rejected() throws Exception {
        String validToken = jwtTokenProvider.generateToken(testUser);
        String[] parts = validToken.split("\\.");
        String signature = parts[2];

        // Flip last character of signature
        char lastChar = signature.charAt(signature.length() - 1);
        char alteredChar = (lastChar == 'z') ? 'a' : (char) (lastChar + 1);
        String corruptSignature = signature.substring(0, signature.length() - 1) + alteredChar;

        String corruptToken = parts[0] + "." + parts[1] + "." + corruptSignature;

        assertThat(jwtTokenProvider.validateToken(corruptToken))
                .as("Corrupted signature must be rejected")
                .isFalse();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + corruptToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CHALLENGE 2.3: None algorithm attack (alg: none) is strictly rejected")
    void challenge_noneAlgorithmAttack_rejected() throws Exception {
        String headerNone = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                String.format("{\"sub\":\"%s\",\"userId\":\"%s\",\"role\":\"admin\"}", testUser.getEmail(), testUser.getId()).getBytes(StandardCharsets.UTF_8)
        );
        // Signature empty
        String unsignedToken = headerNone + "." + payload + ".";

        assertThat(jwtTokenProvider.validateToken(unsignedToken))
                .as("Unsigned 'none' algorithm token must be rejected")
                .isFalse();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + unsignedToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CHALLENGE 2.4: Token signed with foreign HMAC secret is rejected")
    void challenge_foreignSecretToken_rejected() throws Exception {
        SecretKey foreignKey = Keys.hmacShaKeyFor("adversary-forged-secret-key-at-least-256-bits-long!".getBytes(StandardCharsets.UTF_8));

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + 900000L);

        String foreignToken = Jwts.builder()
                .subject(testUser.getEmail())
                .claim("userId", testUser.getId())
                .claim("role", "admin")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(foreignKey)
                .compact();

        assertThat(jwtTokenProvider.validateToken(foreignToken))
                .as("Token signed with attacker secret key must be rejected")
                .isFalse();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + foreignToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CHALLENGE 2.5: Malformed, truncated, and garbage tokens do not cause 500 errors and are rejected with 401")
    void challenge_malformedTokens_safeRejection() throws Exception {
        String[] malformedTokens = {
                "",
                "   ",
                "not-a-jwt",
                "singleSegmentToken",
                "two.segments",
                "four.segments.are.invalid",
                "~!@#$%^&*()_+{}[]|:<>?",
                "Bearer",
                "eyJhbGciOiJIUzI1NiJ9.invalid-payload.signature"
        };

        for (String malformed : malformedTokens) {
            assertThat(jwtTokenProvider.validateToken(malformed))
                    .as("validateToken must return false for malformed: %s", malformed)
                    .isFalse();

            mockMvc.perform(get("/api/v1/auth/me")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + malformed))
                    .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // SECTION 3: COOKIE SECURITY ATTRIBUTES ON ALL AUTH ENDPOINTS
    // =========================================================================

    @Test
    @DisplayName("CHALLENGE 3.1: POST /api/v1/auth/login sets HttpOnly, SameSite=Lax, Path=/, Max-Age=2592000")
    void challenge_loginCookieSecurityAttributes() throws Exception {
        LoginRequestDto request = LoginRequestDto.builder()
                .email(CHALLENGE_EMAIL)
                .password(CHALLENGE_PASSWORD)
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, not(containsString("Max-Age=0"))))
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_COOKIE_NAME, true))
                .andExpect(cookie().path(AuthController.REFRESH_COOKIE_NAME, "/"))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 2592000));
    }

    @Test
    @DisplayName("CHALLENGE 3.2: POST /api/v1/auth/register sets HttpOnly, SameSite=Lax, Path=/, Max-Age=2592000")
    void challenge_registerCookieSecurityAttributes() throws Exception {
        String newEmail = "cookie_check_" + UUID.randomUUID().toString().substring(0, 8) + "@tanda.kz";
        RegisterRequestDto request = RegisterRequestDto.builder()
                .name("Cookie Check")
                .email(newEmail)
                .password("Password123!")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_COOKIE_NAME, true))
                .andExpect(cookie().path(AuthController.REFRESH_COOKIE_NAME, "/"))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 2592000));
    }

    @Test
    @DisplayName("CHALLENGE 3.3: POST /api/v1/auth/refresh sets rotated HttpOnly cookie with Max-Age=2592000")
    void challenge_refreshCookieSecurityAttributes() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(CHALLENGE_EMAIL)
                .password(CHALLENGE_PASSWORD)
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie loginCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(loginCookie).isNotNull();

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(loginCookie))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_COOKIE_NAME, true))
                .andExpect(cookie().path(AuthController.REFRESH_COOKIE_NAME, "/"))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 2592000))
                .andReturn();

        Cookie rotatedCookie = refreshResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(rotatedCookie).isNotNull();
        assertThat(rotatedCookie.getValue())
                .as("Rotated refresh token must not match previous token")
                .isNotEqualTo(loginCookie.getValue());
    }

    @Test
    @DisplayName("CHALLENGE 3.4: POST /api/v1/auth/logout sets Max-Age=0, Path=/, clearing the cookie")
    void challenge_logoutCookieClearingAttributes() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(CHALLENGE_EMAIL)
                .password(CHALLENGE_PASSWORD)
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie loginCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(loginCookie).isNotNull();

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(loginCookie))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 0));

        // Subsequent refresh with logged out cookie must fail
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(loginCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CHALLENGE 3.5: Dual prefix parity - unversioned /api/auth/login and logout enforce identical cookie attributes")
    void challenge_unversionedRouteCookieParity() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(CHALLENGE_EMAIL)
                .password(CHALLENGE_PASSWORD)
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andReturn();

        Cookie cookie = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(cookie).isNotNull();

        mockMvc.perform(post("/api/auth/logout")
                        .cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")));
    }

    // =========================================================================
    // SECTION 4: CONCURRENT SESSIONS, REUSE DETECTION & DATABASE INTEGRITY
    // =========================================================================

    @Test
    @DisplayName("CHALLENGE 4.1: Tri-device concurrent session revocation upon token reuse attack")
    void challenge_triDeviceSessionRevocationUponReuse() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(CHALLENGE_EMAIL)
                .password(CHALLENGE_PASSWORD)
                .build();

        // 1. Device 1 (Desktop) logs in
        MvcResult dev1Result = mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.USER_AGENT, "Desktop-Chrome")
                        .header("X-Forwarded-For", "10.0.0.1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie dev1Cookie = dev1Result.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        // 2. Device 2 (Mobile) logs in
        MvcResult dev2Result = mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.USER_AGENT, "Mobile-Safari")
                        .header("X-Forwarded-For", "10.0.0.2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie dev2Cookie = dev2Result.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        // 3. Device 3 (Tablet) logs in
        MvcResult dev3Result = mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.USER_AGENT, "Tablet-Firefox")
                        .header("X-Forwarded-For", "10.0.0.3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie dev3Cookie = dev3Result.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        // Verify 3 active sessions exist in DB
        List<RefreshToken> activeTokens = refreshTokenRepository.findAllByUserIdAndRevokedFalse(testUser.getId());
        assertThat(activeTokens).hasSize(3);

        // 4. Device 1 rotates token
        MvcResult dev1RotateResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.USER_AGENT, "Desktop-Chrome")
                        .cookie(dev1Cookie))
                .andExpect(status().isOk())
                .andReturn();
        Cookie dev1NewCookie = dev1RotateResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        // Device 2 and 3 should still have active sessions
        assertThat(refreshTokenRepository.findAllByUserIdAndRevokedFalse(testUser.getId())).hasSize(3);

        // 5. Adversary replays old dev1Cookie (already revoked)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.USER_AGENT, "Adversary-Script")
                        .cookie(dev1Cookie))
                .andExpect(status().isUnauthorized());

        // 6. Assert all tokens for user are now revoked in DB
        List<RefreshToken> remainingActive = refreshTokenRepository.findAllByUserIdAndRevokedFalse(testUser.getId());
        assertThat(remainingActive)
                .as("All sessions across all devices must be revoked when a revoked token is reused")
                .isEmpty();

        // 7. Every active device is now locked out
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(dev1NewCookie)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(dev2Cookie)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(dev3Cookie)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CHALLENGE 4.2: Database stores only SHA-256 token hashes (raw token never stored)")
    void challenge_databaseStoresOnlySha256TokenHash() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(CHALLENGE_EMAIL)
                .password(CHALLENGE_PASSWORD)
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie cookie = result.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(cookie).isNotNull();
        String rawToken = cookie.getValue();

        List<RefreshToken> allTokens = refreshTokenRepository.findAll();
        assertThat(allTokens).isNotEmpty();

        for (RefreshToken rt : allTokens) {
            // Raw token must NEVER equal tokenHash
            assertThat(rt.getTokenHash())
                    .as("Database must never store raw token in plaintext")
                    .isNotEqualTo(rawToken);

            // tokenHash must be 64-character SHA-256 hex string
            assertThat(rt.getTokenHash())
                    .as("tokenHash must be 64-character hex string (SHA-256)")
                    .hasSize(64)
                    .matches("^[a-f0-9]{64}$");

            // Verify hashing rawToken produces this exact hash
            String expectedHash = refreshTokenService.hashToken(rawToken);
            assertThat(rt.getTokenHash()).isEqualTo(expectedHash);
        }
    }

    @Test
    @DisplayName("CHALLENGE 4.3: Refresh token expired in DB is rejected with 401 and revoked")
    void challenge_databaseExpiredRefreshToken_rejectedAndRevoked() throws Exception {
        String rawToken = "simulated-raw-refresh-token-" + UUID.randomUUID();
        String tokenHash = refreshTokenService.hashToken(rawToken);

        RefreshToken expiredEntity = RefreshToken.builder()
                .id("rt-expired-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(testUser.getId())
                .tokenHash(tokenHash)
                .expiresAt(OffsetDateTime.now().minusHours(2)) // expired 2 hours ago
                .revoked(false)
                .build();
        refreshTokenRepository.save(expiredEntity);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie(AuthController.REFRESH_COOKIE_NAME, rawToken)))
                .andExpect(status().isUnauthorized());

        RefreshToken updated = refreshTokenRepository.findById(expiredEntity.getId()).orElseThrow();
        assertThat(updated.getRevoked())
                .as("Expired token must be marked revoked upon rejection")
                .isTrue();
    }

    @Test
    @DisplayName("CHALLENGE 4.4: Deactivated user account is rejected on token refresh")
    void challenge_deactivatedUserAccount_refreshRejected() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(CHALLENGE_EMAIL)
                .password(CHALLENGE_PASSWORD)
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        // Deactivate user
        testUser.setIsActive(false);
        userRepository.save(testUser);

        // Attempt refresh
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CHALLENGE 4.5: Refresh with empty or missing token returns 401")
    void challenge_missingOrEmptyToken_returns401() throws Exception {
        // No cookie, no body
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized());

        // Empty cookie
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie(AuthController.REFRESH_COOKIE_NAME, "")))
                .andExpect(status().isUnauthorized());

        // Blank whitespace cookie
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie(AuthController.REFRESH_COOKIE_NAME, "   ")))
                .andExpect(status().isUnauthorized());

        // Non-existent random token
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie(AuthController.REFRESH_COOKIE_NAME, "completely-non-existent-token")))
                .andExpect(status().isUnauthorized());
    }
}
