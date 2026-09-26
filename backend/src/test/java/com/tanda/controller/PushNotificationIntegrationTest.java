package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.push.PushPayloadDto;
import com.tanda.dto.push.PushSubscriptionRequestDto;
import com.tanda.entity.PushSubscription;
import com.tanda.entity.User;
import com.tanda.repository.PushSubscriptionRepository;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class PushNotificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User adminUser;
    private User readerUser;
    private String adminToken;
    private String readerToken;

    @BeforeEach
    void setUp() {
        pushSubscriptionRepository.deleteAll();

        String suffix = UUID.randomUUID().toString().substring(0, 6);
        adminUser = userRepository.save(User.builder()
                .id("admin-push-" + suffix)
                .email("admin." + suffix + "@tanda.kz")
                .name("Admin")
                .role("admin")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        readerUser = userRepository.save(User.builder()
                .id("reader-push-" + suffix)
                .email("reader." + suffix + "@tanda.kz")
                .name("Reader")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        adminToken = jwtTokenProvider.generateToken(adminUser);
        readerToken = jwtTokenProvider.generateToken(readerUser);
    }

    @Test
    @DisplayName("GET /api/v1/push/public-key returns VAPID public key without authentication")
    void getPublicKey_Success() throws Exception {
        mockMvc.perform(get("/api/v1/push/public-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicKey", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/v1/push/subscribe creates a subscription for authenticated user")
    void subscribe_Authenticated_Success() throws Exception {
        PushSubscriptionRequestDto dto = PushSubscriptionRequestDto.builder()
                .endpoint("https://fcm.googleapis.com/fcm/send/test-endpoint-123")
                .keys(PushSubscriptionRequestDto.Keys.builder()
                        .p256dh("BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qLkR")
                        .auth("tBHItJI5svbpez7KI4CCXg")
                        .build())
                .userAgent("Mozilla/5.0 TestBrowser")
                .build();

        mockMvc.perform(post("/api/v1/push/subscribe")
                        .header("Authorization", "Bearer " + readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Subscribed successfully")));

        var subscriptions = pushSubscriptionRepository.findByUserId(readerUser.getId());
        assertThat(subscriptions).hasSize(1);
        assertThat(subscriptions.get(0).getEndpoint()).isEqualTo("https://fcm.googleapis.com/fcm/send/test-endpoint-123");
        assertThat(subscriptions.get(0).getP256dh()).isEqualTo("BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qLkR");
    }

    @Test
    @DisplayName("POST /api/v1/push/unsubscribe removes subscription by endpoint")
    void unsubscribe_Success() throws Exception {
        String endpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint-to-remove";
        pushSubscriptionRepository.save(PushSubscription.builder()
                .id("sub-to-del")
                .userId(readerUser.getId())
                .endpoint(endpoint)
                .p256dh("p256")
                .auth("auth")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build());

        mockMvc.perform(post("/api/v1/push/unsubscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("endpoint", endpoint))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Unsubscribed successfully")));

        assertThat(pushSubscriptionRepository.findByEndpoint(endpoint)).isEmpty();
    }

    @Test
    @DisplayName("POST /api/v1/admin/push/test requires ADMIN role")
    void sendTestPush_AdminSecurity() throws Exception {
        PushPayloadDto payload = PushPayloadDto.builder()
                .title("Тест хабарлама")
                .body("Бұл тест хабарламасы")
                .build();

        // 1. Anonymous fails with 401
        mockMvc.perform(post("/api/v1/admin/push/test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isUnauthorized());

        // 2. Reader fails with 403 Forbidden
        mockMvc.perform(post("/api/v1/admin/push/test")
                        .header("Authorization", "Bearer " + readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());

        // 3. Admin succeeds
        mockMvc.perform(post("/api/v1/admin/push/test")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Test push broadcast triggered")));
    }
}
