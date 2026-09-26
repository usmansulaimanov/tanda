package com.tanda.config;

import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.Security;

@Configuration
@Slf4j
public class PushNotificationConfig {

    @Value("${vapid.public-key:BKViGQfbLcbTwrD8S-09-bpo8aPvkFEuimSRRdN5y2N-PSkjWO1Br9NC5XO7kaaY_olAVMmpV3ljiPjuvST6URA}")
    private String publicKey;

    @Value("${vapid.private-key:gVjw38hSEtbNDWqv7Iu4-aBjPBbtrj6tH-86AXOPkpo}")
    private String privateKey;

    @Value("${vapid.subject:mailto:support@tanda.kz}")
    private String subject;

    @Bean
    public PushService pushService() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }

        try {
            PushService service = new PushService();
            service.setPublicKey(publicKey);
            service.setPrivateKey(privateKey);
            service.setSubject(subject);
            log.info("PushService initialized successfully with VAPID subject: {}", subject);
            return service;
        } catch (Exception e) {
            log.error("Failed to initialize PushService with VAPID keys: {}", e.getMessage());
            return new PushService();
        }
    }

    public String getPublicKey() {
        return publicKey;
    }
}
