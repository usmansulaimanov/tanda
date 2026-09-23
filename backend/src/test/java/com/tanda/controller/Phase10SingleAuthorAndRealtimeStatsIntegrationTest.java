package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.admin.AuthorRequestDto;
import com.tanda.dto.audio.AudioHeartbeatRequestDto;
import com.tanda.dto.audio.StartAudioSessionRequestDto;
import com.tanda.entity.Author;
import com.tanda.entity.AuthorBook;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.entity.UserDailyAudioLimit;
import com.tanda.repository.AudioSessionRepository;
import com.tanda.repository.AuthorBookRepository;
import com.tanda.repository.AuthorDailyBookStatsRepository;
import com.tanda.repository.AuthorRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.UserDailyAudioLimitRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class Phase10SingleAuthorAndRealtimeStatsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthorRepository authorRepository;

    @Autowired
    private AuthorBookRepository authorBookRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private AudioSessionRepository audioSessionRepository;

    @Autowired
    private AuthorDailyBookStatsRepository authorDailyBookStatsRepository;

    @Autowired
    private UserDailyAudioLimitRepository userDailyAudioLimitRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User adminUser;
    private String adminToken;
    private User readerUser;
    private String readerToken;
    private Book testBook;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.save(User.builder()
                .id("admin-" + UUID.randomUUID().toString().substring(0, 8))
                .name("Admin Adminov")
                .email("admin_" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .role("admin")
                .authProvider("LOCAL")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());
        adminToken = "Bearer " + jwtTokenProvider.generateToken(adminUser);

        readerUser = userRepository.save(User.builder()
                .id("reader-" + UUID.randomUUID().toString().substring(0, 8))
                .name("Reader User")
                .email("reader_" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .role("client")
                .authProvider("LOCAL")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());
        readerToken = "Bearer " + jwtTokenProvider.generateToken(readerUser);

        testBook = bookRepository.save(Book.builder()
                .id("book-" + UUID.randomUUID().toString().substring(0, 8))
                .title("Абай жолы")
                .author("Мұхтар Әуезов")
                .category("Роман")
                .hasAudio(true)
                .audioUrl("https://example.com/audio/abai.mp3")
                .build());
    }

    @Test
    @DisplayName("1. Single Author per Book: Cannot assign already-assigned active book to another author")
    void testSingleAuthorPerBookConflict() throws Exception {
        // Step A: Create Author A with testBook
        AuthorRequestDto authorADto = AuthorRequestDto.builder()
                .name("Author A")
                .email("author_a_" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .assignedAuthorName("Мұхтар Әуезов")
                .assignedBookIds(List.of(testBook.getId()))
                .build();

        mockMvc.perform(post("/api/v1/admin/authors")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authorADto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignedBookIds", hasItem(testBook.getId())));

        // Step B: Create Author B trying to assign the SAME testBook -> Should be rejected with 400
        AuthorRequestDto authorBDto = AuthorRequestDto.builder()
                .name("Author B")
                .email("author_b_" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .assignedAuthorName("Басқа Автор")
                .assignedBookIds(List.of(testBook.getId()))
                .build();

        mockMvc.perform(post("/api/v1/admin/authors")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authorBDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("қазір Мұхтар Әуезов авторына бекітілген")));
    }

    @Test
    @DisplayName("2. 60-Second Threshold: <60s yields 0 credits, >=60s retroactively credits full duration")
    void testSixtySecondThresholdAndRealtimeStats() throws Exception {
        User authorUser = userRepository.save(User.builder()
                .id("author-user-" + UUID.randomUUID().toString().substring(0, 8))
                .name("Мұхтар Әуезов")
                .email("author_" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .role("author")
                .authProvider("LOCAL")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        Author author = authorRepository.save(Author.builder()
                .id("auth-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(authorUser.getId())
                .displayName("Мұхтар Әуезов")
                .balance(BigDecimal.ZERO)
                .isActive(true)
                .build());

        authorBookRepository.save(AuthorBook.builder()
                .authorId(author.getId())
                .bookId(testBook.getId())
                .isActive(true)
                .build());

        // Start audio session
        StartAudioSessionRequestDto startDto = StartAudioSessionRequestDto.builder()
                .bookId(testBook.getId())
                .build();
        MvcResult startRes = mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startDto)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(startRes.getResponse().getContentAsString()).get("sessionId").asText();

        // Heartbeat 1: Listen 40 seconds (< 60 seconds threshold)
        var session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(40));
        audioSessionRepository.save(session);

        AudioHeartbeatRequestDto hb1 = AudioHeartbeatRequestDto.builder()
                .positionSeconds(40)
                .playbackRate(1.0)
                .build();

        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hb1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.validSeconds", is(40)));

        var statBefore = authorDailyBookStatsRepository.findByAuthorIdAndBookIdAndStatDate(author.getId(), testBook.getId(), LocalDate.now());
        assertTrue(statBefore.isEmpty() || statBefore.get().getTotalSeconds() == 0L, "Before 60 seconds, 0 seconds must be credited to author");

        // Heartbeat 2: Listen another 30 seconds (total 70 seconds >= 60 seconds)
        session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(30));
        audioSessionRepository.save(session);

        AudioHeartbeatRequestDto hb2 = AudioHeartbeatRequestDto.builder()
                .positionSeconds(70)
                .playbackRate(1.0)
                .build();

        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hb2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.validSeconds", is(70)));

        var statAfter = authorDailyBookStatsRepository.findByAuthorIdAndBookIdAndStatDate(author.getId(), testBook.getId(), LocalDate.now());
        assertTrue(statAfter.isPresent());
        assertEquals(70L, statAfter.get().getTotalSeconds(), "Full 70 seconds should be retroactively credited");
    }

    @Test
    @DisplayName("3. 2x Speed Multiplier: 35 wall-clock seconds credits 70 content seconds")
    void testSpeedMultiplier() throws Exception {
        User authorUser = userRepository.save(User.builder()
                .id("author-user-" + UUID.randomUUID().toString().substring(0, 8))
                .name("Тест Авторы")
                .email("author_spd_" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .role("author")
                .authProvider("LOCAL")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        Author author = authorRepository.save(Author.builder()
                .id("auth-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(authorUser.getId())
                .displayName("Тест Авторы")
                .balance(BigDecimal.ZERO)
                .isActive(true)
                .build());

        authorBookRepository.save(AuthorBook.builder()
                .authorId(author.getId())
                .bookId(testBook.getId())
                .isActive(true)
                .build());

        StartAudioSessionRequestDto startDto = StartAudioSessionRequestDto.builder()
                .bookId(testBook.getId())
                .build();
        MvcResult startRes = mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startDto)))
                .andExpect(status().isCreated())
                .andReturn();
        String sessionId = objectMapper.readTree(startRes.getResponse().getContentAsString()).get("sessionId").asText();

        var session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(35));
        audioSessionRepository.save(session);

        AudioHeartbeatRequestDto hb = AudioHeartbeatRequestDto.builder()
                .positionSeconds(70)
                .playbackRate(2.0)
                .build();

        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hb)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.validSeconds", is(70)));

        var stat = authorDailyBookStatsRepository.findByAuthorIdAndBookIdAndStatDate(author.getId(), testBook.getId(), LocalDate.now());
        assertTrue(stat.isPresent());
        assertEquals(70L, stat.get().getTotalSeconds(), "At 2x speed, 35 wall seconds should produce 70 content seconds");
    }

    @Test
    @DisplayName("4. Daily 8-Hour Quota: Stops session and flags dailyLimitReached when cap reached")
    void testDailyEightHourLimit() throws Exception {
        LocalDate today = LocalDate.now();
        userDailyAudioLimitRepository.save(UserDailyAudioLimit.builder()
                .id("limit-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(readerUser.getId())
                .statDate(today)
                .totalSeconds(28790)
                .build());

        mockMvc.perform(get("/api/v1/audio/sessions/daily-limit")
                        .header("Authorization", readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSeconds", is(28790)))
                .andExpect(jsonPath("$.remainingSeconds", is(10)))
                .andExpect(jsonPath("$.limitReached", is(false)));

        StartAudioSessionRequestDto startDto = StartAudioSessionRequestDto.builder()
                .bookId(testBook.getId())
                .build();
        MvcResult startRes = mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startDto)))
                .andExpect(status().isCreated())
                .andReturn();
        String sessionId = objectMapper.readTree(startRes.getResponse().getContentAsString()).get("sessionId").asText();

        var session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(20));
        audioSessionRepository.save(session);

        AudioHeartbeatRequestDto hb = AudioHeartbeatRequestDto.builder()
                .positionSeconds(20)
                .playbackRate(1.0)
                .build();

        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hb)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dailyLimitReached", is(true)))
                .andExpect(jsonPath("$.remainingDailySeconds", is(0)));

        mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Бүгінгі күнге берілген тыңдалым лимитіңіз (8 сағат) аяқталды")));
    }
}
