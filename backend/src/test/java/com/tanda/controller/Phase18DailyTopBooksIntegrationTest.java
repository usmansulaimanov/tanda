package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.audio.StartAudioSessionRequestDto;
import com.tanda.entity.Book;
import com.tanda.entity.DailyTopBook;
import com.tanda.entity.User;
import com.tanda.repository.BookRepository;
import com.tanda.repository.DailyTopBookRepository;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import com.tanda.service.AudioAnalyticsService;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class Phase18DailyTopBooksIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private DailyTopBookRepository dailyTopBookRepository;

    @Autowired
    private AudioAnalyticsService audioAnalyticsService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User adminUser;
    private User readerUser;
    private String adminToken;
    private String readerToken;
    private List<Book> createdBooks;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.save(User.builder()
                .id("admin-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Admin Top")
                .email("admin-top-" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .role("admin")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        readerUser = userRepository.save(User.builder()
                .id("reader-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Reader Top")
                .email("reader-top-" + UUID.randomUUID().toString().substring(0, 6) + "@test.kz")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        adminToken = jwtTokenProvider.generateToken(adminUser);
        readerToken = jwtTokenProvider.generateToken(readerUser);

        createdBooks = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            Book b = bookRepository.save(Book.builder()
                    .id("bk-top-" + i + "-" + UUID.randomUUID().toString().substring(0, 4))
                    .title("Top Audio Book " + i)
                    .author("Author " + i)
                    .category("Әдебиет")
                    .hasAudio(true)
                    .audioDuration("20:00")
                    .audioUrl("https://example.com/audio/" + i + ".mp3")
                    .isArchived(false)
                    .createdAt(OffsetDateTime.now().minusHours(i))
                    .build());
            createdBooks.add(b);
        }
    }

    @Test
    @DisplayName("Daily Top 10: Snapshot calculation creates exactly 10 books in daily_top_books")
    void testCalculateDailyTopBooks() {
        audioAnalyticsService.calculateDailyTopBooks();

        LocalDate today = LocalDate.now(AudioAnalyticsService.KZ_ZONE);
        List<DailyTopBook> snapshot = dailyTopBookRepository.findBySnapshotDateOrderByRankAsc(today);

        assertNotNull(snapshot);
        assertEquals(10, snapshot.size());
        assertEquals(1, snapshot.get(0).getRank());
        assertEquals(10, snapshot.get(9).getRank());
    }

    @Test
    @DisplayName("Daily Top 10: GET /api/v1/books/top-audio returns exactly 10 books")
    void testGetTopAudioPublicEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/books/top-audio?limit=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(10)))
                .andExpect(jsonPath("$[0].rank", is(1)))
                .andExpect(jsonPath("$[9].rank", is(10)));
    }

    @Test
    @DisplayName("Daily Top 10: Archived books excluded from top audio leaderboard")
    void testArchivedBooksExcludedFromTopAudio() throws Exception {
        // Archive the first 3 books
        Book book1 = createdBooks.get(0);
        book1.setIsArchived(true);
        bookRepository.save(book1);

        mockMvc.perform(get("/api/v1/books/top-audio?limit=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(10)))
                .andExpect(jsonPath("$[?(@.book.id == '" + book1.getId() + "')]").doesNotExist());
    }

    @Test
    @DisplayName("Daily Top 10: Admin can trigger recalculation via POST /api/v1/admin/analytics/audio/calculate-top-daily")
    void testAdminRecalculateEndpoint() throws Exception {
        mockMvc.perform(post("/api/v1/admin/analytics/audio/calculate-top-daily")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // Reader cannot trigger recalculation (403 Forbidden)
        mockMvc.perform(post("/api/v1/admin/analytics/audio/calculate-top-daily")
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isForbidden());
    }
}
