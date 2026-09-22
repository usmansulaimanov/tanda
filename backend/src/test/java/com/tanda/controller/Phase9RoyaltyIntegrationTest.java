package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.royalty.PayoutRejectRequestDto;
import com.tanda.dto.royalty.PayoutRequestCreateDto;
import com.tanda.dto.royalty.RoyaltyCalculateRequestDto;
import com.tanda.entity.AudioDailyStats;
import com.tanda.entity.Author;
import com.tanda.entity.AuthorBook;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.repository.AudioDailyStatsRepository;
import com.tanda.repository.AuthorBookRepository;
import com.tanda.repository.AuthorRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.PayoutRequestRepository;
import com.tanda.repository.RoyaltyEarningRepository;
import com.tanda.repository.RoyaltyPeriodRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class Phase9RoyaltyIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthorRepository authorRepository;

    @Autowired
    private AuthorBookRepository authorBookRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private AudioDailyStatsRepository audioDailyStatsRepository;

    @Autowired
    private RoyaltyPeriodRepository royaltyPeriodRepository;

    @Autowired
    private RoyaltyEarningRepository royaltyEarningRepository;

    @Autowired
    private PayoutRequestRepository payoutRequestRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User adminUser;
    private User authorUser;
    private Author authorEntity;
    private User readerUser;
    private Book testBook;

    private String adminToken;
    private String authorToken;
    private String readerToken;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.findByEmail("admin-royalty-test@tanda.kz").orElseGet(() ->
                userRepository.save(User.builder()
                        .id("admin-royalty-" + UUID.randomUUID())
                        .name("Admin Royalty")
                        .email("admin-royalty-test@tanda.kz")
                        .role("admin")
                        .isActive(true)
                        .createdAt(OffsetDateTime.now())
                        .build())
        );

        authorUser = userRepository.findByEmail("author-royalty-test@tanda.kz").orElseGet(() ->
                userRepository.save(User.builder()
                        .id("author-user-royalty-" + UUID.randomUUID())
                        .name("Author Tanda")
                        .email("author-royalty-test@tanda.kz")
                        .role("author")
                        .isActive(true)
                        .createdAt(OffsetDateTime.now())
                        .build())
        );

        authorEntity = authorRepository.findByUserId(authorUser.getId()).orElseGet(() ->
                authorRepository.save(Author.builder()
                        .id("author-ent-" + UUID.randomUUID())
                        .userId(authorUser.getId())
                        .displayName("Мұхтар Әуезов")
                        .balance(BigDecimal.ZERO)
                        .isActive(true)
                        .build())
        );

        readerUser = userRepository.findByEmail("reader-royalty-test@tanda.kz").orElseGet(() ->
                userRepository.save(User.builder()
                        .id("reader-royalty-" + UUID.randomUUID())
                        .name("Reader Royalty")
                        .email("reader-royalty-test@tanda.kz")
                        .role("client")
                        .isActive(true)
                        .createdAt(OffsetDateTime.now())
                        .build())
        );

        testBook = bookRepository.save(Book.builder()
                .id("book-royalty-" + UUID.randomUUID())
                .title("Абай жолы")
                .author("Мұхтар Әуезов")
                .pages(450)
                .category("Роман-эпопея")
                .hasAudio(true)
                .audioUrl("https://example.com/abai.mp3")
                .build());

        authorBookRepository.save(AuthorBook.builder()
                .authorId(authorEntity.getId())
                .bookId(testBook.getId())
                .royaltyShare(new BigDecimal("100.00"))
                .build());

        // Create audio daily stats for September 2026
        audioDailyStatsRepository.save(AudioDailyStats.builder()
                .id("audio-stat-" + UUID.randomUUID())
                .book(testBook)
                .statDate(LocalDate.of(2026, 9, 10))
                .totalSeconds(12000L) // 200 minutes
                .listenCount(5)
                .uniqueListeners(3)
                .build());

        adminToken = "Bearer " + jwtTokenProvider.generateToken(adminUser);
        authorToken = "Bearer " + jwtTokenProvider.generateToken(authorUser);
        readerToken = "Bearer " + jwtTokenProvider.generateToken(readerUser);
    }

    @Test
    @DisplayName("Admin can calculate royalty period and non-admin is forbidden")
    void testCalculateRoyaltyPeriod() throws Exception {
        RoyaltyCalculateRequestDto req = RoyaltyCalculateRequestDto.builder()
                .totalRevenue(new BigDecimal("100000.00"))
                .adminExpense(new BigDecimal("10000.00"))
                .adminNote("September test run")
                .build();

        // Reader forbidden
        mockMvc.perform(post("/api/v1/admin/royalty/periods/2026-09/calculate")
                        .header("Authorization", readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        // Admin success
        mockMvc.perform(post("/api/v1/admin/royalty/periods/2026-09/calculate")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month", is("2026-09")))
                .andExpect(jsonPath("$.status", is("CALCULATED")))
                .andExpect(jsonPath("$.totalRevenue", is(100000.0)))
                .andExpect(jsonPath("$.adminExpense", is(10000.0)))
                .andExpect(jsonPath("$.netPool", is(90000.0)))
                .andExpect(jsonPath("$.royaltyPool", is(45000.0)))
                .andExpect(jsonPath("$.totalMinutes", is(200)))
                .andExpect(jsonPath("$.ratePerMinute", is(225.0))); // 45000 / 200 = 225
    }

    @Test
    @DisplayName("Admin can finalize royalty period, updates balance, and prevents duplicate finalization")
    void testFinalizeRoyaltyPeriod() throws Exception {
        RoyaltyCalculateRequestDto req = RoyaltyCalculateRequestDto.builder()
                .totalRevenue(new BigDecimal("200000.00"))
                .adminExpense(new BigDecimal("20000.00"))
                .build();

        // 1. Calculate
        mockMvc.perform(post("/api/v1/admin/royalty/periods/2026-09/calculate")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // 2. Finalize
        mockMvc.perform(post("/api/v1/admin/royalty/periods/2026-09/finalize")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("FINALIZED")))
                .andExpect(jsonPath("$.finalizedAt", notNullValue()));

        // Author balance must be updated
        Author updatedAuthor = authorRepository.findById(authorEntity.getId()).orElseThrow();
        assertTrue(updatedAuthor.getBalance().compareTo(BigDecimal.ZERO) > 0);

        // 3. Duplicate finalization must return 409 Conflict
        mockMvc.perform(post("/api/v1/admin/royalty/periods/2026-09/finalize")
                        .header("Authorization", adminToken))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Author can view earnings and monthly stats")
    void testAuthorStatsAndEarnings() throws Exception {
        RoyaltyCalculateRequestDto req = RoyaltyCalculateRequestDto.builder()
                .totalRevenue(new BigDecimal("100000.00"))
                .adminExpense(BigDecimal.ZERO)
                .build();

        // Calculate and finalize
        mockMvc.perform(post("/api/v1/admin/royalty/periods/2026-09/calculate")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/admin/royalty/periods/2026-09/finalize")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());

        // Author stats
        mockMvc.perform(get("/api/v1/authors/me/stats")
                        .param("month", "2026-09")
                        .header("Authorization", authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorName", is("Мұхтар Әуезов")))
                .andExpect(jsonPath("$.totalMinutes", is(200)))
                .andExpect(jsonPath("$.periodStatus", is("paid")))
                .andExpect(jsonPath("$.dailyList", hasSize(30)));

        // Author earnings
        mockMvc.perform(get("/api/v1/authors/me/earnings")
                        .header("Authorization", authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$[0].authorId", is(authorEntity.getId())));
    }

    @Test
    @DisplayName("Author payout request validation, balance deduction, approval and rejection refund")
    void testPayoutFlow() throws Exception {
        // Give author 50,000 balance
        authorEntity.setBalance(new BigDecimal("50000.00"));
        authorRepository.save(authorEntity);

        // 1. Request payout exceeding balance -> 400 Bad Request
        PayoutRequestCreateDto excessive = PayoutRequestCreateDto.builder()
                .amount(new BigDecimal("60000.00"))
                .method("Kaspi Gold")
                .cardOrAccount("+77011234567")
                .build();

        mockMvc.perform(post("/api/v1/authors/me/payouts")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(excessive)))
                .andExpect(status().isBadRequest());

        // 2. Request valid payout: 20,000
        PayoutRequestCreateDto valid = PayoutRequestCreateDto.builder()
                .amount(new BigDecimal("20000.00"))
                .method("Kaspi Gold")
                .cardOrAccount("+77011234567")
                .build();

        String res = mockMvc.perform(post("/api/v1/authors/me/payouts")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(valid)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("REQUESTED")))
                .andExpect(jsonPath("$.amount", is(20000.0)))
                .andReturn().getResponse().getContentAsString();

        String payoutId = objectMapper.readTree(res).get("id").asText();

        // Author balance should now be 30,000
        Author afterRequest = authorRepository.findById(authorEntity.getId()).orElseThrow();
        assertEquals(new BigDecimal("30000.00"), afterRequest.getBalance());

        // 3. Admin rejects payout -> balance refunded back to 50,000
        PayoutRejectRequestDto rejectReq = PayoutRejectRequestDto.builder()
                .reason("Қате карта нөмірі")
                .build();

        mockMvc.perform(patch("/api/v1/admin/payouts/" + payoutId + "/reject")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("REJECTED")))
                .andExpect(jsonPath("$.rejectionReason", is("Қате карта нөмірі")));

        Author afterReject = authorRepository.findById(authorEntity.getId()).orElseThrow();
        assertEquals(new BigDecimal("50000.00"), afterReject.getBalance());

        // 4. Request again and Admin approves
        res = mockMvc.perform(post("/api/v1/authors/me/payouts")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(valid)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String newPayoutId = objectMapper.readTree(res).get("id").asText();

        mockMvc.perform(patch("/api/v1/admin/payouts/" + newPayoutId + "/approve")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")));

        // Author payouts list
        mockMvc.perform(get("/api/v1/authors/me/payouts")
                        .header("Authorization", authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }
}
