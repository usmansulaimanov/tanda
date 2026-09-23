package com.tanda.unit;

import com.tanda.config.JwtProperties;
import com.tanda.entity.User;
import com.tanda.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for JwtTokenProvider.
 * Tests token generation, parsing, validation, and key padding logic.
 * No Spring context required — pure unit tests.
 */
class JwtTokenProviderTest {

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties();
        props.setSecret("unit-test-secret-key-minimum-256-bits-for-hmac-sha256!!");
        props.setExpiration(3600000L); // 1 hour
        provider = new JwtTokenProvider(props);
        provider.init();
    }

    @Test
    @DisplayName("Should generate a non-empty JWT token for a valid user")
    void shouldGenerateTokenForUser() {
        User user = buildTestUser("test@example.com", "user-abc");

        String token = provider.generateToken(user);

        assertNotNull(token);
        assertFalse(token.isBlank());
        // JWT has exactly 3 segments separated by dots
        assertEquals(3, token.split("\\.").length);
    }

    @Test
    @DisplayName("Should extract email correctly from generated token")
    void shouldExtractEmailFromToken() {
        User user = buildTestUser("alice@tanda.kz", "user-123");

        String token = provider.generateToken(user);
        String extractedEmail = provider.getEmailFromToken(token);

        assertEquals("alice@tanda.kz", extractedEmail);
    }

    @Test
    @DisplayName("Should extract userId claim from generated token")
    void shouldExtractUserIdFromToken() {
        User user = buildTestUser("bob@tanda.kz", "user-456");

        String token = provider.generateToken(user);
        String extractedUserId = provider.getUserIdFromToken(token);

        assertEquals("user-456", extractedUserId);
    }

    @Test
    @DisplayName("Should validate a freshly generated token as valid")
    void shouldValidateFreshToken() {
        User user = buildTestUser("carol@tanda.kz", "user-789");

        String token = provider.generateToken(user);

        assertTrue(provider.validateToken(token));
    }

    @Test
    @DisplayName("Should reject a malformed/tampered token as invalid")
    void shouldRejectMalformedToken() {
        assertFalse(provider.validateToken("this.is.not.a.valid.jwt.token"));
    }

    @Test
    @DisplayName("Should reject an empty string as invalid token")
    void shouldRejectEmptyToken() {
        assertFalse(provider.validateToken(""));
    }

    @Test
    @DisplayName("Should handle key shorter than 32 bytes by padding (no exception thrown)")
    void shouldHandleShortKeyByPadding() {
        JwtProperties shortKeyProps = new JwtProperties();
        shortKeyProps.setSecret("short"); // < 32 bytes
        shortKeyProps.setExpiration(3600000L);

        JwtTokenProvider shortProvider = new JwtTokenProvider(shortKeyProps);
        assertDoesNotThrow(shortProvider::init, "Short key should be padded, not throw an exception");

        // Should still be able to generate and validate tokens
        User user = buildTestUser("test@padded.kz", "user-padded");
        String token = shortProvider.generateToken(user);
        assertTrue(shortProvider.validateToken(token));
    }

    @Test
    @DisplayName("Token generated for user1 should not validate with a different secret")
    void shouldRejectTokenFromDifferentSecret() {
        User user = buildTestUser("dave@tanda.kz", "user-000");

        // Provider with different secret
        JwtProperties otherProps = new JwtProperties();
        otherProps.setSecret("completely-different-secret-key-for-another-system-instance");
        otherProps.setExpiration(3600000L);
        JwtTokenProvider otherProvider = new JwtTokenProvider(otherProps);
        otherProvider.init();

        String tokenFromOther = otherProvider.generateToken(user);

        // Our original provider should reject a token signed with a different key
        assertFalse(provider.validateToken(tokenFromOther));
    }

    private User buildTestUser(String email, String id) {
        return User.builder()
                .id(id)
                .idNumber("0000 0001")
                .name("Test User")
                .email(email)
                .role("client")
                .isActive(true)
                .build();
    }
}
