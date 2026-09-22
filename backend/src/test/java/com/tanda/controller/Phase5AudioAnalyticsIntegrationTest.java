package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.audio.AudioHeartbeatRequestDto;
import com.tanda.dto.audio.StartAudioSessionRequestDto;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.repository.BookRepository;
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
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
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
public class Phase5AudioAnalyticsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User adminUser;
    private User reader1;
    private User reader2;
    private String adminToken;
    private String reader1Token;
    private String reader2Token;
    private Book bookA;
    private Book bookB;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.save(User.builder()
                .id("admin-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Admin User")
                .email("admin-" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .role("admin")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        reader1 = userRepository.save(User.builder()
                .id("r1-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Reader 1")
                .email("r1-" + UUID.randomUUID().toString().substring(0, 6) + "@test.kz")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        reader2 = userRepository.save(User.builder()
                .id("r2-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Reader 2")
                .email("r2-" + UUID.randomUUID().toString().substring(0, 6) + "@test.kz")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        adminToken = jwtTokenProvider.generateToken(adminUser);
        reader1Token = jwtTokenProvider.generateToken(reader1);
        reader2Token = jwtTokenProvider.generateToken(reader2);

        bookA = bookRepository.save(Book.builder()
                .id("bk-a-" + UUID.randomUUID().toString().substring(0, 6))
                .title("Top Audio Book A")
                .author("Author A")
                .category("Roman")
                .hasAudio(true)
                .audioDuration("10:00")
                .audioUrl("https://example.com/audio/a.mp3")
                .createdAt(OffsetDateTime.now())
                .build());

        bookB = bookRepository.save(Book.builder()
                .id("bk-b-" + UUID.randomUUID().toString().substring(0, 6))
                .title("Top Audio Book B")
                .author("Author B")
                .category("Roman")
                .hasAudio(true)
                .audioDuration("15:00")
                .audioUrl("https://example.com/audio/b.mp3")
                .createdAt(OffsetDateTime.now())
                .build());
    }

    @Test
    @DisplayName("Phase 5: Top audio ranking computed from real audio sessions")
    void testTopAudioRanking() throws Exception {
        // Reader 1 starts session on Book A
        String resA1 = mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", "Bearer " + reader1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(StartAudioSessionRequestDto.builder().bookId(bookA.getId()).build())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String sessionA1 = objectMapper.readTree(resA1).get("sessionId").asText();

        // Reader 2 starts session on Book A
        mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", "Bearer " + reader2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(StartAudioSessionRequestDto.builder().bookId(bookA.getId()).build())))
                .andExpect(status().isCreated());

        // Reader 1 starts session on Book B (only 1 session for Book B)
        mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", "Bearer " + reader1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(StartAudioSessionRequestDto.builder().bookId(bookB.getId()).build())))
                .andExpect(status().isCreated());

        // Public GET /api/v1/books/top-audio
        mockMvc.perform(get("/api/v1/books/top-audio?limit=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].rank", is(1)))
                .andExpect(jsonPath("$[0].book.id", is(bookA.getId())))
                .andExpect(jsonPath("$[0].totalListens", is(2)))
                .andExpect(jsonPath("$[1].rank", is(2)))
                .andExpect(jsonPath("$[1].book.id", is(bookB.getId())))
                .andExpect(jsonPath("$[1].totalListens", is(1)));
    }

    @Test
    @DisplayName("Phase 5: Admin audio analytics statistics and RBAC")
    void testAdminAudioStats() throws Exception {
        // Create a session
        mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", "Bearer " + reader1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(StartAudioSessionRequestDto.builder().bookId(bookA.getId()).build())))
                .andExpect(status().isCreated());

        // Admin can access
        mockMvc.perform(get("/api/v1/admin/stats/audio")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSessions", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.topBooks", notNullValue()));

        // Reader cannot access (403 Forbidden)
        mockMvc.perform(get("/api/v1/admin/stats/audio")
                        .header("Authorization", "Bearer " + reader1Token))
                .andExpect(status().isForbidden());
    }
}
