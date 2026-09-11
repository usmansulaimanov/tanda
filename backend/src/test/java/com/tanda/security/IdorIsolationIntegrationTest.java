package com.tanda.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.dto.user.UpdateUserRequestDto;
import com.tanda.entity.Book;
import com.tanda.entity.ReadingProgress;
import com.tanda.entity.SavedBook;
import com.tanda.entity.User;
import com.tanda.repository.BookRepository;
import com.tanda.repository.ReadingProgressRepository;
import com.tanda.repository.SavedBookRepository;
import com.tanda.repository.UserRepository;
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
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
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
public class IdorIsolationIntegrationTest {

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
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User userA;
    private User userB;
    private String tokenA;
    private String tokenB;

    private Book book1;
    private Book book2;

    private static final String USER_A_ID = "user-a-idor-tenant-id";
    private static final String USER_B_ID = "user-b-idor-tenant-id";
    private static final String BOOK_1_ID = "book-idor-test-1";
    private static final String BOOK_2_ID = "book-idor-test-2";

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        savedBookRepository.deleteAll();
        progressRepository.deleteAll();

        // 1. Seed or retrieve User A
        userA = userRepository.findById(USER_A_ID).orElseGet(() -> {
            User u = User.builder()
                    .id(USER_A_ID)
                    .idNumber("700 001")
                    .name("User Alpha")
                    .email("usera@tanda.kz")
                    .passwordHash(passwordEncoder.encode("passwordA123"))
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(u);
        });
        userA.setName("User Alpha");
        userA.setEmail("usera@tanda.kz");
        userA.setRole("client");
        userA.setIsActive(true);
        userA = userRepository.save(userA);

        // 2. Seed or retrieve User B
        userB = userRepository.findById(USER_B_ID).orElseGet(() -> {
            User u = User.builder()
                    .id(USER_B_ID)
                    .idNumber("700 002")
                    .name("User Beta")
                    .email("userb@tanda.kz")
                    .passwordHash(passwordEncoder.encode("passwordB123"))
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(u);
        });
        userB.setName("User Beta");
        userB.setEmail("userb@tanda.kz");
        userB.setRole("client");
        userB.setIsActive(true);
        userB = userRepository.save(userB);

        // 3. Seed books
        book1 = bookRepository.findById(BOOK_1_ID).orElseGet(() -> {
            Book b = Book.builder()
                    .id(BOOK_1_ID)
                    .title("ИДОР Тест Кітап 1")
                    .author("Автор 1")
                    .category("Классика")
                    .pages(120)
                    .hasAudio(true)
                    .audioUrl("https://tanda.kz/audio/1.mp3")
                    .isFree(true)
                    .isArchived(false)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return bookRepository.save(b);
        });

        book2 = bookRepository.findById(BOOK_2_ID).orElseGet(() -> {
            Book b = Book.builder()
                    .id(BOOK_2_ID)
                    .title("ИДОР Тест Кітап 2")
                    .author("Автор 2")
                    .category("Тарих")
                    .pages(200)
                    .hasAudio(false)
                    .isFree(true)
                    .isArchived(false)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return bookRepository.save(b);
        });

        // 4. Generate Bearer tokens
        tokenA = jwtTokenProvider.generateToken(userA);
        tokenB = jwtTokenProvider.generateToken(userB);
    }

    // =========================================================================
    // 1. SAVED BOOKS IDOR ISOLATION
    // =========================================================================
    @Nested
    @DisplayName("Saved Books IDOR & Row-Level Data Isolation")
    class SavedBooksIdorTests {

        @Test
        @DisplayName("1.1 User A saves Book 1 -> User B gets 0 saved books; User B deletion does not remove User A's bookmark")
        void testSavedBooksIsolationBetweenAAndB() throws Exception {
            // User A saves Book 1
            mockMvc.perform(post("/api/v1/saved-books/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.saved", is(true)));

            // User B queries saved books -> must receive 0 saved books
            mockMvc.perform(get("/api/v1/saved-books")
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bookIds", hasSize(0)))
                    .andExpect(jsonPath("$.books", hasSize(0)));

            // Dual prefix parity: unversioned /api/saved-books for User B
            mockMvc.perform(get("/api/saved-books")
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bookIds", hasSize(0)));

            // User B attempts to DELETE User A's saved book via /api/saved-books/{bookId}
            mockMvc.perform(delete("/api/v1/saved-books/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isNoContent());

            // User A queries saved books -> User A's bookmark must remain intact!
            mockMvc.perform(get("/api/v1/saved-books")
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bookIds", hasSize(1)))
                    .andExpect(jsonPath("$.bookIds[0]", is(BOOK_1_ID)));

            // Direct database check: User A's SavedBook record still exists in DB
            List<SavedBook> userASaved = savedBookRepository.findByUserIdOrderBySavedAtDesc(userA.getId());
            assertThat(userASaved).hasSize(1);
            assertThat(userASaved.get(0).getBook().getId()).isEqualTo(BOOK_1_ID);

            List<SavedBook> userBSaved = savedBookRepository.findByUserIdOrderBySavedAtDesc(userB.getId());
            assertThat(userBSaved).isEmpty();
        }

        @Test
        @DisplayName("1.2 Symmetrical Saved Books: User B saves Book 2; User A deletion does not remove User B's bookmark")
        void testSymmetricalSavedBooksIsolation() throws Exception {
            // User B saves Book 2
            mockMvc.perform(post("/api/saved-books/" + BOOK_2_ID)
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isCreated());

            // User A queries -> receives 0 saved books
            mockMvc.perform(get("/api/saved-books")
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bookIds", hasSize(0)));

            // User A attempts to delete Book 2
            mockMvc.perform(delete("/api/saved-books/" + BOOK_2_ID)
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isNoContent());

            // User B queries -> Book 2 remains saved for User B
            mockMvc.perform(get("/api/saved-books")
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bookIds", hasSize(1)))
                    .andExpect(jsonPath("$.bookIds[0]", is(BOOK_2_ID)));
        }

        @Test
        @DisplayName("1.3 Co-existent Bookmarks: Both users save same Book 1; deleting for User A leaves User B's bookmark intact")
        void testBothUsersSaveSameBookAndIndependentDeletion() throws Exception {
            // Both save Book 1
            mockMvc.perform(post("/api/v1/saved-books/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isCreated());

            mockMvc.perform(post("/api/v1/saved-books/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isCreated());

            // User A deletes Book 1
            mockMvc.perform(delete("/api/v1/saved-books/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isNoContent());

            // User A now has 0 saved books
            mockMvc.perform(get("/api/v1/saved-books")
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bookIds", hasSize(0)));

            // User B STILL has Book 1 saved
            mockMvc.perform(get("/api/v1/saved-books")
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bookIds", hasSize(1)))
                    .andExpect(jsonPath("$.bookIds[0]", is(BOOK_1_ID)));

            // Verify database rows
            assertThat(savedBookRepository.existsByUserIdAndBookId(userA.getId(), BOOK_1_ID)).isFalse();
            assertThat(savedBookRepository.existsByUserIdAndBookId(userB.getId(), BOOK_1_ID)).isTrue();
        }
    }

    // =========================================================================
    // 2. READING PROGRESS IDOR ISOLATION
    // =========================================================================
    @Nested
    @DisplayName("Reading Progress IDOR & Row-Level Data Isolation")
    class ReadingProgressIdorTests {

        @Test
        @DisplayName("2.1 User A reads to page 50, 300s -> User B receives default (page 1, audio 0); User B updates to page 5, 20s -> User A remains page 50, 300s")
        void testReadingProgressIsolationBetweenUsers() throws Exception {
            // User A updates progress on Book 1 to page 50, audio 300s
            ReadingProgressRequestDto progressA = ReadingProgressRequestDto.builder()
                    .currentPage(50)
                    .currentAudioTime(300)
                    .build();

            mockMvc.perform(put("/api/v1/progress/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(progressA)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(50)))
                    .andExpect(jsonPath("$.currentAudioTime", is(300)));

            // User B queries progress for Book 1 -> must receive default: page 1, audio 0
            mockMvc.perform(get("/api/v1/progress/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(1)))
                    .andExpect(jsonPath("$.currentAudioTime", is(0)));

            // Dual prefix parity unversioned /api/progress for User B
            mockMvc.perform(get("/api/progress/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(1)))
                    .andExpect(jsonPath("$.currentAudioTime", is(0)));

            // User B updates their progress on Book 1 to page 5, audio 20s
            ReadingProgressRequestDto progressB = ReadingProgressRequestDto.builder()
                    .currentPage(5)
                    .currentAudioTime(20)
                    .build();

            mockMvc.perform(put("/api/v1/progress/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenB)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(progressB)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(5)))
                    .andExpect(jsonPath("$.currentAudioTime", is(20)));

            // User B queries progress -> receives page 5, audio 20s
            mockMvc.perform(get("/api/v1/progress/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(5)))
                    .andExpect(jsonPath("$.currentAudioTime", is(20)));

            // User A queries progress -> STILL receives page 50, audio 300s!
            mockMvc.perform(get("/api/v1/progress/" + BOOK_1_ID)
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(50)))
                    .andExpect(jsonPath("$.currentAudioTime", is(300)));

            // Direct database assertion on independent rows
            ReadingProgress dbProgressA = progressRepository.findByUserIdAndBookId(userA.getId(), BOOK_1_ID).orElseThrow();
            ReadingProgress dbProgressB = progressRepository.findByUserIdAndBookId(userB.getId(), BOOK_1_ID).orElseThrow();

            assertThat(dbProgressA.getCurrentPage()).isEqualTo(50);
            assertThat(dbProgressA.getCurrentAudioTime()).isEqualTo(300);

            assertThat(dbProgressB.getCurrentPage()).isEqualTo(5);
            assertThat(dbProgressB.getCurrentAudioTime()).isEqualTo(20);

            assertThat(dbProgressA.getId()).isNotEqualTo(dbProgressB.getId());
        }

        @Test
        @DisplayName("2.2 Reading progress unversioned routes preserve data isolation")
        void testReadingProgressUnversionedRoutesIsolation() throws Exception {
            ReadingProgressRequestDto progressA = ReadingProgressRequestDto.builder()
                    .currentPage(77)
                    .currentAudioTime(150)
                    .build();

            mockMvc.perform(put("/api/progress/" + BOOK_2_ID)
                            .header("Authorization", "Bearer " + tokenA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(progressA)))
                    .andExpect(status().isOk());

            // User B sees default
            mockMvc.perform(get("/api/progress/" + BOOK_2_ID)
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(1)))
                    .andExpect(jsonPath("$.currentAudioTime", is(0)));
        }
    }

    // =========================================================================
    // 3. PROFILE & IDENTITY IDOR ISOLATION
    // =========================================================================
    @Nested
    @DisplayName("Profile & Identity IDOR Isolation")
    class ProfileIdorTests {

        @Test
        @DisplayName("3.1 User A attempts to view User B's profile via /api/admin/users/{userBId} -> strictly 403 Forbidden")
        void testUserACannotViewUserBProfile() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users/" + userB.getId())
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isForbidden());

            mockMvc.perform(get("/api/admin/users/" + userB.getId())
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("3.2 User A attempts to patch User B's profile -> strictly 403 Forbidden")
        void testUserACannotPatchUserBProfile() throws Exception {
            UpdateUserRequestDto patchDto = UpdateUserRequestDto.builder()
                    .name("Hacked By User A")
                    .role("admin")
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/" + userB.getId())
                            .header("Authorization", "Bearer " + tokenA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(patchDto)))
                    .andExpect(status().isForbidden());

            mockMvc.perform(patch("/api/admin/users/" + userB.getId())
                            .header("Authorization", "Bearer " + tokenA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(patchDto)))
                    .andExpect(status().isForbidden());

            // Verify User B's profile in database is completely intact
            User userBInDb = userRepository.findById(userB.getId()).orElseThrow();
            assertThat(userBInDb.getName()).isEqualTo("User Beta");
            assertThat(userBInDb.getRole()).isEqualTo("client");
        }

        @Test
        @DisplayName("3.3 User A attempts to delete User B's profile -> strictly 403 Forbidden")
        void testUserACannotDeleteUserBProfile() throws Exception {
            mockMvc.perform(delete("/api/v1/admin/users/" + userB.getId())
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isForbidden());

            mockMvc.perform(delete("/api/admin/users/" + userB.getId())
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isForbidden());

            // Verify User B still exists in database
            assertThat(userRepository.existsById(userB.getId())).isTrue();
        }

        @Test
        @DisplayName("3.4 Symmetrical: User B cannot view, patch, or delete User A's profile (403 Forbidden)")
        void testUserBCannotMutateUserAProfile() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users/" + userA.getId())
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isForbidden());

            mockMvc.perform(patch("/api/v1/admin/users/" + userA.getId())
                            .header("Authorization", "Bearer " + tokenB)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\": \"Hacked\"}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(delete("/api/v1/admin/users/" + userA.getId())
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isForbidden());

            assertThat(userRepository.existsById(userA.getId())).isTrue();
        }

        @Test
        @DisplayName("3.5 /api/auth/me strictly scopes to authenticated principal (User A gets A, User B gets B)")
        void testAuthMePrincipalStrictlyScoped() throws Exception {
            mockMvc.perform(get("/api/v1/auth/me")
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(userA.getId())))
                    .andExpect(jsonPath("$.email", is("usera@tanda.kz")))
                    .andExpect(jsonPath("$.name", is("User Alpha")));

            mockMvc.perform(get("/api/v1/auth/me")
                            .header("Authorization", "Bearer " + tokenB))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(userB.getId())))
                    .andExpect(jsonPath("$.email", is("userb@tanda.kz")))
                    .andExpect(jsonPath("$.name", is("User Beta")));

            // Unversioned route check
            mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + tokenA))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email", is("usera@tanda.kz")));
        }
    }
}
