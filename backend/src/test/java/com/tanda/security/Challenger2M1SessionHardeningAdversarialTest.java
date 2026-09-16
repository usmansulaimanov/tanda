package com.tanda.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.controller.AuthController;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.entity.RefreshToken;
import com.tanda.entity.User;
import com.tanda.repository.RefreshTokenRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.RefreshTokenService;
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

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Adversarial Empirical Verification Suite by Challenger 2:
 * Milestone 1: Backend Auth & Session Hardening.
 *
 * Specific Verification Scenarios:
 * 1. Multi-device rotation chain + intermediate revoked token replay -> instant revocation of ALL active sessions across ALL devices.
 * 2. Subsequent refresh attempts by all rotated and active tokens are blocked with HTTP 401 Unauthorized.
 * 3. Cross-tenant isolation: Token replay for User Alpha must NEVER revoke or affect User Beta's active sessions.
 * 4. Dual refresh pathways: Cookie-based vs JSON Request Body fallback and precedence resolution.
 * 5. Logout token replay: Replaying a token revoked via /logout triggers multi-device reuse detection and terminates other active sessions.
 * 6. Dual prefix parity: Route parity between /api/auth/refresh and /api/v1/auth/refresh.
 * 7. Adversarial edge cases: Empty/malformed bodies, SQL injection payloads.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class Challenger2M1SessionHardeningAdversarialTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String USER_A_EMAIL = "challenger2_alpha@tanda.kz";
    private static final String USER_B_EMAIL = "challenger2_beta@tanda.kz";
    private static final String COMMON_PWD = "SecurePassword2026!";

    private User userAlpha;
    private User userBeta;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        userRepository.findByEmail(USER_A_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail(USER_B_EMAIL).ifPresent(userRepository::delete);

        userAlpha = User.builder()
                .id("c2-user-alpha-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber("701 001")
                .name("Challenger Alpha")
                .email(USER_A_EMAIL)
                .passwordHash(passwordEncoder.encode(COMMON_PWD))
                .authProvider("LOCAL")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build();
        userAlpha = userRepository.save(userAlpha);

        userBeta = User.builder()
                .id("c2-user-beta-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber("701 002")
                .name("Challenger Beta")
                .email(USER_B_EMAIL)
                .passwordHash(passwordEncoder.encode(COMMON_PWD))
                .authProvider("LOCAL")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build();
        userBeta = userRepository.save(userBeta);
    }

    private Cookie loginAndGetCookie(String email, String password, String userAgent, String ip) throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(email)
                .password(password)
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.USER_AGENT, userAgent)
                        .header("X-Forwarded-For", ip)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie cookie = result.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(cookie).isNotNull();
        return cookie;
    }

    // =========================================================================
    // SCENARIO 1: 4-DEVICE ROTATION CHAIN & INTERMEDIATE TOKEN REPLAY ATTACK
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 1: Multi-device rotation chain; intermediate revoked token replay revokes ALL devices and blocks subsequent refreshes")
    void testMultiDeviceRotationChainAndIntermediateReplay() throws Exception {
        // Step 1: User Alpha logs in across 4 devices with distinct IPs
        Cookie dev1_t1 = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Device1-Desktop-Chrome", "192.168.11.101");
        Cookie dev2_t1 = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Device2-Mobile-Safari", "192.168.11.102");
        Cookie dev3_t1 = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Device3-Laptop-Firefox", "192.168.11.103");
        Cookie dev4_t1 = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Device4-Office-Edge", "192.168.11.104");

        List<RefreshToken> activeTokensInitial = refreshTokenRepository.findAllByUserIdAndRevokedFalse(userAlpha.getId());
        assertThat(activeTokensInitial).hasSize(4);

        // Step 2: Device 1 performs consecutive token rotations (T1 -> T2 -> T3)
        // Rotation 1: T1 -> T2
        MvcResult rot1 = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.USER_AGENT, "Device1-Desktop-Chrome")
                        .header("X-Forwarded-For", "192.168.11.101")
                        .cookie(dev1_t1))
                .andExpect(status().isOk())
                .andReturn();
        Cookie dev1_t2 = rot1.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(dev1_t2).isNotNull();
        assertThat(dev1_t2.getValue()).isNotEqualTo(dev1_t1.getValue());

        // Rotation 2: T2 -> T3
        MvcResult rot2 = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.USER_AGENT, "Device1-Desktop-Chrome")
                        .header("X-Forwarded-For", "192.168.11.101")
                        .cookie(dev1_t2))
                .andExpect(status().isOk())
                .andReturn();
        Cookie dev1_t3 = rot2.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(dev1_t3).isNotNull();
        assertThat(dev1_t3.getValue()).isNotEqualTo(dev1_t2.getValue());

        // At this point: dev1_t1 (revoked), dev1_t2 (revoked), dev1_t3 (ACTIVE)
        // Devices 2, 3, 4: dev2_t1, dev3_t1, dev4_t1 are still ACTIVE. Total active = 4.
        List<RefreshToken> activeTokensMid = refreshTokenRepository.findAllByUserIdAndRevokedFalse(userAlpha.getId());
        assertThat(activeTokensMid).hasSize(4);

        // Step 3: Adversary replays INTERMEDIATE revoked token dev1_t2
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.USER_AGENT, "Adversary-Bot/1.0")
                        .header("X-Forwarded-For", "45.33.32.156")
                        .cookie(dev1_t2))
                .andExpect(status().isUnauthorized());

        // Step 4: Verify ALL active tokens for user Alpha are immediately revoked in database
        List<RefreshToken> activeTokensAfterReplay = refreshTokenRepository.findAllByUserIdAndRevokedFalse(userAlpha.getId());
        assertThat(activeTokensAfterReplay)
                .as("Replaying an intermediate revoked token must immediately revoke ALL active sessions in DB")
                .isEmpty();

        List<RefreshToken> allAlphaTokens = refreshTokenRepository.findAll().stream()
                .filter(rt -> rt.getUserId().equals(userAlpha.getId()))
                .toList();
        assertThat(allAlphaTokens)
                .isNotEmpty()
                .allMatch(RefreshToken::getRevoked);

        // Step 5: Verify all subsequent refresh attempts from ANY device are blocked with 401
        // Latest Device 1 token (dev1_t3)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.11.101")
                        .cookie(dev1_t3))
                .andExpect(status().isUnauthorized());

        // Device 2 token (dev2_t1)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.11.102")
                        .cookie(dev2_t1))
                .andExpect(status().isUnauthorized());

        // Device 3 token (dev3_t1)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.11.103")
                        .cookie(dev3_t1))
                .andExpect(status().isUnauthorized());

        // Device 4 token (dev4_t1)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.11.104")
                        .cookie(dev4_t1))
                .andExpect(status().isUnauthorized());

        // Oldest Device 1 token (dev1_t1)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.11.101")
                        .cookie(dev1_t1))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // SCENARIO 2: CROSS-TENANT SESSION ISOLATION UNDER ATTACK
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 2: Cross-tenant isolation: Token reuse attack on User Alpha must NOT affect User Beta's active sessions")
    void testCrossTenantSessionIsolation() throws Exception {
        // User Alpha logs in (Device Alpha-1)
        Cookie cookieAlpha1 = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Alpha-Device", "10.12.1.1");

        // User Beta logs in (Device Beta-1 and Beta-2)
        Cookie cookieBeta1 = loginAndGetCookie(USER_B_EMAIL, COMMON_PWD, "Beta-Device-1", "10.12.2.1");
        Cookie cookieBeta2 = loginAndGetCookie(USER_B_EMAIL, COMMON_PWD, "Beta-Device-2", "10.12.2.2");

        // User Alpha rotates cookieAlpha1 -> cookieAlpha2
        MvcResult alphaRot = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "10.12.1.1")
                        .cookie(cookieAlpha1))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookieAlpha2 = alphaRot.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        // Adversary replays old cookieAlpha1 -> triggers reuse detection for User Alpha
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "10.12.99.1")
                        .cookie(cookieAlpha1))
                .andExpect(status().isUnauthorized());

        // User Alpha's active sessions are revoked
        assertThat(refreshTokenRepository.findAllByUserIdAndRevokedFalse(userAlpha.getId())).isEmpty();

        // User Beta's active sessions MUST STILL BE ACTIVE!
        List<RefreshToken> betaActiveTokens = refreshTokenRepository.findAllByUserIdAndRevokedFalse(userBeta.getId());
        assertThat(betaActiveTokens)
                .as("User Beta's active sessions must remain completely untouched")
                .hasSize(2);

        // User Beta can successfully rotate their token
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "10.12.2.1")
                        .cookie(cookieBeta1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "10.12.2.2")
                        .cookie(cookieBeta2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    // =========================================================================
    // SCENARIO 3: DUAL REFRESH PATHWAYS (COOKIE VS BODY) & PRECEDENCE RESOLUTION
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 3.1: Pure body-based refresh rotates token, sets HttpOnly cookie, and invalidates old token")
    void testPureBodyBasedRefresh() throws Exception {
        Cookie loginCookie = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Test-Client", "192.168.13.1");
        String rawToken = loginCookie.getValue();

        // Refresh via JSON Body without sending Cookie
        Map<String, String> body = Map.of("refreshToken", rawToken);
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.13.1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_COOKIE_NAME, true))
                .andExpect(cookie().sameSite(AuthController.REFRESH_COOKIE_NAME, "Lax"))
                .andReturn();

        Cookie newCookie = refreshResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(newCookie).isNotNull();
        assertThat(newCookie.getValue()).isNotEqualTo(rawToken);

        // Replaying old token in Body must fail with 401
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.13.2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());

        // And new token should now be revoked too due to reuse detection
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.13.3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("refreshToken", newCookie.getValue()))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("SCENARIO 3.2: Cookie takes precedence over Body when both are supplied")
    void testCookiePrecedenceOverBody() throws Exception {
        // Device Alpha-1 logs in -> cookieAlpha1
        Cookie cookieAlpha1 = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Device-Alpha-1", "192.168.14.1");

        // Device Alpha-2 logs in -> cookieAlpha2
        Cookie cookieAlpha2 = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Device-Alpha-2", "192.168.14.2");

        // Rotate cookieAlpha2 -> gets cookieAlpha2_new; cookieAlpha2 is now REVOKED
        MvcResult rot = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.14.2")
                        .cookie(cookieAlpha2))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookieAlpha2_new = rot.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        // Case A: Valid cookie in Cookie header, REVOKED token in Body
        // Precedence rule: Cookie takes priority over Body. Since Cookie is valid, request must succeed!
        Map<String, String> revokedBody = Map.of("refreshToken", cookieAlpha2.getValue());
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.14.10")
                        .cookie(cookieAlpha1) // Valid active token
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(revokedBody))) // Revoked token in body
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        // Case B: Blank/Empty cookie in Cookie header, VALID token in Body
        // Fallback rule: If cookie is blank, Body is used. Request must succeed!
        Map<String, String> validBody = Map.of("refreshToken", cookieAlpha2_new.getValue());
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.14.20")
                        .cookie(new Cookie(AuthController.REFRESH_COOKIE_NAME, "")) // Blank cookie
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    // =========================================================================
    // SCENARIO 4: LOGOUT TOKEN REPLAY TRIGGERS MULTI-DEVICE REUSE DETECTION
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 4: Replaying a token revoked via /logout triggers multi-device session revocation")
    void testLogoutTokenReplayRevokesAllSessions() throws Exception {
        // User Alpha logs in on Phone and Laptop
        Cookie phoneCookie = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Alpha-Phone", "192.168.15.1");
        Cookie laptopCookie = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Alpha-Laptop", "192.168.15.2");

        assertThat(refreshTokenRepository.findAllByUserIdAndRevokedFalse(userAlpha.getId())).hasSize(2);

        // User explicitly logs out on Phone
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("X-Forwarded-For", "192.168.15.1")
                        .cookie(phoneCookie))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 0));

        // Laptop is still active
        assertThat(refreshTokenRepository.findAllByUserIdAndRevokedFalse(userAlpha.getId())).hasSize(1);

        // Attacker attempts to replay the logged-out Phone token
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.15.99")
                        .cookie(phoneCookie))
                .andExpect(status().isUnauthorized());

        // Because phoneCookie was revoked by logout, replaying it triggers reuse detection!
        // All active sessions for User Alpha (including the Laptop) must now be revoked!
        List<RefreshToken> activeAfterReplay = refreshTokenRepository.findAllByUserIdAndRevokedFalse(userAlpha.getId());
        assertThat(activeAfterReplay)
                .as("Replaying a logged-out token must revoke all remaining active sessions")
                .isEmpty();

        // Laptop session is now terminated (401)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.15.2")
                        .cookie(laptopCookie))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // SCENARIO 5: DUAL ROUTE PREFIX PARITY (/api/v1/auth vs /api/auth)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 5: Route parity - /api/auth/refresh and /api/v1/auth/refresh have identical rotation and reuse behavior")
    void testDualRoutePrefixParity() throws Exception {
        Cookie cookie1 = loginAndGetCookie(USER_A_EMAIL, COMMON_PWD, "Device-Unversioned", "192.168.16.1");

        // Rotate on unversioned route /api/auth/refresh
        MvcResult rotUnversioned = mockMvc.perform(post("/api/auth/refresh")
                        .header("X-Forwarded-For", "192.168.16.1")
                        .cookie(cookie1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andReturn();

        Cookie cookie2 = rotUnversioned.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(cookie2).isNotNull();

        // Replay cookie1 on versioned route /api/v1/auth/refresh -> 401
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.16.2")
                        .cookie(cookie1))
                .andExpect(status().isUnauthorized());

        // cookie2 is now revoked on unversioned route as well -> 401
        mockMvc.perform(post("/api/auth/refresh")
                        .header("X-Forwarded-For", "192.168.16.3")
                        .cookie(cookie2))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // SCENARIO 6: ADVERSARIAL EDGE CASES (EMPTY, MALFORMED, NULL, EXPIRED)
    // =========================================================================

    @Test
    @DisplayName("SCENARIO 6: Adversarial edge cases: empty JSON body, missing fields, and SQL injection strings return 401")
    void testAdversarialEdgeCases() throws Exception {
        // Empty body {}
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.17.1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        // Body with empty refreshToken {"refreshToken": ""}
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.17.2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"\"}"))
                .andExpect(status().isUnauthorized());

        // Body with whitespace refreshToken {"refreshToken": "   "}
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.17.3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"   \"}"))
                .andExpect(status().isUnauthorized());

        // SQL injection probe in refreshToken
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", "192.168.17.4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"' OR '1'='1\"}"))
                .andExpect(status().isUnauthorized());
    }
}
