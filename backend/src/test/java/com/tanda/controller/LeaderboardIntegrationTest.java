package com.tanda.controller;

import com.tanda.entity.AudioSession;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.repository.AudioSessionRepository;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class LeaderboardIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private AudioSessionRepository audioSessionRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User user1;
    private User user2;
    private User adminUser;
    private Book testBook;
    private String user1Token;
    private String adminToken;

    @BeforeEach
    void setUp() {
        audioSessionRepository.deleteAll();

        adminUser = userRepository.save(User.builder()
                .id(UUID.randomUUID().toString())
                .name("Admin User")
                .email("admin_lead_" + UUID.randomUUID() + "@tanda.kz")
                .role("admin")
                .isActive(true)
                .build());

        user1 = userRepository.save(User.builder()
                .id(UUID.randomUUID().toString())
                .name("Sherkhan Reader")
                .email("sherkhan_" + UUID.randomUUID() + "@tanda.kz")
                .role("client")
                .isActive(true)
                .build());

        user2 = userRepository.save(User.builder()
                .id(UUID.randomUUID().toString())
                .name("Asylkhan Reader")
                .email("asylkhan_" + UUID.randomUUID() + "@tanda.kz")
                .role("client")
                .isActive(true)
                .build());

        testBook = bookRepository.save(Book.builder()
                .id(UUID.randomUUID().toString())
                .title("Leaderboard Test Book")
                .author("Test Author")
                .category("Business")
                .hasAudio(true)
                .build());

        user1Token = jwtTokenProvider.generateToken(user1);
        adminToken = jwtTokenProvider.generateToken(adminUser);

        // Create audio sessions
        // user1: 1800 valid seconds (30 mins)
        audioSessionRepository.save(AudioSession.builder()
                .id(UUID.randomUUID().toString())
                .userId(user1.getId())
                .book(testBook)
                .startedAt(OffsetDateTime.now().minusHours(2))
                .lastHeartbeatAt(OffsetDateTime.now().minusHours(1))
                .validSeconds(1800)
                .build());

        // user2: 3600 valid seconds (60 mins) -> should be rank 1
        audioSessionRepository.save(AudioSession.builder()
                .id(UUID.randomUUID().toString())
                .userId(user2.getId())
                .book(testBook)
                .startedAt(OffsetDateTime.now().minusHours(3))
                .lastHeartbeatAt(OffsetDateTime.now().minusHours(2))
                .validSeconds(3600)
                .build());
    }

    @Test
    @DisplayName("Public user can fetch leaderboard without token")
    void testPublicLeaderboard() throws Exception {
        mockMvc.perform(get("/api/v1/leaderboard")
                        .param("period", "THIS_WEEK")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topEntries", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$.topEntries[0].fullName", is("Asylkhan Reader")))
                .andExpect(jsonPath("$.topEntries[0].rank", is(1)))
                .andExpect(jsonPath("$.topEntries[0].periodMinutes", is(60)))
                .andExpect(jsonPath("$.topEntries[1].fullName", is("Sherkhan Reader")))
                .andExpect(jsonPath("$.topEntries[1].rank", is(2)))
                .andExpect(jsonPath("$.topEntries[0].email").doesNotExist()); // Email hidden from public
    }

    @Test
    @DisplayName("Authenticated user gets their currentUserEntry populated")
    void testAuthenticatedLeaderboard() throws Exception {
        mockMvc.perform(get("/api/v1/leaderboard")
                        .header("Authorization", "Bearer " + user1Token)
                        .param("period", "THIS_WEEK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentUserEntry", notNullValue()))
                .andExpect(jsonPath("$.currentUserEntry.userId", is(user1.getId())))
                .andExpect(jsonPath("$.currentUserEntry.rank", is(2)))
                .andExpect(jsonPath("$.currentUserEntry.periodMinutes", is(30)));
    }

    @Test
    @DisplayName("Personal stats endpoint returns correct aggregations and 14-day activity")
    void testPersonalStats() throws Exception {
        mockMvc.perform(get("/api/v1/leaderboard/personal")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId", is(user1.getId())))
                .andExpect(jsonPath("$.todayMinutes", is(30)))
                .andExpect(jsonPath("$.dailyActivity", hasSize(14)));
    }

    @Test
    @DisplayName("Admin endpoint returns emails for certificate distribution")
    void testAdminLeaderboard() throws Exception {
        mockMvc.perform(get("/api/v1/leaderboard/admin")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("period", "THIS_WEEK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topEntries[0].email", notNullValue()));
    }
}
