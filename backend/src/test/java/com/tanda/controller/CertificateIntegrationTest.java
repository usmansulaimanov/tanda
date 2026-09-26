package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.certificate.CertificateRequestDto;
import com.tanda.entity.Certificate;
import com.tanda.entity.User;
import com.tanda.repository.CertificateRepository;
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
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CertificateIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CertificateRepository certificateRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String adminToken;
    private String readerToken;
    private User testAdmin;
    private User testReader;

    @BeforeEach
    void setUp() {
        certificateRepository.deleteAll();

        testAdmin = userRepository.findByEmail("admin_cert_test@tanda.kz").orElseGet(() ->
                userRepository.save(User.builder()
                        .id("admin-cert-1")
                        .email("admin_cert_test@tanda.kz")
                        .name("Admin Cert")
                        .role("admin")
                        .passwordHash("hashed")
                        .build())
        );

        testReader = userRepository.findByEmail("reader_cert_test@tanda.kz").orElseGet(() ->
                userRepository.save(User.builder()
                        .id("reader-cert-1")
                        .email("reader_cert_test@tanda.kz")
                        .name("Aidos Reader")
                        .idNumber("0000 1234")
                        .role("client")
                        .passwordHash("hashed")
                        .build())
        );

        adminToken = "Bearer " + jwtTokenProvider.generateToken(testAdmin);
        readerToken = "Bearer " + jwtTokenProvider.generateToken(testReader);
    }

    @Test
    @DisplayName("Admin can create certificate and auto next number works")
    void testCreateCertificateAndNextNumber() throws Exception {
        // 1. Get next number
        mockMvc.perform(get("/api/v1/admin/certificates/next-number")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextNumber", startsWith("TND-")));

        // 2. Create certificate
        CertificateRequestDto req = CertificateRequestDto.builder()
                .certificateNumber("TND-2026-000001")
                .recipientName("Aidos Nurlanuly")
                .recipientUserId(testReader.getId())
                .recipientIdNumber("0000 1234")
                .title("Үздік оқырман сертификаты")
                .description("39-аптада 1-орын алғаны үшін")
                .category("READER_TOP_10")
                .issuedAt(LocalDate.of(2026, 9, 28))
                .pdfUrl("https://tanda.kz/uploads/cert-1.pdf")
                .build();

        mockMvc.perform(post("/api/v1/admin/certificates")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.certificateNumber", is("TND-2026-000001")))
                .andExpect(jsonPath("$.recipientName", is("Aidos Nurlanuly")))
                .andExpect(jsonPath("$.verificationUrl", containsString("TND-2026-000001")));

        // 3. Duplicate creation should fail with 409 Conflict
        mockMvc.perform(post("/api/v1/admin/certificates")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());

        // 4. Check number availability endpoint
        mockMvc.perform(get("/api/v1/admin/certificates/check-number")
                        .param("number", "TND-2026-000001")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available", is(false)));

        mockMvc.perform(get("/api/v1/admin/certificates/check-number")
                        .param("number", "TND-2026-000002")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available", is(true)));

        // 5. Public verification endpoint (No Auth required!)
        mockMvc.perform(get("/api/v1/certificates/verify/TND-2026-000001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateNumber", is("TND-2026-000001")))
                .andExpect(jsonPath("$.recipientName", is("Aidos Nurlanuly")))
                .andExpect(jsonPath("$.pdfUrl", is("https://tanda.kz/uploads/cert-1.pdf")));

        // 6. Non-existing cert public verification should return 404
        mockMvc.perform(get("/api/v1/certificates/verify/NON-EXISTING-999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Non-admin users cannot access admin certificate endpoints")
    void testNonAdminForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/certificates")
                        .header("Authorization", readerToken))
                .andExpect(status().isForbidden());
    }
}
