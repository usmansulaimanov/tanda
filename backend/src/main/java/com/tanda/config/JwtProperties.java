package com.tanda.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "jwt")
@Getter
@Setter
public class JwtProperties {

    /**
     * Secret key for signing JWT tokens. Must be at least 256 bits (32 chars).
     */
    private String secret = "tanda-super-secret-jwt-key-minimum-256-bits-for-security-2026";

    /**
     * Expiration time in milliseconds (default: 7 days = 604800000 ms, or 24 hours = 86400000 ms).
     */
    private long expiration = 604800000L;
}
