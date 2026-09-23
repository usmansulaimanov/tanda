package com.tanda.security;

import com.tanda.config.JwtProperties;
import com.tanda.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit and security tests for JwtTokenProvider.
 * Verifies 15-minute expiration period, expired token handling,
 * key padding, claim extraction, and signature validation.
 */
class JwtTokenProviderTest {

    private JwtProperties jwtProperties;
    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        jwtProperties = new JwtProperties();
        jwtProperties.setSecret("unit-test-secret-key-minimum-256-bits-for-hmac-sha256!!");
        // Default in JwtProperties is 900,000 ms (15 minutes)
        provider = new JwtTokenProvider(jwtProperties);
        provider.init();
    }

    @Test
    @DisplayName("Default JWT expiration in JwtProperties must be exactly 15 minutes (900,000 ms)")
    void testDefaultExpirationIs15Minutes() {
        JwtProperties props = new JwtProperties();
        assertEquals(900000L, props.getExpiration(), "Default expiration must be 900,000 ms (15 minutes)");
    }

    @Test
    @DisplayName("Generated token validity period is exactly 15 minutes (900,000 ms) within 5-second tolerance")
    void testGeneratedTokenValidityPeriodIs15Minutes() {
        User user = buildTestUser("test@tanda.kz", "user-123");
        long beforeTime = System.currentTimeMillis();
        String token = provider.generateToken(user);
        long afterTime = System.currentTimeMillis();

        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        Claims claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(keyBytes))
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Date issuedAt = claims.getIssuedAt();
        Date expiration = claims.getExpiration();

        assertNotNull(issuedAt, "IssuedAt claim must not be null");
        assertNotNull(expiration, "Expiration claim must not be null");

        long validityMs = expiration.getTime() - issuedAt.getTime();
        assertEquals(900000L, validityMs, "Token validity duration must be exactly 900,000 ms (15 minutes)");

        long expectedMinExpiry = beforeTime + 900000L - 5000L;
        long expectedMaxExpiry = afterTime + 900000L + 5000L;
        assertTrue(expiration.getTime() >= expectedMinExpiry && expiration.getTime() <= expectedMaxExpiry,
                "Token expiration timestamp must be within 5-second tolerance of now + 15 minutes");
    }

    @Test
    @DisplayName("Expired token is rejected by validateToken and throws ExpiredJwtException on claim extraction")
    void testExpiredTokenRejected() {
        JwtProperties expiredProps = new JwtProperties();
        expiredProps.setSecret("unit-test-secret-key-minimum-256-bits-for-hmac-sha256!!");
        expiredProps.setExpiration(-10000L); // Expired 10 seconds in the past
        JwtTokenProvider expiredProvider = new JwtTokenProvider(expiredProps);
        expiredProvider.init();

        User user = buildTestUser("expired@tanda.kz", "user-expired");
        String expiredToken = expiredProvider.generateToken(user);

        // 1. validateToken must return false
        assertFalse(expiredProvider.validateToken(expiredToken),
                "validateToken must return false for an expired token");

        // 2. Extracting claims must throw ExpiredJwtException
        assertThrows(ExpiredJwtException.class, () -> expiredProvider.getEmailFromToken(expiredToken),
                "getEmailFromToken on expired token must throw ExpiredJwtException");
        assertThrows(ExpiredJwtException.class, () -> expiredProvider.getUserIdFromToken(expiredToken),
                "getUserIdFromToken on expired token must throw ExpiredJwtException");
    }

    @Test
    @DisplayName("Should generate a valid 3-segment JWT token for a user")
    void shouldGenerateTokenForUser() {
        User user = buildTestUser("user@tanda.kz", "user-abc");
        String token = provider.generateToken(user);

        assertNotNull(token);
        assertFalse(token.isBlank());
        assertEquals(3, token.split("\\.").length, "JWT must consist of 3 dot-separated segments");
    }

    @Test
    @DisplayName("Should extract email and userId correctly from token")
    void shouldExtractClaimsCorrectly() {
        User user = buildTestUser("alice@tanda.kz", "user-789");
        String token = provider.generateToken(user);

        assertEquals("alice@tanda.kz", provider.getEmailFromToken(token));
        assertEquals("user-789", provider.getUserIdFromToken(token));
    }

    @Test
    @DisplayName("Should validate freshly generated token as valid")
    void shouldValidateFreshToken() {
        User user = buildTestUser("bob@tanda.kz", "user-456");
        String token = provider.generateToken(user);

        assertTrue(provider.validateToken(token));
    }

    @Test
    @DisplayName("Should reject malformed or empty tokens")
    void shouldRejectMalformedOrEmptyTokens() {
        assertFalse(provider.validateToken("invalid.token.structure"));
        assertFalse(provider.validateToken(""));
        assertFalse(provider.validateToken(null));
    }

    @Test
    @DisplayName("Should handle short secret keys by zero-padding to 32 bytes without throwing")
    void shouldHandleShortSecretKey() {
        JwtProperties shortProps = new JwtProperties();
        shortProps.setSecret("short-key");
        shortProps.setExpiration(900000L);

        JwtTokenProvider shortProvider = new JwtTokenProvider(shortProps);
        assertDoesNotThrow(shortProvider::init);

        User user = buildTestUser("padded@tanda.kz", "user-padded");
        String token = shortProvider.generateToken(user);
        assertTrue(shortProvider.validateToken(token));
    }

    @Test
    @DisplayName("Should reject token signed with different secret")
    void shouldRejectTokenFromDifferentSecret() {
        User user = buildTestUser("dave@tanda.kz", "user-000");

        JwtProperties otherProps = new JwtProperties();
        otherProps.setSecret("different-secret-key-minimum-256-bits-for-hmac-sha256!!!");
        otherProps.setExpiration(900000L);
        JwtTokenProvider otherProvider = new JwtTokenProvider(otherProps);
        otherProvider.init();

        String tokenFromOther = otherProvider.generateToken(user);
        assertFalse(provider.validateToken(tokenFromOther),
                "Provider must reject a token signed with a different secret");
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
