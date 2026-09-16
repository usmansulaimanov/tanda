package com.tanda.service;

import com.tanda.entity.RefreshToken;
import com.tanda.entity.User;
import com.tanda.exception.UnauthorizedException;
import com.tanda.repository.RefreshTokenRepository;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final SecureRandom secureRandom = new SecureRandom();

    public static final long REFRESH_TOKEN_DAYS = 30L;

    public record TokenRotationResult(String newAccessToken, String newRawRefreshToken, User user) {}

    @Transactional
    public String createRefreshToken(User user, String userAgent, String ipAddress) {
        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .id("rt-" + UUID.randomUUID().toString().substring(0, 12))
                .userId(user.getId())
                .tokenHash(tokenHash)
                .expiresAt(OffsetDateTime.now().plusDays(REFRESH_TOKEN_DAYS))
                .revoked(false)
                .userAgent(userAgent != null && userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent)
                .ipAddress(ipAddress != null && ipAddress.length() > 45 ? ipAddress.substring(0, 45) : ipAddress)
                .build();

        refreshTokenRepository.save(refreshToken);
        return rawToken;
    }

    @Transactional(noRollbackFor = UnauthorizedException.class)
    public TokenRotationResult rotateRefreshToken(String rawToken, String userAgent, String ipAddress) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new UnauthorizedException("Refresh token is missing");
        }

        String tokenHash = hashToken(rawToken);
        RefreshToken existing = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        // Reuse detection: if token is already revoked, revoke ALL tokens for this user immediately!
        if (Boolean.TRUE.equals(existing.getRevoked())) {
            log.warn("Refresh token reuse detected for userId={}! Revoking all sessions.", existing.getUserId());
            var activeTokens = refreshTokenRepository.findAllByUserIdAndRevokedFalse(existing.getUserId());
            for (RefreshToken token : activeTokens) {
                token.setRevoked(true);
            }
            refreshTokenRepository.saveAllAndFlush(activeTokens);
            throw new UnauthorizedException("Compromised session detected. All sessions terminated.");
        }

        // Check expiration
        if (existing.getExpiresAt().isBefore(OffsetDateTime.now())) {
            existing.setRevoked(true);
            refreshTokenRepository.save(existing);
            throw new UnauthorizedException("Refresh token has expired");
        }

        User user = userRepository.findById(existing.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            existing.setRevoked(true);
            refreshTokenRepository.save(existing);
            throw new UnauthorizedException("User account is deactivated");
        }

        // Revoke current token
        existing.setRevoked(true);
        refreshTokenRepository.save(existing);

        // Issue new refresh token & access token
        String newRawRefreshToken = createRefreshToken(user, userAgent, ipAddress);
        String newAccessToken = jwtTokenProvider.generateToken(user);

        return new TokenRotationResult(newAccessToken, newRawRefreshToken, user);
    }

    @Transactional
    public void revokeToken(String rawToken) {
        if (rawToken != null && !rawToken.isBlank()) {
            String tokenHash = hashToken(rawToken);
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(rt -> {
                rt.setRevoked(true);
                refreshTokenRepository.save(rt);
            });
        }
    }

    @Transactional
    public void revokeAllUserTokens(String userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
