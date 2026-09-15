package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.tanda.dto.auth.GoogleAuthRequestDto;
import com.tanda.entity.User;
import com.tanda.repository.UserRepository;
import com.tanda.service.GoogleTokenVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GoogleAuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private GoogleTokenVerifier googleTokenVerifier;

    @BeforeEach
    void setUp() {
        userRepository.findByEmail("azamat@gmail.com").ifPresent(userRepository::delete);
        userRepository.findByEmail("reader@tanda.kz").ifPresent(userRepository::delete);
        userRepository.findByEmail("blocked@tanda.kz").ifPresent(userRepository::delete);
        userRepository.findByEmail("victim@tanda.kz").ifPresent(userRepository::delete);
    }

    private GoogleIdToken.Payload createMockPayload(String sub, String email, boolean emailVerified, String name, String picture) {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject(sub);
        payload.setEmail(email);
        payload.setEmailVerified(emailVerified);
        payload.set("name", name);
        payload.set("picture", picture);
        return payload;
    }

    @Test
    @DisplayName("Should successfully auto-register new user via Google Sign-In and return JWT")
    void shouldRegisterNewUserWithGoogleTokenSuccessfully() throws Exception {
        String token = "valid-google-jwt-token-new-user";
        GoogleIdToken.Payload payload = createMockPayload(
                "google-sub-1001",
                "azamat@gmail.com",
                true,
                "Azamat Serik",
                "https://lh3.googleusercontent.com/a/avatar123"
        );
        when(googleTokenVerifier.verify(eq(token))).thenReturn(payload);

        GoogleAuthRequestDto request = GoogleAuthRequestDto.builder()
                .credential(token)
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.user.email", is("azamat@gmail.com")))
                .andExpect(jsonPath("$.user.name", is("Azamat Serik")))
                .andExpect(jsonPath("$.user.role", is("client")))
                .andExpect(jsonPath("$.user.avatarUrl", is("https://lh3.googleusercontent.com/a/avatar123")))
                .andExpect(jsonPath("$.user.authProvider", is("GOOGLE")))
                .andExpect(jsonPath("$.user.hasPassword", is(false)));

        // Verify in database
        Optional<User> userOpt = userRepository.findByEmail("azamat@gmail.com");
        assertTrue(userOpt.isPresent());
        User user = userOpt.get();
        assertEquals("google-sub-1001", user.getGoogleId());
        assertEquals("client", user.getRole());
        assertEquals("GOOGLE", user.getAuthProvider());
        assertNull(user.getPasswordHash());
        assertTrue(user.getIsActive());
    }

    @Test
    @DisplayName("Should link Google account to existing user with identical email without password duplication")
    void shouldLinkExistingUserWithSameEmailOnGoogleLogin() throws Exception {
        userRepository.findByEmail("existing.user@tanda.kz").ifPresent(userRepository::delete);

        // Pre-create local user
        User existingUser = User.builder()
                .id("user-test-link-101")
                .idNumber("999 101")
                .name("Existing Reader")
                .email("existing.user@tanda.kz")
                .passwordHash("$2a$10$abcdefghijklmnopqrstuvwxyz123456")
                .role("client")
                .authProvider("LOCAL")
                .isActive(true)
                .build();
        userRepository.save(existingUser);

        String token = "valid-google-token-existing";
        GoogleIdToken.Payload payload = createMockPayload(
                "google-sub-existing-2002",
                "existing.user@tanda.kz",
                true,
                "Existing Reader Google",
                "https://lh3.googleusercontent.com/a/reader-avatar"
        );
        when(googleTokenVerifier.verify(eq(token))).thenReturn(payload);

        GoogleAuthRequestDto request = GoogleAuthRequestDto.builder()
                .credential(token)
                .build();

        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.user.email", is("existing.user@tanda.kz")))
                .andExpect(jsonPath("$.user.hasPassword", is(true)))
                .andExpect(jsonPath("$.user.avatarUrl", is("https://lh3.googleusercontent.com/a/reader-avatar")));

        User updatedUser = userRepository.findByEmail("existing.user@tanda.kz").orElseThrow();
        assertEquals("google-sub-existing-2002", updatedUser.getGoogleId());
        assertNotNull(updatedUser.getPasswordHash()); // Local password preserved
    }

    @Test
    @DisplayName("Should reject Google authentication if user account is deactivated (isActive = false)")
    void shouldRejectGoogleLoginForDeactivatedUser() throws Exception {
        User deactivatedUser = User.builder()
                .id("user-deactivated-1")
                .idNumber("001 999")
                .name("Deactivated User")
                .email("blocked@tanda.kz")
                .googleId("google-sub-blocked")
                .role("client")
                .isActive(false)
                .build();
        userRepository.save(deactivatedUser);

        String token = "valid-token-blocked-user";
        GoogleIdToken.Payload payload = createMockPayload(
                "google-sub-blocked",
                "blocked@tanda.kz",
                true,
                "Deactivated User",
                null
        );
        when(googleTokenVerifier.verify(eq(token))).thenReturn(payload);

        GoogleAuthRequestDto request = GoogleAuthRequestDto.builder()
                .credential(token)
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should reject Google login if Google email is not verified (Account Hijacking prevention)")
    void shouldRejectGoogleLoginWhenEmailNotVerified() throws Exception {
        String token = "unverified-google-token";
        GoogleIdToken.Payload payload = createMockPayload(
                "google-sub-unverified",
                "victim@tanda.kz",
                false, // email_verified = false
                "Attacker",
                null
        );
        when(googleTokenVerifier.verify(eq(token))).thenReturn(payload);

        GoogleAuthRequestDto request = GoogleAuthRequestDto.builder()
                .credential(token)
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should reject Google login when token is invalid or tampered")
    void shouldRejectGoogleLoginWithInvalidToken() throws Exception {
        String invalidToken = "tampered-or-expired-token";
        when(googleTokenVerifier.verify(eq(invalidToken)))
                .thenThrow(new BadCredentialsException("Жарамсыз немесе мерзімі өтіп кеткен Google токені"));

        GoogleAuthRequestDto request = GoogleAuthRequestDto.builder()
                .credential(invalidToken)
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
