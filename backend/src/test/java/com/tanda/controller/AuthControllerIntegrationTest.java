package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.tanda.dto.auth.GoogleAuthRequestDto;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.dto.auth.RegisterRequestDto;
import com.tanda.entity.User;
import com.tanda.repository.RefreshTokenRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.GoogleTokenVerifier;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

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

    @MockBean
    private GoogleTokenVerifier googleTokenVerifier;

    @BeforeEach
    void setUp() {
        User admin = userRepository.findByEmail("admin@tanda.kz").orElse(null);
        if (admin != null) {
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setIsActive(true);
            admin.setRole("admin");
            userRepository.save(admin);
        } else {
            admin = User.builder()
                    .id("admin-1")
                    .idNumber("000 001")
                    .name("Администратор")
                    .email("admin@tanda.kz")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role("admin")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            userRepository.save(admin);
        }
    }

    // =========================================================================
    // 1. Core Auth Endpoint Tests (Prefix Parity & User Creation)
    // =========================================================================

    @Test
    @DisplayName("POST /api/v1/auth/register creates new user and returns token and user info")
    void testRegisterV1Success() throws Exception {
        String email = "testuser_v1_" + UUID.randomUUID().toString().substring(0, 8) + "@tanda.kz";
        RegisterRequestDto request = RegisterRequestDto.builder()
                .name("Тест Қолданушы V1")
                .email(email)
                .password("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.user.email", is(email)))
                .andExpect(jsonPath("$.user.role", is("client")))
                .andExpect(jsonPath("$.user.idNumber", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/auth/register (unversioned) creates new user and returns token")
    void testRegisterUnversionedSuccess() throws Exception {
        String email = "testuser_unv_" + UUID.randomUUID().toString().substring(0, 8) + "@tanda.kz";
        RegisterRequestDto request = RegisterRequestDto.builder()
                .name("Тест Қолданушы Unversioned")
                .email(email)
                .password("password123")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.user.email", is(email)))
                .andExpect(jsonPath("$.user.role", is("client")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login logs in admin and allows accessing /api/v1/auth/me")
    void testLoginV1AdminAndMeSuccess() throws Exception {
        LoginRequestDto request = LoginRequestDto.builder()
                .email("admin@tanda.kz")
                .password("admin123")
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.user.email", is("admin@tanda.kz")))
                .andExpect(jsonPath("$.user.role", is("admin")))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        String token = objectMapper.readTree(responseBody).path("token").asText();

        // Verify GET /api/v1/auth/me with Bearer token
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("admin@tanda.kz")))
                .andExpect(jsonPath("$.role", is("admin")));

        // Verify GET /api/auth/me (unversioned parity) with Bearer token
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("admin@tanda.kz")))
                .andExpect(jsonPath("$.role", is("admin")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with wrong password returns 401 Unauthorized")
    void testLoginWrongPasswordReturns401() throws Exception {
        LoginRequestDto request = LoginRequestDto.builder()
                .email("admin@tanda.kz")
                .password("wrongpassword")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // 2. Set-Cookie Verification: Max-Age=2592000, HttpOnly, SameSite=Lax, Path=/
    // =========================================================================

    @Test
    @DisplayName("POST /api/v1/auth/login sets Set-Cookie with Max-Age=2592000, HttpOnly, SameSite=Lax, Path=/")
    void testLoginSetsExpectedCookieAttributes() throws Exception {
        LoginRequestDto request = LoginRequestDto.builder()
                .email("admin@tanda.kz")
                .password("admin123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")))
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_COOKIE_NAME, true))
                .andExpect(cookie().path(AuthController.REFRESH_COOKIE_NAME, "/"))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 2592000));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register sets Set-Cookie with Max-Age=2592000, HttpOnly, SameSite=Lax, Path=/")
    void testRegisterSetsExpectedCookieAttributes() throws Exception {
        String email = "cookie_reg_" + UUID.randomUUID().toString().substring(0, 8) + "@tanda.kz";
        RegisterRequestDto request = RegisterRequestDto.builder()
                .name("Cookie Test User")
                .email(email)
                .password("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")))
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_COOKIE_NAME, true))
                .andExpect(cookie().path(AuthController.REFRESH_COOKIE_NAME, "/"))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 2592000));
    }

    @Test
    @DisplayName("POST /api/v1/auth/google sets Set-Cookie with Max-Age=2592000, HttpOnly, SameSite=Lax, Path=/")
    void testGoogleLoginSetsExpectedCookieAttributes() throws Exception {
        String googleToken = "mock-google-token-" + UUID.randomUUID();
        String googleEmail = "google_user_" + UUID.randomUUID().toString().substring(0, 8) + "@gmail.com";

        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject("google-sub-" + UUID.randomUUID().toString().substring(0, 8));
        payload.setEmail(googleEmail);
        payload.setEmailVerified(true);
        payload.set("name", "Google User");
        payload.set("picture", "https://example.com/photo.jpg");

        when(googleTokenVerifier.verify(eq(googleToken))).thenReturn(payload);

        GoogleAuthRequestDto request = GoogleAuthRequestDto.builder()
                .credential(googleToken)
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")))
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_COOKIE_NAME, true))
                .andExpect(cookie().path(AuthController.REFRESH_COOKIE_NAME, "/"))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 2592000));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh sets Set-Cookie with Max-Age=2592000, HttpOnly, SameSite=Lax, Path=/")
    void testRefreshSetsExpectedCookieAttributes() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email("admin@tanda.kz")
                .password("admin123")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie loginCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(loginCookie))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=2592000")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/")))
                .andExpect(cookie().exists(AuthController.REFRESH_COOKIE_NAME))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_COOKIE_NAME, true))
                .andExpect(cookie().path(AuthController.REFRESH_COOKIE_NAME, "/"))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 2592000));
    }

    @Test
    @DisplayName("POST /api/v1/auth/logout sets Set-Cookie with Max-Age=0 and clears the cookie")
    void testLogoutSetsMaxAgeZeroAndClearsCookie() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email("admin@tanda.kz")
                .password("admin123")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie loginCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_COOKIE_NAME);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(loginCookie))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(cookie().maxAge(AuthController.REFRESH_COOKIE_NAME, 0));
    }

    @Test
    @DisplayName("PATCH /api/v1/auth/profile successfully updates user profile")
    void testUpdateProfileSuccess() throws Exception {
        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email("admin@tanda.kz")
                .password("admin123")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .get("token").asText();

        com.tanda.dto.auth.UpdateProfileRequestDto updateDto = com.tanda.dto.auth.UpdateProfileRequestDto.builder()
                .name("Жаңартылған Әкімші")
                .avatarUrl("https://example.com/avatar.jpg")
                .build();

        mockMvc.perform(patch("/api/v1/auth/profile")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Жаңартылған Әкімші")))
                .andExpect(jsonPath("$.avatarUrl", is("https://example.com/avatar.jpg")));
    }

    @Test
    @DisplayName("PUT /api/v1/auth/password changes password and rejects invalid current password")
    void testChangePasswordFlow() throws Exception {
        // Create dedicated user for password change test
        String email = "pwdtest_" + UUID.randomUUID() + "@tanda.kz";
        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .name("Password Tester")
                .email(email)
                .passwordHash(passwordEncoder.encode("oldpass123"))
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build();
        userRepository.save(user);

        LoginRequestDto loginDto = LoginRequestDto.builder()
                .email(email)
                .password("oldpass123")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .get("token").asText();

        // 1. Attempt with wrong current password -> 400 Bad Request
        com.tanda.dto.auth.ChangePasswordRequestDto wrongDto = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .currentPassword("wrongpass")
                .newPassword("NewPass123")
                .build();

        mockMvc.perform(put("/api/v1/auth/password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongDto)))
                .andExpect(status().isBadRequest());

        // 1b. Attempt with weak new password (no uppercase, no digits) -> 400 Bad Request
        com.tanda.dto.auth.ChangePasswordRequestDto weakDto = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .currentPassword("oldpass123")
                .newPassword("weakpassword")
                .build();

        mockMvc.perform(put("/api/v1/auth/password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(weakDto)))
                .andExpect(status().isBadRequest());

        // 2. Valid change -> 200 OK
        com.tanda.dto.auth.ChangePasswordRequestDto validDto = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .currentPassword("oldpass123")
                .newPassword("NewPass123")
                .build();

        mockMvc.perform(put("/api/v1/auth/password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validDto)))
                .andExpect(status().isOk());

        // 3. Login with new password succeeds
        LoginRequestDto newLoginDto = LoginRequestDto.builder()
                .email(email)
                .password("NewPass123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLoginDto)))
                .andExpect(status().isOk());
    }
}
