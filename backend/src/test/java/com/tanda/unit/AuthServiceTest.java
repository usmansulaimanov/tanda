package com.tanda.unit;

import com.tanda.config.JwtProperties;
import com.tanda.dto.auth.AuthResponseDto;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.dto.auth.RegisterRequestDto;
import com.tanda.entity.User;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import com.tanda.service.AuthService;
import com.tanda.service.GoogleTokenVerifier;
import com.tanda.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthService using Mockito — no Spring context.
 * Tests login, register, and edge cases without DB or network calls.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private GoogleTokenVerifier googleTokenVerifier;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private com.tanda.service.EmailVerificationService emailVerificationService;

    @Mock
    private com.tanda.service.ReservedUsernameService reservedUsernameService;

    @Mock
    private com.tanda.repository.ManagerPermissionRepository managerPermissionRepository;

    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider jwtTokenProvider;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(4); // low cost for fast tests
        JwtProperties props = new JwtProperties();
        props.setSecret("unit-test-auth-service-secret-key-256-bits!!");
        props.setExpiration(3600000L);
        jwtTokenProvider = new JwtTokenProvider(props);
        jwtTokenProvider.init();

        authService = new AuthService(
                userRepository,
                passwordEncoder,
                jwtTokenProvider,
                refreshTokenService,
                googleTokenVerifier,
                emailVerificationService,
                reservedUsernameService,
                managerPermissionRepository
        );
    }

    // ============================
    //  login() tests
    // ============================

    @Test
    @DisplayName("login() succeeds with correct email and password")
    void loginSucceedsWithCorrectCredentials() {
        String rawPassword = "securePass123";
        User user = User.builder()
                .id("user-001")
                .email("alice@tanda.kz")
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role("client")
                .isActive(true)
                .idNumber("001 001")
                .name("Alice")
                .build();

        when(userRepository.findByEmail("alice@tanda.kz")).thenReturn(Optional.of(user));

        AuthResponseDto result = authService.login(LoginRequestDto.builder()
                .email("alice@tanda.kz")
                .password(rawPassword)
                .build());

        assertNotNull(result.getToken());
        assertEquals("alice@tanda.kz", result.getUser().getEmail());
    }

    @Test
    @DisplayName("login() throws BadCredentialsException when password is wrong")
    void loginThrowsOnWrongPassword() {
        User user = User.builder()
                .id("user-002")
                .email("bob@tanda.kz")
                .passwordHash(passwordEncoder.encode("correct-password"))
                .role("client")
                .isActive(true)
                .idNumber("001 002")
                .name("Bob")
                .build();

        when(userRepository.findByEmail("bob@tanda.kz")).thenReturn(Optional.of(user));

        assertThrows(BadCredentialsException.class, () ->
                authService.login(LoginRequestDto.builder()
                        .email("bob@tanda.kz")
                        .password("wrong-password")
                        .build())
        );
    }

    @Test
    @DisplayName("login() throws BadCredentialsException when user not found")
    void loginThrowsWhenUserNotFound() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () ->
                authService.login(LoginRequestDto.builder()
                        .email("ghost@tanda.kz")
                        .password("password")
                        .build())
        );
    }

    @Test
    @DisplayName("login() throws BadCredentialsException when account is deactivated")
    void loginThrowsWhenAccountDeactivated() {
        User user = User.builder()
                .id("user-003")
                .email("inactive@tanda.kz")
                .passwordHash(passwordEncoder.encode("pass123"))
                .role("client")
                .isActive(false) // DEACTIVATED
                .idNumber("001 003")
                .name("Inactive User")
                .build();

        when(userRepository.findByEmail("inactive@tanda.kz")).thenReturn(Optional.of(user));

        assertThrows(BadCredentialsException.class, () ->
                authService.login(LoginRequestDto.builder()
                        .email("inactive@tanda.kz")
                        .password("pass123")
                        .build())
        );
    }

    @Test
    @DisplayName("login() throws BadCredentialsException when user has null passwordHash (Google-only account)")
    void loginThrowsWhenPasswordHashIsNull() {
        User googleOnlyUser = User.builder()
                .id("user-004")
                .email("google-only@tanda.kz")
                .passwordHash(null) // Google-only account has no password
                .googleId("gid-123")
                .authProvider("GOOGLE")
                .role("client")
                .isActive(true)
                .idNumber("001 004")
                .name("Google Only User")
                .build();

        when(userRepository.findByEmail("google-only@tanda.kz")).thenReturn(Optional.of(googleOnlyUser));

        assertThrows(BadCredentialsException.class, () ->
                authService.login(LoginRequestDto.builder()
                        .email("google-only@tanda.kz")
                        .password("any-password")
                        .build())
        );
    }

    // ============================
    //  register() tests
    // ============================

    @Test
    @DisplayName("register() creates new user with role=client and returns token")
    void registerCreatesClientUser() {
        when(userRepository.existsByEmail("newuser@tanda.kz")).thenReturn(false);
        when(userRepository.countByRole("client")).thenReturn(5L);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthResponseDto result = authService.register(RegisterRequestDto.builder()
                .name("New User")
                .email("newuser@tanda.kz")
                .password("password123")
                .build());

        assertNotNull(result.getToken());
        assertEquals("newuser@tanda.kz", result.getUser().getEmail());
        assertEquals("client", result.getUser().getRole());
        assertFalse(result.getUser().getHasPassword() == null || !result.getUser().getHasPassword(),
                "Newly registered user should have hasPassword=true");
    }

    @Test
    @DisplayName("register() throws IllegalArgumentException when email already exists")
    void registerThrowsOnDuplicateEmail() {
        when(userRepository.existsByEmail("duplicate@tanda.kz")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () ->
                authService.register(RegisterRequestDto.builder()
                        .name("Dup")
                        .email("duplicate@tanda.kz")
                        .password("pass")
                        .build())
        );

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("register() trims and lowercases email before saving")
    void registerNormalizesEmail() {
        when(userRepository.existsByEmail("trim@tanda.kz")).thenReturn(false);
        when(userRepository.countByRole("client")).thenReturn(0L);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthResponseDto result = authService.register(RegisterRequestDto.builder()
                .name("Trim Test")
                .email("  TRIM@tanda.kz  ")
                .password("password")
                .build());

        assertEquals("trim@tanda.kz", result.getUser().getEmail());
    }
}
