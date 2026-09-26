package com.tanda.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.config.PushNotificationConfig;
import com.tanda.dto.push.PushPayloadDto;
import com.tanda.dto.push.PushSubscriptionRequestDto;
import com.tanda.entity.PushSubscription;
import com.tanda.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final PushService pushService;
    private final PushNotificationConfig pushNotificationConfig;
    private final ObjectMapper objectMapper;

    public String getVapidPublicKey() {
        return pushNotificationConfig.getPublicKey();
    }

    @Transactional
    public void subscribe(String userId, PushSubscriptionRequestDto dto) {
        if (dto.getEndpoint() == null || dto.getKeys() == null) {
            log.warn("Invalid push subscription request: missing endpoint or keys");
            return;
        }

        Optional<PushSubscription> existing = pushSubscriptionRepository.findByEndpoint(dto.getEndpoint());
        PushSubscription sub;
        if (existing.isPresent()) {
            sub = existing.get();
            sub.setUserId(userId);
            sub.setP256dh(dto.getKeys().getP256dh());
            sub.setAuth(dto.getKeys().getAuth());
            sub.setUserAgent(dto.getUserAgent());
            sub.setUpdatedAt(OffsetDateTime.now());
        } else {
            sub = PushSubscription.builder()
                    .id("psub-" + UUID.randomUUID().toString().substring(0, 8))
                    .userId(userId)
                    .endpoint(dto.getEndpoint())
                    .p256dh(dto.getKeys().getP256dh())
                    .auth(dto.getKeys().getAuth())
                    .userAgent(dto.getUserAgent())
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();
        }

        pushSubscriptionRepository.save(sub);
        log.info("Push subscription saved: id='{}', userId='{}'", sub.getId(), userId);
    }

    @Transactional
    public void unsubscribe(String endpoint) {
        if (endpoint != null && !endpoint.isBlank()) {
            pushSubscriptionRepository.deleteByEndpoint(endpoint);
            log.info("Push subscription deleted for endpoint='{}'", endpoint);
        }
    }

    public void sendToUserAsync(String userId, PushPayloadDto payload) {
        if (userId == null || userId.isBlank()) return;
        CompletableFuture.runAsync(() -> {
            try {
                List<PushSubscription> subs = pushSubscriptionRepository.findByUserId(userId);
                for (PushSubscription sub : subs) {
                    sendNotificationToSubscription(sub, payload);
                }
            } catch (Exception e) {
                log.warn("Error sending push to userId='{}': {}", userId, e.getMessage());
            }
        });
    }

    public void sendToUsersAsync(List<String> userIds, PushPayloadDto payload) {
        if (userIds == null || userIds.isEmpty()) return;
        CompletableFuture.runAsync(() -> {
            try {
                List<PushSubscription> subs = pushSubscriptionRepository.findByUserIdIn(userIds);
                for (PushSubscription sub : subs) {
                    sendNotificationToSubscription(sub, payload);
                }
            } catch (Exception e) {
                log.warn("Error sending push to userIds: {}", e.getMessage());
            }
        });
    }

    public void sendToAllAsync(PushPayloadDto payload) {
        CompletableFuture.runAsync(() -> {
            try {
                List<PushSubscription> subs = pushSubscriptionRepository.findAll();
                log.info("Broadcasting push notification to {} devices: '{}'", subs.size(), payload.getTitle());
                for (PushSubscription sub : subs) {
                    sendNotificationToSubscription(sub, payload);
                }
            } catch (Exception e) {
                log.warn("Error broadcasting push notification: {}", e.getMessage());
            }
        });
    }

    private void sendNotificationToSubscription(PushSubscription sub, PushPayloadDto payload) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);
            Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    payloadJson.getBytes(StandardCharsets.UTF_8)
            );

            HttpResponse response = pushService.send(notification);
            int statusCode = response != null && response.getStatusLine() != null
                    ? response.getStatusLine().getStatusCode()
                    : 0;

            if (statusCode == 201 || statusCode == 200) {
                log.debug("Push sent successfully to endpoint: {}", sub.getId());
            } else if (statusCode == 404 || statusCode == 410) {
                // Subscription has expired or user unsubscribed on browser
                log.info("Push subscription expired (status={}), deleting: {}", statusCode, sub.getId());
                pushSubscriptionRepository.deleteById(sub.getId());
            } else {
                log.warn("Push delivery returned status {} for subscription {}", statusCode, sub.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to send push notification to {}: {}", sub.getId(), e.getMessage());
        }
    }
}
