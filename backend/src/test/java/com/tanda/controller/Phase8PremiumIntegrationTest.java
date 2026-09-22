package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.premium.GrantPremiumRequestDto;
import com.tanda.dto.promo.ApplyPromoRequestDto;
import com.tanda.entity.User;
import com.tanda.repository.BirthdayGiftRepository;
import com.tanda.repository.MessageRepository;
import com.tanda.repository.PremiumEntitlementRepository;
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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
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
public class Phase8PremiumIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PremiumEntitlementRepository entitlementRepository;

    @Autowired
    private BirthdayGiftRepository birthdayGiftRepository;

    @Autowired
    private MessageRepository messageRepository;

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
        adminUser = userRepository.findByEmail("admin-prem-test@tanda.kz").orElseGet(() ->
                userRepository.save(User.builder()
                        .id("admin-prem-" + UUID.randomUUID())
                        .name("Admin Premium")
                        .email("admin-prem-test@tanda.kz")
                        .role("admin")
                        .isActive(true)
                        .createdAt(OffsetDateTime.now())
                        .build())
        );

        readerUser = userRepository.findByEmail("reader-prem-test@tanda.kz").orElseGet(() ->
                userRepository.save(User.builder()
                        .id("reader-prem-" + UUID.randomUUID())
                        .name("Reader Premium")
                        .email("reader-prem-test@tanda.kz")
                        .role("client")
                        .birthDate(LocalDate.now().toString())
                        .isActive(true)
                        .createdAt(OffsetDateTime.now())
                        .build())
        );

        adminToken = "Bearer " + jwtTokenProvider.generateToken(adminUser);
        readerToken = "Bearer " + jwtTokenProvider.generateToken(readerUser);
    }

    @Test
    @DisplayName("1. Admin grants manual premium and reader checks status via /me/premium & /auth/me")
    void testManualPremiumFlow() throws Exception {
        // Initially reader is not premium
        mockMvc.perform(get("/api/v1/me/premium")
                        .header("Authorization", readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPremium", is(false)));

        // Admin grants 30 days
        GrantPremiumRequestDto grantReq = GrantPremiumRequestDto.builder()
                .days(30)
                .source("MANUAL_ADMIN")
                .note("VIP Gift")
                .build();

        mockMvc.perform(post("/api/v1/admin/premium/" + readerUser.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(grantReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId", is(readerUser.getId())))
                .andExpect(jsonPath("$.expiresAt", notNullValue()));

        // Reader checks /me/premium
        mockMvc.perform(get("/api/v1/me/premium")
                        .header("Authorization", readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPremium", is(true)))
                .andExpect(jsonPath("$.daysRemaining", greaterThanOrEqualTo(29)));

        // Reader checks /auth/me
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPremium", is(true)))
                .andExpect(jsonPath("$.premiumExpiresAt", notNullValue()));
    }

    @Test
    @DisplayName("2. Birthday gift grants 30 days premium, creates message, and prevents duplicate in same year")
    void testBirthdayGiftFlow() throws Exception {
        int currentYear = LocalDate.now().getYear();

        // 1st birthday gift succeeds
        mockMvc.perform(post("/api/v1/admin/users/" + readerUser.getId() + "/birthday-gift?year=" + currentYear)
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // Reader now has premium
        mockMvc.perform(get("/api/v1/me/premium")
                        .header("Authorization", readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPremium", is(true)));

        // Reader has celebratory message in inbox
        mockMvc.perform(get("/api/v1/me/messages")
                        .header("Authorization", readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].title", is("Туған күніңізбен!")));

        // 2nd birthday gift in same year fails (400 Bad Request)
        mockMvc.perform(post("/api/v1/admin/users/" + readerUser.getId() + "/birthday-gift?year=" + currentYear)
                        .header("Authorization", adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("3. Applying subscription promo code automatically extends backend premium")
    void testPromoCodeExtendsPremium() throws Exception {
        // Reader applies seeded TANDA2026 promo code
        ApplyPromoRequestDto applyReq = ApplyPromoRequestDto.builder()
                .code("TANDA2026")
                .build();

        mockMvc.perform(post("/api/v1/promo-codes/apply")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(applyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // Reader is now premium on backend!
        mockMvc.perform(get("/api/v1/me/premium")
                        .header("Authorization", readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPremium", is(true)))
                .andExpect(jsonPath("$.source", is("PROMO_CODE")));
    }

    @Test
    @DisplayName("4. Security: Non-admin cannot access admin premium endpoints")
    void testSecurityConstraints() throws Exception {
        mockMvc.perform(get("/api/v1/admin/premium")
                        .header("Authorization", readerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/admin/premium/" + readerUser.getId())
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}
