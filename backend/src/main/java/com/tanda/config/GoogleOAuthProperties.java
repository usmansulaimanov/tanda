package com.tanda.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "google")
@Getter
@Setter
public class GoogleOAuthProperties {
    /**
     * OAuth 2.0 Client ID from Google Cloud Console.
     */
    private String clientId;
}
