package com.tanda;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.CreateBookRequestDto;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.dto.auth.RegisterRequestDto;
import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.dto.user.UpdateUserRequestDto;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.repository.BookRepository;
import com.tanda.repository.ReadingProgressRepository;
import com.tanda.repository.SavedBookRepository;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public class ChallengerTier5AdversarialVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private SavedBookRepository savedBookRepository;

    @Autowired
    private ReadingProgressRepository progressRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User adminUser;
    private User clientUser;
    private Book testBook;
    private String adminToken;
    private String clientToken;

    private static final String TEST_BOOK_ID = "tier5-book-test-1";

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        savedBookRepository.deleteAll();
        progressRepository.deleteAll();

        // 1. Ensure active admin
        adminUser = userRepository.findByEmail("admin@tanda.kz").orElseGet(() -> {
            User a = User.builder()
                    .id("admin-t5-1")
                    .idNumber("000 001")
                    .name("Бас Әкімші")
                    .email("admin@tanda.kz")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role("admin")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(a);
        });
        adminUser.setName("Бас Әкімші");
        adminUser.setIsActive(true);
        adminUser.setRole("admin");
        adminUser = userRepository.save(adminUser);

        // 2. Ensure active client
        clientUser = userRepository.findByEmail("client_tier5_test@tanda.kz").orElseGet(() -> {
            User c = User.builder()
                    .id("client-t5-user-1")
                    .idNumber("990 005")
                    .name("Тест Клиент Т5")
                    .email("client_tier5_test@tanda.kz")
                    .passwordHash(passwordEncoder.encode("client123"))
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(c);
        });
        clientUser.setIsActive(true);
        clientUser.setRole("client");
        clientUser = userRepository.save(clientUser);

        // 3. Ensure test book exists
        testBook = bookRepository.findById(TEST_BOOK_ID).orElseGet(() -> {
            Book b = Book.builder()
                    .id(TEST_BOOK_ID)
                    .title("Абай жолы — Мұхтар Әуезов")
                    .author("Мұхтар Әуезов")
                    .category("Тарих")
                    .pages(300)
                    .hasAudio(true)
                    .audioDuration("10 сағат")
                    .isFree(true)
                    .isArchived(false)
                    .createdAt(OffsetDateTime.now())
                    .audioChapters(new ArrayList<>())
                    .build();
            return bookRepository.save(b);
        });
        testBook.setIsArchived(false);
        testBook = bookRepository.save(testBook);

        adminToken = jwtTokenProvider.generateToken(adminUser);
        clientToken = jwtTokenProvider.generateToken(clientUser);
    }

    // =========================================================================
    // 1. Auth & Registration Adversarial Probes
    // =========================================================================
    @Nested
    @DisplayName("1. Auth & Registration Adversarial Probes")
    class AuthAndRegistrationAdversarialTests {

        @Test
        @DisplayName("1.1 Blocked (isActive=false) user login is rejected with HTTP 401 and 'Аккаунт бұғатталған'")
        void testBlockedInactiveUserLoginReturns401WithBlockedMessage() throws Exception {
            clientUser.setIsActive(false);
            userRepository.save(clientUser);

            LoginRequestDto request = LoginRequestDto.builder()
                    .email("client_tier5_test@tanda.kz")
                    .password("client123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message", containsString("Аккаунт бұғатталған")));
        }

        @Test
        @DisplayName("1.2 Duplicate email registration is rejected with HTTP 400 and 'Бұл email жүйеде тіркелген'")
        void testDuplicateEmailRegistrationReturns400() throws Exception {
            RegisterRequestDto request = RegisterRequestDto.builder()
                    .name("Қайталанған Қолданушы")
                    .email("admin@tanda.kz")
                    .password("secret123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", containsString("Бұл email жүйеде тіркелген")));
        }

        @Test
        @DisplayName("1.3 Case-insensitive duplicate email registration (ADMIN@tanda.kz) is rejected with HTTP 400")
        void testCaseInsensitiveEmailDeduplication() throws Exception {
            RegisterRequestDto request = RegisterRequestDto.builder()
                    .name("Басқа Әкімші")
                    .email("ADMIN@TANDA.KZ")
                    .password("secret123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", containsString("Бұл email жүйеде тіркелген")));
        }

        @Test
        @DisplayName("1.4 Registration trims leading/trailing whitespace in name correctly")
        void testRegistrationWithWhitespacePaddedName() throws Exception {
            String uniqueEmail = "trim_test_" + UUID.randomUUID().toString().substring(0, 8) + "@tanda.kz";
            RegisterRequestDto request = RegisterRequestDto.builder()
                    .name("   Сәкен Сейфуллин   ")
                    .email(uniqueEmail)
                    .password("password123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.user.name", is("Сәкен Сейфуллин")))
                    .andExpect(jsonPath("$.user.email", is(uniqueEmail)));
        }

        @Test
        @DisplayName("1.5 Registration with whitespace in email is rejected with HTTP 400 by @Email validation")
        void testRegistrationWithWhitespaceEmailFailsValidation() throws Exception {
            RegisterRequestDto request = RegisterRequestDto.builder()
                    .name("Сәкен Сейфуллин")
                    .email("   saken@tanda.kz   ")
                    .password("password123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)));
        }
    }

    // =========================================================================
    // 2. Book & Catalog Adversarial Probes
    // =========================================================================
    @Nested
    @DisplayName("2. Book & Catalog Adversarial Probes")
    class BookAndCatalogAdversarialTests {

        @Test
        @DisplayName("2.1 Creating book with duplicate ID returns HTTP 400 Bad Request")
        void testDuplicateBookIdCreationReturns400() throws Exception {
            CreateBookRequestDto duplicateDto = CreateBookRequestDto.builder()
                    .id(TEST_BOOK_ID)
                    .title("Қайталанған кітап")
                    .author("Автор")
                    .category("Тарих")
                    .pages(100)
                    .build();

            mockMvc.perform(post("/api/v1/books")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(duplicateDto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", containsString("already exists")));
        }

        @Test
        @DisplayName("2.2 SQL injection payloads in search query parameter are safely handled")
        void testSqlInjectionInBookSearchHandledSafely() throws Exception {
            String[] sqliPayloads = {
                    "' OR '1'='1",
                    "'; DROP TABLE books; --",
                    "admin'--",
                    "' UNION SELECT null, null, null --",
                    "%27%22"
            };

            for (String payload : sqliPayloads) {
                mockMvc.perform(get("/api/v1/books")
                                .param("search", payload)
                                .accept(MediaType.APPLICATION_JSON))
                        .andExpect(status().isOk());
            }

            // Verify books table was not damaged and still contains testBook
            assertThat(bookRepository.existsById(TEST_BOOK_ID)).isTrue();
        }

        @Test
        @DisplayName("2.3 Search with Kazakh Cyrillic characters (Ә, і, ң, ғ, ү, ұ, қ, ө, һ) works accurately")
        void testKazakhCyrillicSearchCharacters() throws Exception {
            // Search by author with Kazakh Cyrillic
            mockMvc.perform(get("/api/v1/books")
                            .param("search", "Әуезов")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                    .andExpect(jsonPath("$[0].author", containsString("Әуезов")));

            // Search by category with Kazakh Cyrillic
            mockMvc.perform(get("/api/v1/books")
                            .param("category", "Тарих")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                    .andExpect(jsonPath("$[0].category", is("Тарих")));
        }

        @Test
        @DisplayName("2.4 Toggle archive without body defaults to isArchived=true")
        void testBookToggleArchiveDefaultWhenBodyNull() throws Exception {
            mockMvc.perform(patch("/api/v1/books/" + TEST_BOOK_ID + "/archive")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isArchived", is(true)));

            Book updated = bookRepository.findById(TEST_BOOK_ID).orElseThrow();
            assertThat(updated.getIsArchived()).isTrue();
        }
    }

    // =========================================================================
    // 3. Saved Books & Progress Adversarial Probes
    // =========================================================================
    @Nested
    @DisplayName("3. Saved Books & Progress Adversarial Probes")
    class SavedBooksAndProgressAdversarialTests {

        @Test
        @DisplayName("3.1 Saving a non-existent book ID returns HTTP 404 Not Found")
        void testSaveNonExistentBookReturns404() throws Exception {
            mockMvc.perform(post("/api/v1/saved-books/non-existent-book-xyz-999")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status", is(404)));
        }

        @Test
        @DisplayName("3.2 Saving the same book twice is idempotent (returns 201 without throwing error)")
        void testIdempotentBookSavingDoesNotThrow() throws Exception {
            // First save
            mockMvc.perform(post("/api/v1/saved-books/" + TEST_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.saved", is(true)));

            // Second save (identical request)
            mockMvc.perform(post("/api/v1/saved-books/" + TEST_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.saved", is(true)));

            // DB has exactly 1 bookmark
            assertThat(savedBookRepository.findByUserIdOrderBySavedAtDesc(clientUser.getId())).hasSize(1);
        }

        @Test
        @DisplayName("3.3 Updating reading progress for a non-existent book returns HTTP 404 Not Found")
        void testUpdateProgressForNonExistentBookReturns404() throws Exception {
            ReadingProgressRequestDto dto = ReadingProgressRequestDto.builder()
                    .currentPage(10)
                    .currentAudioTime(60)
                    .build();

            mockMvc.perform(put("/api/v1/progress/non-existent-book-xyz-999")
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status", is(404)));
        }

        @Test
        @DisplayName("3.4 Removing an unsaved book returns HTTP 204 No Content (idempotent delete)")
        void testRemoveSavedBookForNonSavedBookIsIdempotent() throws Exception {
            mockMvc.perform(delete("/api/v1/saved-books/never-saved-book-id")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isNoContent());
        }
    }

    // =========================================================================
    // 4. User Admin Adversarial Probes
    // =========================================================================
    @Nested
    @DisplayName("4. User Admin Adversarial Probes")
    class UserAdminAdversarialTests {

        @Test
        @DisplayName("4.1 SQL injection payloads in user admin search are handled safely")
        void testSqlInjectionInUserSearchHandledSafely() throws Exception {
            String[] sqliPayloads = {
                    "' OR 1=1 --",
                    "admin'--",
                    "%' UNION SELECT 1,2,3 --"
            };

            for (String payload : sqliPayloads) {
                mockMvc.perform(get("/api/v1/admin/users")
                                .header("Authorization", "Bearer " + adminToken)
                                .param("search", payload))
                        .andExpect(status().isOk());
            }
        }

        @Test
        @DisplayName("4.2 Kazakh Cyrillic in user search returns matching user")
        void testKazakhCyrillicUserSearch() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", "Bearer " + adminToken)
                            .param("search", "Әкімші"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                    .andExpect(jsonPath("$[0].name", containsString("Әкімші")));
        }

        @Test
        @DisplayName("4.3 Patching user with unsupported role (not 'admin' or 'client') returns HTTP 400")
        void testUpdateUserInvalidRoleReturns400() throws Exception {
            UpdateUserRequestDto dto = UpdateUserRequestDto.builder()
                    .role("SUPERUSER")
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/" + clientUser.getId())
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", containsString("Role must be 'admin' or 'client'")));
        }
    }

    // =========================================================================
    // 5. Concurrency & Constraint Race Condition Resilience
    // =========================================================================
    @Nested
    @DisplayName("5. Concurrency & Constraint Race Condition Resilience")
    class ConcurrencyAndConstraintTests {

        @Test
        @DisplayName("5.1 Concurrent reading progress updates maintain single-row integrity per user and book")
        void testConcurrentDuplicateProgressUpdatesSurvivesRaceCondition() throws Exception {
            int threadCount = 10;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CountDownLatch readyLatch = new CountDownLatch(threadCount);
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threadCount);

            AtomicInteger successCount = new AtomicInteger(0);

            for (int i = 1; i <= threadCount; i++) {
                final int page = i;
                executor.submit(() -> {
                    readyLatch.countDown();
                    try {
                        startLatch.await();
                        ReadingProgressRequestDto dto = ReadingProgressRequestDto.builder()
                                .currentPage(page)
                                .currentAudioTime(page * 10)
                                .build();

                        mockMvc.perform(put("/api/v1/progress/" + TEST_BOOK_ID)
                                        .header("Authorization", "Bearer " + clientToken)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(dto)))
                                .andExpect(status().isOk());

                        successCount.incrementAndGet();
                    } catch (Exception e) {
                        // Handled
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }

            readyLatch.await();
            startLatch.countDown();
            doneLatch.await();
            executor.shutdown();

            assertThat(successCount.get()).isGreaterThan(0);

            // Verify database has exactly 1 reading progress record for (clientUser, testBook)
            var progressOpt = progressRepository.findByUserIdAndBookId(clientUser.getId(), TEST_BOOK_ID);
            assertThat(progressOpt).isPresent();
        }

        @Test
        @DisplayName("5.2 Concurrent saved books bookmarking maintains single-row integrity")
        void testConcurrentDuplicateSaveBookSurvivesRaceCondition() throws Exception {
            int threadCount = 10;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CountDownLatch readyLatch = new CountDownLatch(threadCount);
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threadCount);

            AtomicInteger successCount = new AtomicInteger(0);

            for (int i = 0; i < threadCount; i++) {
                executor.submit(() -> {
                    readyLatch.countDown();
                    try {
                        startLatch.await();
                        mockMvc.perform(post("/api/v1/saved-books/" + TEST_BOOK_ID)
                                        .header("Authorization", "Bearer " + clientToken))
                                .andExpect(status().isCreated());
                        successCount.incrementAndGet();
                    } catch (Exception e) {
                        // Handled
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }

            readyLatch.await();
            startLatch.countDown();
            doneLatch.await();
            executor.shutdown();

            assertThat(successCount.get()).isGreaterThan(0);

            // Verify database has exactly 1 saved book entry for (clientUser, testBook)
            boolean exists = savedBookRepository.existsByUserIdAndBookId(clientUser.getId(), TEST_BOOK_ID);
            assertThat(exists).isTrue();
            assertThat(savedBookRepository.findByUserIdOrderBySavedAtDesc(clientUser.getId())).hasSize(1);
        }
    }
}
