package com.tanda.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.CreateBookRequestDto;
import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.dto.progress.ReadingProgressResponseDto;
import com.tanda.entity.Book;
import com.tanda.repository.BookRepository;
import com.tanda.repository.ReadingProgressRepository;
import com.tanda.service.ReadingProgressService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class Phase2WarningVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private ReadingProgressRepository readingProgressRepository;

    @Autowired
    private ReadingProgressService readingProgressService;

    private Book sampleBook;

    @BeforeEach
    void setUp() {
        if (!bookRepository.existsById("phase2-test-book")) {
            sampleBook = bookRepository.save(Book.builder()
                    .id("phase2-test-book")
                    .title("Phase 2 Test Book")
                    .author("Author")
                    .category("Science")
                    .pages(200)
                    .isFree(true)
                    .isArchived(false)
                    .build());
        } else {
            sampleBook = bookRepository.findById("phase2-test-book").orElseThrow();
        }
    }

    @Test
    @DisplayName("2.2 Nosniff header (X-Content-Type-Options: nosniff) is present")
    void testNosniffHeaderPresent() throws Exception {
        mockMvc.perform(get("/api/v1/books"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    @DisplayName("2.1 CORS preflight request respects configured allowed origins")
    void testCorsConfiguredOrigins() throws Exception {
        mockMvc.perform(options("/api/v1/books")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
    }

    @Test
    @DisplayName("2.3 Book pagination: GET /api/v1/books returns Page structure with page & size")
    void testBookPagination() throws Exception {
        mockMvc.perform(get("/api/v1/books")
                        .param("page", "0")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.size", is(5)))
                .andExpect(jsonPath("$.number", is(0)))
                .andExpect(jsonPath("$.totalElements").isNumber());
    }

    @Test
    @WithMockUser(username = "client@tanda.kz", roles = {"CLIENT"})
    @DisplayName("2.4 BookController @PreAuthorize blocks non-admin mutation operations (403 Forbidden)")
    void testBookMutationsForbiddenForClient() throws Exception {
        CreateBookRequestDto createDto = CreateBookRequestDto.builder()
                .id("forbidden-book-" + UUID.randomUUID())
                .title("Forbidden Title")
                .author("Author")
                .category("Classic")
                .pages(100)
                .build();

        // 1. POST
        mockMvc.perform(post("/api/v1/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isForbidden());

        // 2. PUT
        mockMvc.perform(put("/api/v1/books/phase2-test-book")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isForbidden());

        // 3. PATCH
        mockMvc.perform(patch("/api/v1/books/phase2-test-book/archive")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isArchived\": true}"))
                .andExpect(status().isForbidden());

        // 4. DELETE
        mockMvc.perform(delete("/api/v1/books/phase2-test-book"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("2.5 ReadingProgressService handles concurrent create race condition gracefully")
    void testConcurrentReadingProgressUpdates() throws InterruptedException {
        String testUserId = "user-concurrent-" + UUID.randomUUID().toString().substring(0, 8);
        String bookId = sampleBook.getId();

        int threadCount = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int page = i + 1;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    ReadingProgressRequestDto dto = ReadingProgressRequestDto.builder()
                            .currentPage(page)
                            .currentAudioTime(page * 10)
                            .build();
                    readingProgressService.updateProgress(testUserId, bookId, dto);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    // Log or handle
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        finishLatch.await();
        executor.shutdown();

        assertThat(successCount.get()).isEqualTo(threadCount);

        ReadingProgressResponseDto finalProgress = readingProgressService.getProgress(testUserId, bookId);
        assertThat(finalProgress).isNotNull();
        assertThat(finalProgress.getUserId()).isEqualTo(testUserId);
        assertThat(finalProgress.getBookId()).isEqualTo(bookId);
    }
}
