package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.admin.AuthorRequestDto;
import com.tanda.dto.audio.AudioHeartbeatRequestDto;
import com.tanda.dto.audio.StartAudioSessionRequestDto;
import com.tanda.dto.royalty.PayoutRejectRequestDto;
import com.tanda.dto.royalty.PayoutRequestCreateDto;
import com.tanda.dto.royalty.RoyaltyCalculateRequestDto;
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
import com.tanda.repository.PayoutRequestRepository;
import com.tanda.repository.RoyaltyEarningRepository;
import com.tanda.repository.RoyaltyPeriodRepository;
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
    private RoyaltyPeriodRepository royaltyPeriodRepository;

    @Autowired
    private RoyaltyEarningRepository royaltyEarningRepository;

    @Autowired
    private PayoutRequestRepository payoutRequestRepository;

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

        // Heartbeat 3: Listen another 20 seconds (total 90 seconds = 1.5 minutes)
        session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(20));
        audioSessionRepository.save(session);

        AudioHeartbeatRequestDto hb3 = AudioHeartbeatRequestDto.builder()
                .positionSeconds(90)
                .playbackRate(1.0)
                .build();

        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hb3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.validSeconds", is(90)));

        var statAfter90 = authorDailyBookStatsRepository.findByAuthorIdAndBookIdAndStatDate(author.getId(), testBook.getId(), LocalDate.now());
        assertTrue(statAfter90.isPresent());
        assertEquals(90L, statAfter90.get().getTotalSeconds(), "Full 90 seconds (1.5 minutes) should be credited");

        // Check author stats endpoint reflects the 90 seconds
        mockMvc.perform(get("/api/v1/authors/me/stats")
                        .param("authorId", author.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSeconds", is(90)))
                .andExpect(jsonPath("$.totalMinutes", is(1)));
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

    @Test
    @DisplayName("5. Phase 4: Author stats real-time aggregation and historical continuity after book unassignment")
    void testPhase4AuthorStatsAndHistoricalContinuity() throws Exception {
        Book phase4Book = bookRepository.save(Book.builder()
                .id("book-p4-" + UUID.randomUUID().toString().substring(0, 8))
                .title("Қазақ романы " + UUID.randomUUID().toString().substring(0, 4))
                .author("Бейтаныс Автор " + UUID.randomUUID().toString().substring(0, 6))
                .category("Роман")
                .hasAudio(true)
                .audioUrl("https://example.com/audio/p4.mp3")
                .build());

        // Step A: Create Author with phase4Book
        AuthorRequestDto authorDto = AuthorRequestDto.builder()
                .name("Author Phase4")
                .email("phase4_" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .assignedAuthorName(phase4Book.getAuthor())
                .assignedBookIds(List.of(phase4Book.getId()))
                .build();

        MvcResult authorRes = mockMvc.perform(post("/api/v1/admin/authors")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authorDto)))
                .andExpect(status().isCreated())
                .andReturn();

        String authorId = objectMapper.readTree(authorRes.getResponse().getContentAsString()).get("id").asText();

        // Step B: Reader listens for 120 seconds
        StartAudioSessionRequestDto startDto = StartAudioSessionRequestDto.builder()
                .bookId(phase4Book.getId())
                .build();

        MvcResult startRes = mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startDto)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(startRes.getResponse().getContentAsString()).get("sessionId").asText();

        // Heartbeat 1: 40s
        var session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(40));
        audioSessionRepository.save(session);
        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AudioHeartbeatRequestDto.builder()
                                .positionSeconds(40).playbackRate(1.0).build())))
                .andExpect(status().isOk());

        // Heartbeat 2: 40s (total 80s >= 60s threshold)
        session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(40));
        audioSessionRepository.save(session);
        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AudioHeartbeatRequestDto.builder()
                                .positionSeconds(80).playbackRate(1.0).build())))
                .andExpect(status().isOk());

        // Heartbeat 3: 40s (total 120s = 2 minutes)
        session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(40));
        audioSessionRepository.save(session);
        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AudioHeartbeatRequestDto.builder()
                                .positionSeconds(120).playbackRate(1.0).build())))
                .andExpect(status().isOk());

        // Step C: Check author stats endpoint - real-time minutes should be visible
        mockMvc.perform(get("/api/v1/authors/me/stats")
                        .param("authorId", authorId)
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSeconds", is(120)))
                .andExpect(jsonPath("$.totalMinutes", is(2)))
                .andExpect(jsonPath("$.authorBooks[0].totalMinutes", is(2)));

        // Step D: Admin unassigns book from author
        AuthorRequestDto updateDto = AuthorRequestDto.builder()
                .name("Author Phase4")
                .assignedAuthorName(phase4Book.getAuthor())
                .assignedBookIds(List.of()) // Empty list: unassign book
                .build();

        mockMvc.perform(put("/api/v1/admin/authors/" + authorId)
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk());

        // Step E: Historical continuity: getAuthorStats STILL shows the book and 2 minutes for this month!
        mockMvc.perform(get("/api/v1/authors/me/stats")
                        .param("authorId", authorId)
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSeconds", is(120)))
                .andExpect(jsonPath("$.totalMinutes", is(2)))
                .andExpect(jsonPath("$.authorBooks[0].id", is(phase4Book.getId())))
                .andExpect(jsonPath("$.authorBooks[0].totalMinutes", is(2)));
    }

    @Test
    @DisplayName("Phase 5: Royalty Calculation (50/50), Finalization, and Full Author Payout Lifecycle (Request -> Approve & Reject with refund)")
    void testPhase5RoyaltyCalculationFinalizationAndPayoutLifecycle() throws Exception {
        String currentMonth = String.format("%04d-%02d", LocalDate.now().getYear(), LocalDate.now().getMonthValue());

        // 1. Create a dedicated author user and entity for Phase 5 test
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 6);
        User phase5AuthorUser = userRepository.save(User.builder()
                .id("u-phase5-" + uniqueSuffix)
                .email("phase5-" + uniqueSuffix + "@author.kz")
                .name("Phase5 Author " + uniqueSuffix)
                .role("author")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());
        String authorToken = "Bearer " + jwtTokenProvider.generateToken(phase5AuthorUser);

        Author phase5Author = authorRepository.save(Author.builder()
                .id("auth-phase5-" + uniqueSuffix)
                .userId(phase5AuthorUser.getId())
                .displayName("Phase5 Author " + uniqueSuffix)
                .balance(BigDecimal.ZERO)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build());

        Book phase5Book = bookRepository.save(Book.builder()
                .id("b-phase5-" + uniqueSuffix)
                .title("Phase5 Book " + uniqueSuffix)
                .author(phase5Author.getDisplayName())
                .category("Роман")
                .hasAudio(true)
                .createdAt(OffsetDateTime.now())
                .build());

        authorBookRepository.save(AuthorBook.builder()
                .authorId(phase5Author.getId())
                .bookId(phase5Book.getId())
                .royaltyShare(new BigDecimal("100.00"))
                .isActive(true)
                .assignedAt(OffsetDateTime.now())
                .build());

        // Simulate listening: 120 seconds (2 minutes)
        StartAudioSessionRequestDto startDto = StartAudioSessionRequestDto.builder()
                .bookId(phase5Book.getId())
                .build();

        MvcResult startRes = mockMvc.perform(post("/api/v1/audio/sessions")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startDto)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(startRes.getResponse().getContentAsString()).get("sessionId").asText();

        var session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(40));
        audioSessionRepository.save(session);
        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AudioHeartbeatRequestDto.builder()
                                .positionSeconds(40).playbackRate(1.0).build())))
                .andExpect(status().isOk());

        session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(40));
        audioSessionRepository.save(session);
        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AudioHeartbeatRequestDto.builder()
                                .positionSeconds(80).playbackRate(1.0).build())))
                .andExpect(status().isOk());

        session = audioSessionRepository.findById(sessionId).orElseThrow();
        session.setLastHeartbeatAt(session.getLastHeartbeatAt().minusSeconds(40));
        audioSessionRepository.save(session);
        mockMvc.perform(post("/api/v1/audio/sessions/" + sessionId + "/heartbeat")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AudioHeartbeatRequestDto.builder()
                                .positionSeconds(120).playbackRate(1.0).build())))
                .andExpect(status().isOk());

        // 2. Admin calculates royalty period: Total Revenue = 100,000 ₸, Expense = 20,000 ₸
        // Net pool = 80,000 ₸, Company Share (50%) = 40,000 ₸, Author Pool (50%) = 40,000 ₸
        RoyaltyCalculateRequestDto calcReq = RoyaltyCalculateRequestDto.builder()
                .totalRevenue(new BigDecimal("100000.00"))
                .adminExpense(new BigDecimal("20000.00"))
                .adminNote("Phase 5 Test Calculation")
                .build();

        mockMvc.perform(post("/api/v1/admin/royalty/periods/" + currentMonth + "/calculate")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(calcReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CALCULATED")))
                .andExpect(jsonPath("$.netPool", is(80000.0)))
                .andExpect(jsonPath("$.companyShare", is(40000.0)))
                .andExpect(jsonPath("$.royaltyPool", is(40000.0)));

        // 3. Admin finalizes royalty period
        mockMvc.perform(post("/api/v1/admin/royalty/periods/" + currentMonth + "/finalize")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("FINALIZED")))
                .andExpect(jsonPath("$.finalizedAt", notNullValue()));

        // Author's balance should now be credited with their earned royalty
        Author updatedAuthor = authorRepository.findById(phase5Author.getId()).orElseThrow();
        assertTrue(updatedAuthor.getBalance().compareTo(BigDecimal.ZERO) > 0, "Author balance should be greater than 0");
        BigDecimal creditedBalance = updatedAuthor.getBalance();

        // 4. Author requests payout: half of the balance
        BigDecimal payout1Amount = creditedBalance.divide(BigDecimal.valueOf(2), 2, java.math.RoundingMode.HALF_DOWN);
        PayoutRequestCreateDto payout1Req = PayoutRequestCreateDto.builder()
                .amount(payout1Amount)
                .method("Kaspi Gold")
                .cardOrAccount("4400 1234 5678 9012")
                .build();

        MvcResult p1Result = mockMvc.perform(post("/api/v1/authors/me/payouts")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payout1Req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("REQUESTED")))
                .andExpect(jsonPath("$.amount", is(payout1Amount.doubleValue())))
                .andExpect(jsonPath("$.cardOrAccount", is("4400 1234 5678 9012")))
                .andReturn();

        String payout1Id = objectMapper.readTree(p1Result.getResponse().getContentAsString()).get("id").asText();

        // Check balance after request: should be immediately reduced by payout1Amount
        Author authorAfterReq1 = authorRepository.findById(phase5Author.getId()).orElseThrow();
        assertEquals(creditedBalance.subtract(payout1Amount).setScale(2), authorAfterReq1.getBalance().setScale(2));

        // 5. Admin lists payouts
        mockMvc.perform(get("/api/v1/admin/payouts")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));

        // 6. Admin approves payout 1
        mockMvc.perform(patch("/api/v1/admin/payouts/" + payout1Id + "/approve")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.processedAt", notNullValue()));

        // 7. Author requests payout 2 for remaining balance
        BigDecimal payout2Amount = authorAfterReq1.getBalance();
        PayoutRequestCreateDto payout2Req = PayoutRequestCreateDto.builder()
                .amount(payout2Amount)
                .method("Halyk Bank")
                .cardOrAccount("KZ123456789012345678")
                .build();

        MvcResult p2Result = mockMvc.perform(post("/api/v1/authors/me/payouts")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payout2Req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("REQUESTED")))
                .andReturn();

        String payout2Id = objectMapper.readTree(p2Result.getResponse().getContentAsString()).get("id").asText();

        // Balance should now be 0.00
        Author authorAfterReq2 = authorRepository.findById(phase5Author.getId()).orElseThrow();
        assertEquals(0, authorAfterReq2.getBalance().compareTo(BigDecimal.ZERO));

        // 8. Admin rejects payout 2: reason "Қате IBAN нөмірі"
        PayoutRejectRequestDto rejectDto = PayoutRejectRequestDto.builder()
                .reason("Қате IBAN нөмірі")
                .build();

        mockMvc.perform(patch("/api/v1/admin/payouts/" + payout2Id + "/reject")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("REJECTED")))
                .andExpect(jsonPath("$.rejectionReason", is("Қате IBAN нөмірі")))
                .andExpect(jsonPath("$.processedAt", notNullValue()));

        // 9. Author balance MUST be refunded back!
        Author authorAfterReject = authorRepository.findById(phase5Author.getId()).orElseThrow();
        assertEquals(payout2Amount.setScale(2), authorAfterReject.getBalance().setScale(2),
                "Rejected payout amount must be refunded back to author's balance");
    }
}
