package com.tanda.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.controller.AuthController;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "app.auth.rotation-grace-period-seconds=60"
})
public class RefreshTokenGracePeriodTest {

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

    private static final String TEST_EMAIL = "grace_period_test@tanda.kz";
    private static final String TEST_PASSWORD = "Password123!";
    private User testUser;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        userRepository.findByEmail(TEST_EMAIL).ifPresent(userRepository::delete);

        testUser = User.builder()
                .id("grace-user-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber("801 001")
                .name("Grace Tester")
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
    @DisplayName("Parallel tab rotation race within grace period resolves seamlessly (200 OK) instead of terminating session")
    void testConcurrentRotationRaceWithinGracePeriodSucceedsSeamlessly() throws Exception {
        // Step 1: User logs in
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 Chrome/120")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie originalCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(originalCookie).isNotNull();

        // Step 2: Tab 1 rotates token -> gets new cookie
        MvcResult tab1Result = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 Chrome/120")
                        .cookie(originalCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();

        Cookie rotatedCookie = tab1Result.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);
        assertThat(rotatedCookie).isNotNull();
        assertThat(rotatedCookie.getValue()).isNotEqualTo(originalCookie.getValue());

        // Step 3: Tab 2 (arriving concurrently with the old originalCookie within 60s grace period)
        // Must succeed with 200 OK, issuing a fresh access token seamlessly without revoking sessions!
        MvcResult tab2Result = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 Chrome/120")
                        .cookie(originalCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(TEST_EMAIL))
                .andReturn();

        // Step 4: Verify that user Alpha still has active unrevoked sessions (session was NOT destroyed)
        List<RefreshToken> activeTokens = refreshTokenRepository.findAllByUserIdAndRevokedFalse(testUser.getId());
        assertThat(activeTokens)
                .as("User must still have valid active session after parallel tab rotation")
                .isNotEmpty();
    }
}
