package com.tanda.service;

import com.tanda.entity.RefreshToken;
import com.tanda.entity.User;
import com.tanda.exception.UnauthorizedException;
import com.tanda.repository.RefreshTokenRepository;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import com.tanda.dto.user.UserSessionDto;
import com.tanda.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final DeviceParserService deviceParserService;
    private final GeoIpService geoIpService;
    private final SecureRandom secureRandom = new SecureRandom();

    public static final long REFRESH_TOKEN_DAYS = 30L;

    @Value("${app.auth.max-concurrent-devices:2}")
    private int maxConcurrentDevices = 2;

    public record TokenRotationResult(String newAccessToken, String newRawRefreshToken, User user) {}

    @Transactional
    public String createRefreshToken(User user, String userAgent, String ipAddress) {
        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        DeviceParserService.DeviceInfo deviceInfo = deviceParserService.parseUserAgent(userAgent);
        String location = geoIpService.resolveLocation(ipAddress);

        // Enforce device concurrency limit (FIFO: First-In, First-Out)
        List<RefreshToken> activeTokens = refreshTokenRepository.findAllByUserIdAndRevokedFalseOrderByCreatedAtAsc(user.getId());
        OffsetDateTime now = OffsetDateTime.now();
        List<RefreshToken> validActiveTokens = new ArrayList<>();
        for (RefreshToken token : activeTokens) {
            if (token.getExpiresAt().isBefore(now)) {
                token.setRevoked(true);
                token.setRevocationReason("EXPIRED");
                refreshTokenRepository.save(token);
            } else {
                validActiveTokens.add(token);
            }
        }

        if (maxConcurrentDevices > 0 && validActiveTokens.size() >= maxConcurrentDevices) {
            int numToRevoke = validActiveTokens.size() - maxConcurrentDevices + 1;
            for (int i = 0; i < numToRevoke; i++) {
                RefreshToken oldest = validActiveTokens.get(i);
                oldest.setRevoked(true);
                oldest.setRevocationReason("DEVICE_LIMIT_EXCEEDED");
                log.info("Revoked oldest session {} for user {} due to {}-device limit", oldest.getId(), user.getId(), maxConcurrentDevices);
                refreshTokenRepository.save(oldest);
            }
        }

        RefreshToken refreshToken = RefreshToken.builder()
                .id("rt-" + UUID.randomUUID().toString().substring(0, 12))
                .userId(user.getId())
                .tokenHash(tokenHash)
                .expiresAt(OffsetDateTime.now().plusDays(REFRESH_TOKEN_DAYS))
                .revoked(false)
                .userAgent(userAgent != null && userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent)
                .ipAddress(ipAddress != null && ipAddress.length() > 45 ? ipAddress.substring(0, 45) : ipAddress)
                .deviceName(deviceInfo.getDeviceName())
                .deviceType(deviceInfo.getDeviceType())
                .location(location)
                .lastActiveAt(OffsetDateTime.now())
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

        // If token is already revoked, check reason:
        if (Boolean.TRUE.equals(existing.getRevoked())) {
            String reason = existing.getRevocationReason();
            if ("DEVICE_LIMIT_EXCEEDED".equals(reason)) {
                throw new UnauthorizedException("Сессияңыз аяқталды: аккаунтқа басқа құрылғылардан кіру тіркелді.");
            }
            if ("ADMIN_REVOKED".equals(reason)) {
                throw new UnauthorizedException("Сессияңыз әкімші тарапынан тоқтатылды.");
            }

            // Suspicious reuse detection: revoke all sessions
            log.warn("Refresh token reuse detected for userId={}! Revoking all sessions.", existing.getUserId());
            var activeTokens = refreshTokenRepository.findAllByUserIdAndRevokedFalse(existing.getUserId());
            for (RefreshToken token : activeTokens) {
                token.setRevoked(true);
                token.setRevocationReason("COMPROMISED_REUSE");
            }
            refreshTokenRepository.saveAllAndFlush(activeTokens);
            throw new UnauthorizedException("Compromised session detected. All sessions terminated.");
        }

        // Check expiration
        if (existing.getExpiresAt().isBefore(OffsetDateTime.now())) {
            existing.setRevoked(true);
            existing.setRevocationReason("EXPIRED");
            refreshTokenRepository.save(existing);
            throw new UnauthorizedException("Refresh token has expired");
        }

        User user = userRepository.findById(existing.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            existing.setRevoked(true);
            existing.setRevocationReason("USER_DEACTIVATED");
            refreshTokenRepository.save(existing);
            throw new UnauthorizedException("User account is deactivated");
        }

        // Revoke current token with ROTATED reason
        existing.setRevoked(true);
        existing.setRevocationReason("ROTATED");
        existing.setLastActiveAt(OffsetDateTime.now());
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
                rt.setRevocationReason("LOGOUT");
                refreshTokenRepository.save(rt);
            });
        }
    }

    @Transactional
    public void revokeAllUserTokens(String userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    public List<UserSessionDto> getUserSessions(String userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        return tokens.stream().map(this::toSessionDto).toList();
    }

    @Transactional
    public void revokeUserSession(String userId, String sessionId) {
        RefreshToken rt = refreshTokenRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        rt.setRevoked(true);
        rt.setRevocationReason("ADMIN_REVOKED");
        refreshTokenRepository.save(rt);
        log.info("Admin revoked session {} for user {}", sessionId, userId);
    }

    @Transactional
    public void revokeAllUserSessions(String userId) {
        refreshTokenRepository.revokeAllByUserIdWithReason(userId, "ADMIN_REVOKED");
        log.info("Admin revoked all sessions for user {}", userId);
    }

    private UserSessionDto toSessionDto(RefreshToken rt) {
        return UserSessionDto.builder()
                .id(rt.getId())
                .userId(rt.getUserId())
                .deviceName(rt.getDeviceName() != null ? rt.getDeviceName() : "Белгісіз құрылғы")
                .deviceType(rt.getDeviceType() != null ? rt.getDeviceType() : "UNKNOWN")
                .location(rt.getLocation() != null ? rt.getLocation() : "Қазақстан")
                .ipAddress(rt.getIpAddress())
                .userAgent(rt.getUserAgent())
                .createdAt(rt.getCreatedAt())
                .lastActiveAt(rt.getLastActiveAt() != null ? rt.getLastActiveAt() : rt.getCreatedAt())
                .expiresAt(rt.getExpiresAt())
                .revoked(Boolean.TRUE.equals(rt.getRevoked()))
                .revocationReason(rt.getRevocationReason())
                .build();
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
