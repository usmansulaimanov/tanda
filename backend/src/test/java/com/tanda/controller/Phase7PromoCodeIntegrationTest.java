package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.promo.ApplyPromoRequestDto;
import com.tanda.dto.promo.GeneratePromoCodesRequestDto;
import com.tanda.dto.promo.UpdatePromoCodeRequestDto;
import com.tanda.dto.promo.ValidatePromoRequestDto;
import com.tanda.entity.User;
import com.tanda.repository.PromoCodeRepository;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class Phase7PromoCodeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PromoCodeRepository promoCodeRepository;

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
        adminUser = userRepository.findByEmail("admin-promo-test@tanda.kz").orElseGet(() ->
                userRepository.save(User.builder()
                        .id("admin-promo-" + UUID.randomUUID())
                        .name("Admin Promo")
                        .email("admin-promo-test@tanda.kz")
                        .role("admin")
                        .isActive(true)
                        .createdAt(OffsetDateTime.now())
                        .build())
        );

        readerUser = userRepository.findByEmail("reader-promo-test@tanda.kz").orElseGet(() ->
                userRepository.save(User.builder()
                        .id("reader-promo-" + UUID.randomUUID())
                        .name("Reader Promo")
                        .email("reader-promo-test@tanda.kz")
                        .role("client")
                        .isActive(true)
                        .createdAt(OffsetDateTime.now())
                        .build())
        );

        adminToken = "Bearer " + jwtTokenProvider.generateToken(adminUser);
        readerToken = "Bearer " + jwtTokenProvider.generateToken(readerUser);
    }

    @Test
    @DisplayName("1. Validate valid and invalid promo codes")
    void testValidatePromoCode() throws Exception {
        // Valid seeded code TANDA2026
        ValidatePromoRequestDto validReq = ValidatePromoRequestDto.builder()
                .code("TANDA2026")
                .build();

        mockMvc.perform(post("/api/v1/promo-codes/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(true)))
                .andExpect(jsonPath("$.code", is("TANDA2026")))
                .andExpect(jsonPath("$.rewardTitle", notNullValue()));

        // Invalid code
        ValidatePromoRequestDto invalidReq = ValidatePromoRequestDto.builder()
                .code("NON-EXISTENT-CODE")
                .build();

        mockMvc.perform(post("/api/v1/promo-codes/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(false)));
    }

    @Test
    @DisplayName("2. Apply promo code, prevent duplicate application, and view in my promo codes")
    void testApplyAndMyPromoCodes() throws Exception {
        ApplyPromoRequestDto applyReq = ApplyPromoRequestDto.builder()
                .code("TANDA2026")
                .build();

        // 1st application succeeds
        mockMvc.perform(post("/api/v1/promo-codes/apply")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(applyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.rewardTitle", notNullValue()));

        // 2nd application fails (already used)
        mockMvc.perform(post("/api/v1/promo-codes/apply")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(applyReq)))
                .andExpect(status().isBadRequest());

        // Reader sees applied code in my promo codes
        mockMvc.perform(get("/api/v1/me/promo-codes")
                        .header("Authorization", readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].code", is("TANDA2026")));
    }

    @Test
    @DisplayName("3. Admin generate batch, update, and manage promo codes")
    void testAdminPromoManagement() throws Exception {
        // Generate new batch of 5 codes
        GeneratePromoCodesRequestDto genReq = GeneratePromoCodesRequestDto.builder()
                .batchName("Көктем 2026")
                .count(5)
                .rewardTitle("6 айлық жазылым")
                .rewardType("subscription_6m")
                .durationDays(60)
                .prefix("SPRING")
                .maxUses(1)
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/admin/promo-codes")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(genReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.batch.name", is("Көктем 2026")))
                .andExpect(jsonPath("$.batch.totalCodes", is(5)))
                .andExpect(jsonPath("$.codes", hasSize(5)))
                .andReturn();

        String responseStr = result.getResponse().getContentAsString();
        String generatedCodeId = objectMapper.readTree(responseStr).path("codes").get(0).path("id").asText();
        String generatedBatchId = objectMapper.readTree(responseStr).path("batch").path("id").asText();

        // Update promo code note and issued
        UpdatePromoCodeRequestDto updateReq = UpdatePromoCodeRequestDto.builder()
                .isIssued(true)
                .note("Sent to test user")
                .build();

        mockMvc.perform(patch("/api/v1/admin/promo-codes/" + generatedCodeId)
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isIssued", is(true)))
                .andExpect(jsonPath("$.note", is("Sent to test user")));

        // Get all promo codes
        mockMvc.perform(get("/api/v1/admin/promo-codes")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(7)))); // 2 seeded + 5 newly created

        // Get batches
        mockMvc.perform(get("/api/v1/admin/promo-codes/batches")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(2))));

        // Delete batch
        mockMvc.perform(delete("/api/v1/admin/promo-codes/batches/" + generatedBatchId)
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("4. Non-admin users cannot access admin endpoints")
    void testSecurityConstraints() throws Exception {
        mockMvc.perform(get("/api/v1/admin/promo-codes")
                        .header("Authorization", readerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/admin/promo-codes")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}
