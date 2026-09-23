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
    private com.tanda.service.MessageService messageService;

    @Mock
    private com.tanda.repository.ManagerPermissionRepository managerPermissionRepository;

    @Mock
    private com.tanda.repository.PremiumEntitlementRepository premiumEntitlementRepository;

    @Mock
    private com.tanda.repository.BirthdayGiftRepository birthdayGiftRepository;

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
                messageService,
                managerPermissionRepository,
                premiumEntitlementRepository,
                birthdayGiftRepository
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

    // ============================
    //  updateProfile() & getMe() tests
    // ============================

    @Test
    @DisplayName("updateProfile() successfully updates email and returns new token")
    void updateProfileUpdatesEmailAndReturnsToken() {
        User existingUser = User.builder()
                .id("user-123")
                .idNumber("1001")
                .email("old@tanda.kz")
                .name("Old Name")
                .role("admin")
                .isActive(true)
                .build();

        when(userRepository.findById("user-123")).thenReturn(Optional.of(existingUser));
        when(userRepository.existsByEmail("new@tanda.kz")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        com.tanda.dto.auth.UpdateProfileRequestDto request = com.tanda.dto.auth.UpdateProfileRequestDto.builder()
                .name("New Name")
                .email("new@tanda.kz")
                .build();

        com.tanda.dto.user.UserResponseDto result = authService.updateProfile("user-123", request);

        assertNotNull(result);
        assertEquals("new@tanda.kz", result.getEmail());
        assertEquals("New Name", result.getName());
        assertNotNull(result.getToken(), "Should return refreshed token with new email");
        assertEquals("new@tanda.kz", jwtTokenProvider.getEmailFromToken(result.getToken()));
        assertEquals("user-123", jwtTokenProvider.getUserIdFromToken(result.getToken()));
    }

    @Test
    @DisplayName("updateProfile() throws BadRequestException if new email is taken")
    void updateProfileThrowsIfEmailAlreadyTaken() {
        User existingUser = User.builder()
                .id("user-123")
                .email("old@tanda.kz")
                .role("client")
                .build();

        when(userRepository.findById("user-123")).thenReturn(Optional.of(existingUser));
        when(userRepository.existsByEmail("taken@tanda.kz")).thenReturn(true);

        com.tanda.dto.auth.UpdateProfileRequestDto request = com.tanda.dto.auth.UpdateProfileRequestDto.builder()
                .email("taken@tanda.kz")
                .build();

        assertThrows(com.tanda.exception.BadRequestException.class, () ->
                authService.updateProfile("user-123", request)
        );
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("getMe() retrieves user by user ID")
    void getMeRetrievesUserById() {
        User user = User.builder()
                .id("user-456")
                .email("reader@tanda.kz")
                .name("Reader")
                .role("client")
                .build();

        when(userRepository.findById("user-456")).thenReturn(Optional.of(user));

        com.tanda.dto.user.UserResponseDto result = authService.getMe("user-456");
        assertNotNull(result);
        assertEquals("reader@tanda.kz", result.getEmail());
        assertEquals("user-456", result.getId());
    }

    @Test
    @DisplayName("updateProfile() throws BadRequestException if Google account tries to change email")
    void updateProfileThrowsIfGoogleAccountChangesEmail() {
        User googleUser = User.builder()
                .id("google-user-1")
                .email("original@gmail.com")
                .authProvider("GOOGLE")
                .role("client")
                .build();

        when(userRepository.findById("google-user-1")).thenReturn(Optional.of(googleUser));

        com.tanda.dto.auth.UpdateProfileRequestDto request = com.tanda.dto.auth.UpdateProfileRequestDto.builder()
                .email("fake@mail.kz")
                .build();

        com.tanda.exception.BadRequestException ex = assertThrows(com.tanda.exception.BadRequestException.class, () ->
                authService.updateProfile("google-user-1", request)
        );
        assertTrue(ex.getMessage().contains("Google арқылы тіркелген"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("changePassword() allows Google user without password to set initial password directly")
    void changePasswordAllowsInitialPasswordSetup() {
        User googleUser = User.builder()
                .id("google-user-2")
                .email("reader2@gmail.com")
                .authProvider("GOOGLE")
                .passwordHash(null) // no initial password
                .build();

        when(userRepository.findById("google-user-2")).thenReturn(Optional.of(googleUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        com.tanda.dto.auth.ChangePasswordRequestDto request = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .currentPassword(null)
                .newPassword("myNewSecurePass123")
                .build();

        assertDoesNotThrow(() -> authService.changePassword("google-user-2", request));
        verify(userRepository).save(googleUser);
        assertNotNull(googleUser.getPasswordHash());
        assertTrue(passwordEncoder.matches("myNewSecurePass123", googleUser.getPasswordHash()));
    }

    @Test
    @DisplayName("changePassword() requires valid current password if password is already set")
    void changePasswordRequiresValidCurrentPassword() {
        User user = User.builder()
                .id("user-with-pass")
                .email("user@tanda.kz")
                .passwordHash(passwordEncoder.encode("existingPass123"))
                .build();

        when(userRepository.findById("user-with-pass")).thenReturn(Optional.of(user));

        com.tanda.dto.auth.ChangePasswordRequestDto badRequest = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .currentPassword("wrongPass")
                .newPassword("brandNewPass123")
                .build();

        assertThrows(com.tanda.exception.BadRequestException.class, () ->
                authService.changePassword("user-with-pass", badRequest)
        );
    }

    @Test
    @DisplayName("changePassword() rejects passwords violating complexity rules (length, uppercase, lowercase, digit, non-ASCII)")
    void changePasswordRejectsInvalidComplexity() {
        com.tanda.dto.auth.ChangePasswordRequestDto shortPass = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .newPassword("Short1!")
                .build();
        assertThrows(com.tanda.exception.BadRequestException.class, () ->
                authService.changePassword("any-id", shortPass)
        );

        com.tanda.dto.auth.ChangePasswordRequestDto noUpper = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .newPassword("nouppercase123")
                .build();
        assertThrows(com.tanda.exception.BadRequestException.class, () ->
                authService.changePassword("any-id", noUpper)
        );

        com.tanda.dto.auth.ChangePasswordRequestDto noLower = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .newPassword("NOLOWERCASE123")
                .build();
        assertThrows(com.tanda.exception.BadRequestException.class, () ->
                authService.changePassword("any-id", noLower)
        );

        com.tanda.dto.auth.ChangePasswordRequestDto noDigit = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .newPassword("NoDigitPassword!")
                .build();
        assertThrows(com.tanda.exception.BadRequestException.class, () ->
                authService.changePassword("any-id", noDigit)
        );

        com.tanda.dto.auth.ChangePasswordRequestDto cyrillicPass = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .newPassword("Құпиясөз123A")
                .build();
        assertThrows(com.tanda.exception.BadRequestException.class, () ->
                authService.changePassword("any-id", cyrillicPass)
        );
    }

    @Test
    @DisplayName("changePassword() with valid Google ID token allows resetting password without current password")
    void changePasswordAllowsResetWithGoogleReAuth() {
        User user = User.builder()
                .id("google-user-reauth")
                .email("verified@gmail.com")
                .passwordHash(passwordEncoder.encode("oldForgottenPass"))
                .build();

        when(userRepository.findById("google-user-reauth")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload payload =
                new com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload();
        payload.setEmail("verified@gmail.com");
        payload.setSubject("google-sub-12345");

        when(googleTokenVerifier.verify("valid-google-token")).thenReturn(payload);

        com.tanda.dto.auth.ChangePasswordRequestDto request = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .googleIdToken("valid-google-token")
                .currentPassword(null)
                .newPassword("brandNewPassword999")
                .build();

        assertDoesNotThrow(() -> authService.changePassword("google-user-reauth", request));
        verify(userRepository).save(user);
        assertTrue(passwordEncoder.matches("brandNewPassword999", user.getPasswordHash()));
    }

    @Test
    @DisplayName("changePassword() with mismatched Google ID token throws BadRequestException")
    void changePasswordRejectsMismatchedGoogleToken() {
        User user = User.builder()
                .id("google-user-reauth")
                .email("original@gmail.com")
                .googleId("sub-111")
                .passwordHash(passwordEncoder.encode("oldForgottenPass"))
                .build();

        when(userRepository.findById("google-user-reauth")).thenReturn(Optional.of(user));

        com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload payload =
                new com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload();
        payload.setEmail("someone.else@gmail.com");
        payload.setSubject("sub-999");

        when(googleTokenVerifier.verify("intruder-google-token")).thenReturn(payload);

        com.tanda.dto.auth.ChangePasswordRequestDto request = com.tanda.dto.auth.ChangePasswordRequestDto.builder()
                .googleIdToken("intruder-google-token")
                .currentPassword(null)
                .newPassword("hackerPass123")
                .build();

        assertThrows(com.tanda.exception.BadRequestException.class, () ->
                authService.changePassword("google-user-reauth", request)
        );
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("login() with old admin@tanda.kz rejects and does not overwrite admin's customized email")
    void loginWithOldAdminEmailRejectsAfterEmailUpdate() {
        User updatedAdmin = User.builder()
                .id("admin-1")
                .idNumber("000 001")
                .name("Әкімші")
                .email("usman.custom@gmail.com") // customized email
                .passwordHash(passwordEncoder.encode("admin123"))
                .role("admin")
                .isActive(true)
                .build();

        when(userRepository.findById("admin-1")).thenReturn(Optional.of(updatedAdmin));

        LoginRequestDto oldEmailLogin = LoginRequestDto.builder()
                .email("admin@tanda.kz")
                .password("admin123")
                .build();

        BadCredentialsException ex = assertThrows(BadCredentialsException.class, () ->
                authService.login(oldEmailLogin, "Agent", "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("жаңа поштаңызды енгізіңіз"));
        verify(userRepository, never()).save(any());
        assertEquals("usman.custom@gmail.com", updatedAdmin.getEmail());
    }
}
