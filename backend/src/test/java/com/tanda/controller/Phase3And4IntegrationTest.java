package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.audio.AudioEndSessionRequestDto;
import com.tanda.dto.audio.AudioHeartbeatRequestDto;
import com.tanda.dto.audio.StartAudioSessionRequestDto;
import com.tanda.dto.shelf.UserBookRequestDto;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.repository.BookRepository;
import com.tanda.repository.ReadingProgressRepository;
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
public class Phase3And4IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private ReadingProgressRepository readingProgressRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User user1;
    private User user2;
    private String token1;
    private String token2;
    private Book testBook;

    @BeforeEach
    void setUp() {
        user1 = userRepository.save(User.builder()
                .id("u1-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Reader One")
                .email("reader1-" + UUID.randomUUID().toString().substring(0, 6) + "@test.kz")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        user2 = userRepository.save(User.builder()
                .id("u2-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Reader Two")
                .email("reader2-" + UUID.randomUUID().toString().substring(0, 6) + "@test.kz")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        token1 = jwtTokenProvider.generateToken(user1);
        token2 = jwtTokenProvider.generateToken(user2);

        testBook = bookRepository.save(Book.builder()
                .id("b-" + UUID.randomUUID().toString().substring(0, 8))
                .title("Abay Zholy")
                .author("Mukhtar Auezov")
                .category("Roman")
                .pages(300)
                .hasAudio(true)
                .audioDuration("12:45")
                .audioUrl("https://example.com/audio/abay.mp3")
                .createdAt(OffsetDateTime.now())
                .build());
    }

    // --- PHASE 3: PERSONAL READING SHELF ---

    @Test
    @DisplayName("Phase 3: Add book to shelf and retrieve personal shelf")
    void testAddBookToShelfAndRetrieve() throws Exception {
        UserBookRequestDto addReq = UserBookRequestDto.builder()
                .status("reading")
                .currentPage(15)
                .totalPages(300)
                .build();

        mockMvc.perform(post("/api/v1/me/books/" + testBook.getId())
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookId", is(testBook.getId())))
                .andExpect(jsonPath("$.status", is("reading")))
                .andExpect(jsonPath("$.currentPage", is(15)))
                .andExpect(jsonPath("$.title", is("Abay Zholy")));

        // Get personal shelf
        mockMvc.perform(get("/api/v1/me/books")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].bookId", is(testBook.getId())))
                .andExpect(jsonPath("$[0].status", is("reading")));

        // Filter by status
        mockMvc.perform(get("/api/v1/me/books?status=reading")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        mockMvc.perform(get("/api/v1/me/books?status=completed")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Phase 3: Update progress and complete book")
    void testUpdateShelfProgressAndComplete() throws Exception {
        // Initial add
        mockMvc.perform(post("/api/v1/me/books/" + testBook.getId())
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(UserBookRequestDto.builder().status("reading").build())))
                .andExpect(status().isCreated());

        // Update progress to 100%
        UserBookRequestDto updateReq = UserBookRequestDto.builder()
                .currentPage(300)
                .totalPages(300)
                .build();

        mockMvc.perform(patch("/api/v1/me/books/" + testBook.getId())
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("completed")))
                .andExpect(jsonPath("$.progressPercent", is(100.0)))
                .andExpect(jsonPath("$.completedAt", notNullValue()));

        // Delete from shelf
        mockMvc.perform(delete("/api/v1/me/books/" + testBook.getId())
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isNoContent());

        // Verify empty shelf
        mockMvc.perform(get("/api/v1/me/books")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Phase 3: Shelf IDOR isolation between users")
    void testShelfIsolationBetweenUsers() throws Exception {
        // User 1 adds book
        mockMvc.perform(post("/api/v1/me/books/" + testBook.getId())
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(UserBookRequestDto.builder().status("want_to_read").build())))
                .andExpect(status().isCreated());

        // User 2 shelf must be empty
        mockMvc.perform(get("/api/v1/me/books")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // --- PHASE 4: AUDIO SESSIONS & EVENTS ---

    @Test
    @DisplayName("Phase 4: Start session, send heartbeat, and end session")
    void testAudioSessionLifecycle() throws Exception {
        StartAudioSessionRequestDto startDto = StartAudioSessionRequestDto.builder()
                .bookId(testBook.getId())
                .build();

        String res = mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId", notNullValue()))
                .andExpect(jsonPath("$.bookId", is(testBook.getId())))
                .andExpect(jsonPath("$.validSeconds", is(0)))
                .andReturn().getResponse().getContentAsString();

        String sessionId = objectMapper.readTree(res).get("sessionId").asText();

        // Send heartbeat
        AudioHeartbeatRequestDto hbDto = AudioHeartbeatRequestDto.builder()
                .positionSeconds(45)
                .build();

        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hbDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId", is(sessionId)))
                .andExpect(jsonPath("$.positionSeconds", is(45)));

        // End session
        AudioEndSessionRequestDto endDto = AudioEndSessionRequestDto.builder()
                .positionSeconds(60)
                .build();

        mockMvc.perform(patch("/api/v1/audio/sessions/" + sessionId + "/end")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(endDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId", is(sessionId)))
                .andExpect(jsonPath("$.endedAt", notNullValue()));

        // Verify ReadingProgress synchronized
        mockMvc.perform(get("/api/v1/progress/" + testBook.getId())
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentAudioTime", is(60)));
    }

    @Test
    @DisplayName("Phase 4: Audio session IDOR security test")
    void testAudioSessionIdorSecurity() throws Exception {
        // User 1 starts session
        String res = mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(StartAudioSessionRequestDto.builder().bookId(testBook.getId()).build())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String sessionId = objectMapper.readTree(res).get("sessionId").asText();

        // User 2 attempts to send heartbeat on User 1's session -> must be 403 Forbidden
        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AudioHeartbeatRequestDto.builder().positionSeconds(10).build())))
                .andExpect(status().isForbidden());

        // User 2 attempts to end User 1's session -> must be 403 Forbidden
        mockMvc.perform(patch("/api/v1/audio/sessions/" + sessionId + "/end")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AudioEndSessionRequestDto.builder().positionSeconds(10).build())))
                .andExpect(status().isForbidden());
    }
}
