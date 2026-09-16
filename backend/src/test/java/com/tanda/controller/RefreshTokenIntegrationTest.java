package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.entity.RefreshToken;
import com.tanda.entity.User;
import com.tanda.repository.RefreshTokenRepository;
import com.tanda.repository.UserRepository;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class RefreshTokenIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String TEST_EMAIL = "ctrl.refresh.user@tanda.kz";
    private static final String TEST_PASSWORD = "password123";
    private User testUser;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        userRepository.findByEmail(TEST_EMAIL).ifPresent(userRepository::delete);

        testUser = User.builder()
                .id("test-refresh-ctrl-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber("888 001")
                .name("Controller Refresh Test User")
                .email(TEST_EMAIL)
                .passwordHash(passwordEncoder.encode(TEST_PASSWORD))
                .authProvider("LOCAL")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build();
        testUser = userRepository.save(testUser);
    }

    @Test
    @DisplayName("Login issues access token in body and refresh token in HttpOnly cookie with 30-day Max-Age")
    void login_issuesRefreshTokenCookie() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_COOKIE_NAME, true))
                .andExpect(cookie().path(AuthController.REFRESH_COOKIE_NAME, "/"))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 2592000));
    }

    @Test
    @DisplayName("Token rotation succeeds and invalidates previous token")
    void refresh_tokenRotation_worksAndInvalidatesPreviousToken() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie1 = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(refreshCookie1).isNotNull();

        // Refresh with cookie1 -> succeeds and issues cookie2
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andReturn();

        Cookie refreshCookie2 = refreshResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(refreshCookie2).isNotNull();
        assertThat(refreshCookie2.getValue()).isNotEqualTo(refreshCookie1.getValue());

        // Reuse detection: replay cookie1 -> 401 Unauthorized
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie1))
                .andExpect(status().isUnauthorized());

        // cookie2 is now also revoked due to reuse detection
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie2))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Multi-session concurrent session revocation: Device A & B login, Device A rotates, old token replayed, both Device A and B sessions revoked")
    void refresh_multiSessionConcurrentSessionRevocation() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .build();

        // 1. Device A logs in
        MvcResult deviceALogin = mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.USER_AGENT, "Device-A-Browser/1.0")
                        .header("X-Forwarded-For", "192.168.1.10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookieDeviceA1 = deviceALogin.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(cookieDeviceA1).isNotNull();

        // 2. Device B logs in
        MvcResult deviceBLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.USER_AGENT, "Device-B-Mobile/2.0")
                        .header("X-Forwarded-For", "192.168.1.20")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookieDeviceB1 = deviceBLogin.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(cookieDeviceB1).isNotNull();

        // Verify repository has 2 active tokens for this user
        List<RefreshToken> activeTokensBefore = refreshTokenRepository.findAllByUserIdAndRevokedFalse(testUser.getId());
        assertThat(activeTokensBefore).hasSize(2);

        // 3. Device A rotates its token -> gets cookieDeviceA2
        MvcResult deviceARefresh = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.USER_AGENT, "Device-A-Browser/1.0")
                        .cookie(cookieDeviceA1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        Cookie cookieDeviceA2 = deviceARefresh.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(cookieDeviceA2).isNotNull();
        assertThat(cookieDeviceA2.getValue()).isNotEqualTo(cookieDeviceA1.getValue());

        // Verify Device B's token is still active at this point
        List<RefreshToken> activeTokensMid = refreshTokenRepository.findAllByUserIdAndRevokedFalse(testUser.getId());
        assertThat(activeTokensMid).hasSize(2); // cookieDeviceA2 and cookieDeviceB1

        // 4. Adversary replays old revoked token from Device A (cookieDeviceA1)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.USER_AGENT, "Device-A-Browser/1.0")
                        .cookie(cookieDeviceA1))
                .andExpect(status().isUnauthorized());

        // 5. Assert that ALL sessions for this user (Device A and Device B) are now revoked in repository!
        List<RefreshToken> activeTokensAfterAttack = refreshTokenRepository.findAllByUserIdAndRevokedFalse(testUser.getId());
        assertThat(activeTokensAfterAttack)
                .as("All active sessions across all devices must be revoked upon reuse detection")
                .isEmpty();

        List<RefreshToken> allTokens = refreshTokenRepository.findAll();
        assertThat(allTokens)
                .isNotEmpty()
                .allMatch(RefreshToken::getRevoked);

        // 6. Device A's new token (cookieDeviceA2) is now rejected with 401
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(cookieDeviceA2))
                .andExpect(status().isUnauthorized());

        // 7. Device B's token (cookieDeviceB1) is also rejected with 401
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(cookieDeviceB1))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Request body refresh fallback ({\"refreshToken\": \"...\"}) succeeds when cookie is absent")
    void refresh_requestBodyFallback_worksAndRotatesToken() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie loginCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(loginCookie).isNotNull();
        String rawRefreshToken = loginCookie.getValue();

        // Perform refresh using JSON request body fallback (no cookie sent)
        Map<String, String> bodyMap = Map.of("refreshToken", rawRefreshToken);
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bodyMap)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andReturn();

        Cookie newCookie = refreshResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(newCookie).isNotNull();
        assertThat(newCookie.getValue()).isNotEqualTo(rawRefreshToken);

        // Replaying the old token in body must trigger 401 reuse detection
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bodyMap)))
                .andExpect(status().isUnauthorized());

        // Even the new token should now be revoked
        Map<String, String> newBodyMap = Map.of("refreshToken", newCookie.getValue());
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newBodyMap)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Logout revokes refresh token and clears cookie with Max-Age=0")
    void logout_revokesTokenAndClearsCookie() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 0));

        // Subsequent refresh must fail with 401
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
    }
}
