package com.tanda.security;

import com.tanda.config.JwtProperties;
import com.tanda.exception.BadRequestException;
import com.tanda.service.MediaUploadService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class Phase1CriticalSecurityVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MediaUploadService mediaUploadService;

    @Test
    @DisplayName("MediaUploadService rejects path traversal attacks in audio streaming")
    void testAudioStreamPathTraversalBlocked() {
        HttpHeaders headers = new HttpHeaders();

        BadRequestException ex1 = assertThrows(BadRequestException.class, () ->
                mediaUploadService.getAudioResourceRegion("../../application-prod.yml", headers)
        );
        assertTrue(ex1.getMessage().contains("Недопустимый путь к файлу"));

        BadRequestException ex2 = assertThrows(BadRequestException.class, () ->
                mediaUploadService.getAudioResourceRegion("../secret.mp3", headers)
        );
        assertTrue(ex2.getMessage().contains("Недопустимый путь к файлу"));
    }

    @Test
    @DisplayName("GET /api/v1/media/stream/audio/{fileName} requires authentication (401 when anonymous)")
    void testAudioStreamRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/media/stream/audio/sample.mp3"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/media/stream/audio/sample.mp3"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /uploads/covers/** is permitted anonymously")
    void testUploadCoversIsPermitted() throws Exception {
        // Even if file not found (404), it must not be blocked with 401 Unauthorized
        mockMvc.perform(get("/uploads/covers/test-cover.jpg"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /uploads/audio/** requires authentication (401 when anonymous)")
    void testUploadAudioRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/uploads/audio/test-audio.mp3"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("JwtTokenProvider throws IllegalStateException if JWT_SECRET is null or blank")
    void testJwtSecretFailFast() {
        JwtProperties propsWithNull = new JwtProperties();
        propsWithNull.setSecret(null);
        JwtTokenProvider provider1 = new JwtTokenProvider(propsWithNull);
        assertThrows(IllegalStateException.class, provider1::init);

        JwtProperties propsWithBlank = new JwtProperties();
        propsWithBlank.setSecret("   ");
        JwtTokenProvider provider2 = new JwtTokenProvider(propsWithBlank);
        assertThrows(IllegalStateException.class, provider2::init);
    }
}
