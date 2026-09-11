package com.tanda.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.CreateBookRequestDto;
import com.tanda.dto.UpdateBookRequestDto;
import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.dto.user.UpdateUserRequestDto;
import com.tanda.entity.Book;
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
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
public class SecurityRbacMatrixIntegrationTest {

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

    private User adminUser;
    private User clientUser;
    private Book testBook;

    private String adminToken;
    private String clientToken;

    private static final String RBAC_BOOK_ID = "book-rbac-test-1";

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        savedBookRepository.deleteAll();
        progressRepository.deleteAll();

        // 1. Ensure active admin user
        adminUser = userRepository.findByEmail("admin@tanda.kz").orElseGet(() -> {
            User a = User.builder()
                    .id("admin-rbac-1")
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
        adminUser.setIsActive(true);
        adminUser.setRole("admin");
        adminUser = userRepository.save(adminUser);

        // 2. Ensure active client user
        clientUser = userRepository.findByEmail("client_rbac_test@tanda.kz").orElseGet(() -> {
            User c = User.builder()
                    .id("client-rbac-user-1")
                    .idNumber("990 001")
                    .name("Тест Клиент")
                    .email("client_rbac_test@tanda.kz")
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
        testBook = bookRepository.findById(RBAC_BOOK_ID).orElseGet(() -> {
            Book b = Book.builder()
                    .id(RBAC_BOOK_ID)
                    .title("RBAC Тест кітабы")
                    .author("Автор")
                    .category("Классика")
                    .pages(100)
                    .hasAudio(false)
                    .isFree(true)
                    .isArchived(false)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return bookRepository.save(b);
        });
        testBook.setIsArchived(false);
        testBook = bookRepository.save(testBook);

        // Generate Bearer tokens
        adminToken = jwtTokenProvider.generateToken(adminUser);
        clientToken = jwtTokenProvider.generateToken(clientUser);
    }

    // =========================================================================
    // 1. UNAUTHENTICATED (ANONYMOUS) ACTOR MATRIX
    // =========================================================================
    @Nested
    @DisplayName("Actor 1: Unauthenticated (Anonymous)")
    class UnauthenticatedActorTests {

        // --- 1.1 Public Endpoints ---
        @Test
        @DisplayName("1.1.1 Public: GET /api/books and /api/v1/books succeed (200 OK)")
        void testPublicBooksSucceed() throws Exception {
            mockMvc.perform(get("/api/books")).andExpect(status().isOk());
            mockMvc.perform(get("/api/v1/books")).andExpect(status().isOk());
        }

        @Test
        @DisplayName("1.1.2 Public: GET /api/books/{id} and /api/v1/books/{id} succeed (200 OK)")
        void testPublicBookByIdSucceed() throws Exception {
            mockMvc.perform(get("/api/books/" + RBAC_BOOK_ID)).andExpect(status().isOk());
            mockMvc.perform(get("/api/v1/books/" + RBAC_BOOK_ID)).andExpect(status().isOk());
        }

        @Test
        @DisplayName("1.1.3 Public: POST /api/auth/login and /api/v1/auth/login are accessible (400 on empty body, not 401)")
        void testPublicLoginAccessible() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("1.1.4 Public: POST /api/auth/register and /api/v1/auth/register are accessible (400 on empty body, not 401)")
        void testPublicRegisterAccessible() throws Exception {
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("1.1.5 Public: POST /api/auth/logout and /api/v1/auth/logout succeed (200 OK)")
        void testPublicLogoutSucceed() throws Exception {
            mockMvc.perform(post("/api/auth/logout")).andExpect(status().isOk());
            mockMvc.perform(post("/api/v1/auth/logout")).andExpect(status().isOk());
        }

        // --- 1.2 Protected User Endpoints (Must return 401 Unauthorized) ---
        @Test
        @DisplayName("1.2.1 Protected user: GET /api/auth/me and /api/v1/auth/me return 401")
        void testAuthMeUnauthorized() throws Exception {
            mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("1.2.2 Protected user: Saved books routes return 401")
        void testSavedBooksUnauthorized() throws Exception {
            mockMvc.perform(get("/api/saved-books")).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/v1/saved-books")).andExpect(status().isUnauthorized());

            mockMvc.perform(post("/api/saved-books/" + RBAC_BOOK_ID)).andExpect(status().isUnauthorized());
            mockMvc.perform(post("/api/v1/saved-books/" + RBAC_BOOK_ID)).andExpect(status().isUnauthorized());

            mockMvc.perform(delete("/api/saved-books/" + RBAC_BOOK_ID)).andExpect(status().isUnauthorized());
            mockMvc.perform(delete("/api/v1/saved-books/" + RBAC_BOOK_ID)).andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("1.2.3 Protected user: Reading progress routes return 401")
        void testProgressUnauthorized() throws Exception {
            mockMvc.perform(get("/api/progress/" + RBAC_BOOK_ID)).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/v1/progress/" + RBAC_BOOK_ID)).andExpect(status().isUnauthorized());

            mockMvc.perform(put("/api/progress/" + RBAC_BOOK_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPage\": 5}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(put("/api/v1/progress/" + RBAC_BOOK_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPage\": 5}"))
                    .andExpect(status().isUnauthorized());
        }

        // --- 1.3 Admin Endpoints (Must return 401 Unauthorized) ---
        @Test
        @DisplayName("1.3.1 Admin: Book mutate routes return 401")
        void testBookMutationsUnauthorized() throws Exception {
            mockMvc.perform(post("/api/books")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(post("/api/v1/books")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(put("/api/books/" + RBAC_BOOK_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(put("/api/v1/books/" + RBAC_BOOK_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(patch("/api/books/" + RBAC_BOOK_ID + "/archive"))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(patch("/api/v1/books/" + RBAC_BOOK_ID + "/archive"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(delete("/api/books/" + RBAC_BOOK_ID))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(delete("/api/v1/books/" + RBAC_BOOK_ID))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("1.3.2 Admin: User admin routes return 401")
        void testUserAdminUnauthorized() throws Exception {
            mockMvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());

            mockMvc.perform(get("/api/admin/users/" + clientUser.getId())).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/v1/admin/users/" + clientUser.getId())).andExpect(status().isUnauthorized());

            mockMvc.perform(patch("/api/admin/users/" + clientUser.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(patch("/api/v1/admin/users/" + clientUser.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(delete("/api/admin/users/" + clientUser.getId()))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(delete("/api/v1/admin/users/" + clientUser.getId()))
                    .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // 2. AUTHENTICATED CLIENT (ROLE_CLIENT) ACTOR MATRIX
    // =========================================================================
    @Nested
    @DisplayName("Actor 2: Authenticated Client (ROLE_CLIENT)")
    class AuthenticatedClientActorTests {

        // --- 2.1 Public Endpoints ---
        @Test
        @DisplayName("2.1 Public endpoints succeed for client")
        void testPublicBooksSucceedForClient() throws Exception {
            mockMvc.perform(get("/api/books")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/v1/books")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/v1/books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk());
        }

        // --- 2.2 Protected User Endpoints (Must Succeed: 200/201/204) ---
        @Test
        @DisplayName("2.2.1 Protected user: GET /api/auth/me and /api/v1/auth/me succeed (200 OK)")
        void testAuthMeSucceedsForClient() throws Exception {
            mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email", is(clientUser.getEmail())))
                    .andExpect(jsonPath("$.role", is("client")));

            mockMvc.perform(get("/api/v1/auth/me")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email", is(clientUser.getEmail())));
        }

        @Test
        @DisplayName("2.2.2 Protected user: Saved books CRUD succeeds for client")
        void testSavedBooksSucceedsForClient() throws Exception {
            // Save book (POST) -> 201 Created
            mockMvc.perform(post("/api/saved-books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.saved", is(true)));

            // List saved books (GET) -> 200 OK
            mockMvc.perform(get("/api/saved-books")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bookIds[0]", is(RBAC_BOOK_ID)));

            // Dual prefix parity GET /api/v1/saved-books
            mockMvc.perform(get("/api/v1/saved-books")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bookIds[0]", is(RBAC_BOOK_ID)));

            // Delete saved book (DELETE) -> 204 No Content
            mockMvc.perform(delete("/api/saved-books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isNoContent());

            // Dual prefix parity POST /api/v1/saved-books/{id}
            mockMvc.perform(post("/api/v1/saved-books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isCreated());

            mockMvc.perform(delete("/api/v1/saved-books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("2.2.3 Protected user: Reading progress CRUD succeeds for client")
        void testProgressSucceedsForClient() throws Exception {
            ReadingProgressRequestDto progressDto = ReadingProgressRequestDto.builder()
                    .currentPage(15)
                    .currentAudioTime(60)
                    .build();

            // Update progress (PUT) -> 200 OK
            mockMvc.perform(put("/api/progress/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(progressDto)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(15)))
                    .andExpect(jsonPath("$.currentAudioTime", is(60)));

            // Query progress (GET) -> 200 OK
            mockMvc.perform(get("/api/progress/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(15)));

            // Dual prefix parity
            mockMvc.perform(get("/api/v1/progress/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(15)));
        }

        // --- 2.3 Admin-only Endpoints (Must return strictly 403 Forbidden) ---
        @Test
        @DisplayName("2.3.1 Admin-only: Book mutation routes strictly return 403 Forbidden for client")
        void testBookMutationsForbiddenForClient() throws Exception {
            mockMvc.perform(post("/api/books")
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(post("/api/v1/books")
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(put("/api/books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(put("/api/v1/books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(patch("/api/books/" + RBAC_BOOK_ID + "/archive")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());

            mockMvc.perform(patch("/api/v1/books/" + RBAC_BOOK_ID + "/archive")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());

            mockMvc.perform(delete("/api/books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());

            mockMvc.perform(delete("/api/v1/books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("2.3.2 Admin-only: User admin routes strictly return 403 Forbidden for client")
        void testUserAdminRoutesForbiddenForClient() throws Exception {
            mockMvc.perform(get("/api/admin/users")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());

            mockMvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());

            mockMvc.perform(get("/api/admin/users/" + clientUser.getId())
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());

            mockMvc.perform(get("/api/v1/admin/users/" + clientUser.getId())
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());

            mockMvc.perform(patch("/api/admin/users/" + clientUser.getId())
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(patch("/api/v1/admin/users/" + clientUser.getId())
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden());

            mockMvc.perform(delete("/api/admin/users/" + clientUser.getId())
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());

            mockMvc.perform(delete("/api/v1/admin/users/" + clientUser.getId())
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());
        }
    }

    // =========================================================================
    // 3. AUTHENTICATED ADMIN (ROLE_ADMIN) ACTOR MATRIX
    // =========================================================================
    @Nested
    @DisplayName("Actor 3: Authenticated Admin (ROLE_ADMIN)")
    class AuthenticatedAdminActorTests {

        // --- 3.1 Public & Protected User Endpoints succeed for admin ---
        @Test
        @DisplayName("3.1 Public books routes succeed for admin (200 OK)")
        void testPublicBooksSucceedForAdmin() throws Exception {
            mockMvc.perform(get("/api/books")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/v1/books")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("3.2 Protected user routes succeed for admin (200 OK)")
        void testProtectedUserRoutesSucceedForAdmin() throws Exception {
            mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email", is(adminUser.getEmail())))
                    .andExpect(jsonPath("$.role", is("admin")));

            mockMvc.perform(get("/api/v1/auth/me")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email", is(adminUser.getEmail())));

            mockMvc.perform(get("/api/saved-books")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/v1/saved-books")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/progress/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }

        // --- 3.2 Admin Endpoints succeed with 200/201/204 ---
        @Test
        @DisplayName("3.3 Admin: Book creation (POST) succeeds with 201 Created across both prefixes")
        void testBookCreationSucceedsForAdmin() throws Exception {
            String newBookId1 = "admin-created-book-1-" + UUID.randomUUID().toString().substring(0, 8);
            CreateBookRequestDto dto1 = CreateBookRequestDto.builder()
                    .id(newBookId1)
                    .title("Әкімші кітабы 1")
                    .author("Автор 1")
                    .category("Бизнес")
                    .pages(120)
                    .build();

            mockMvc.perform(post("/api/books")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto1)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", is(newBookId1)));

            String newBookId2 = "admin-created-book-2-" + UUID.randomUUID().toString().substring(0, 8);
            CreateBookRequestDto dto2 = CreateBookRequestDto.builder()
                    .id(newBookId2)
                    .title("Әкімші кітабы 2")
                    .author("Автор 2")
                    .category("Тарих")
                    .pages(180)
                    .build();

            mockMvc.perform(post("/api/v1/books")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto2)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", is(newBookId2)));
        }

        @Test
        @DisplayName("3.4 Admin: Book update (PUT) succeeds with 200 OK")
        void testBookUpdateSucceedsForAdmin() throws Exception {
            UpdateBookRequestDto updateDto = UpdateBookRequestDto.builder()
                    .title("Жаңартылған RBAC кітабы")
                    .author("Автор")
                    .category("Классика")
                    .pages(110)
                    .build();

            mockMvc.perform(put("/api/v1/books/" + RBAC_BOOK_ID)
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateDto)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title", is("Жаңартылған RBAC кітабы")));
        }

        @Test
        @DisplayName("3.5 Admin: Book archive toggle (PATCH) succeeds with 200 OK")
        void testBookArchiveToggleSucceedsForAdmin() throws Exception {
            mockMvc.perform(patch("/api/v1/books/" + RBAC_BOOK_ID + "/archive")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("isArchived", true))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isArchived", is(true)));

            // Restore
            mockMvc.perform(patch("/api/books/" + RBAC_BOOK_ID + "/archive")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("isArchived", false))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isArchived", is(false)));
        }

        @Test
        @DisplayName("3.6 Admin: Book deletion (DELETE) succeeds with 204 No Content")
        void testBookDeleteSucceedsForAdmin() throws Exception {
            String bookToDeleteId = "book-to-delete-" + UUID.randomUUID().toString().substring(0, 8);
            bookRepository.save(Book.builder()
                    .id(bookToDeleteId)
                    .title("Өшетін кітап")
                    .author("Автор")
                    .category("Классика")
                    .pages(50)
                    .build());

            mockMvc.perform(delete("/api/v1/books/" + bookToDeleteId)
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isNoContent());

            assertThat(bookRepository.existsById(bookToDeleteId)).isFalse();
        }

        @Test
        @DisplayName("3.7 Admin: User admin routes (GET, PATCH, DELETE) succeed across both prefixes")
        void testUserAdminRoutesSucceedForAdmin() throws Exception {
            // GET /api/v1/admin/users -> 200
            mockMvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());

            // GET /api/admin/users -> 200
            mockMvc.perform(get("/api/admin/users")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());

            // GET /api/v1/admin/users/{id} -> 200
            mockMvc.perform(get("/api/v1/admin/users/" + clientUser.getId())
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(clientUser.getId())));

            // PATCH /api/v1/admin/users/{id} -> 200
            UpdateUserRequestDto patchDto = UpdateUserRequestDto.builder()
                    .name("Әкімші жаңартқан клиент")
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/" + clientUser.getId())
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(patchDto)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name", is("Әкімші жаңартқан клиент")));

            // DELETE target user -> 204
            String deleteTargetUserId = "delete-target-user-" + UUID.randomUUID().toString().substring(0, 8);
            userRepository.save(User.builder()
                    .id(deleteTargetUserId)
                    .idNumber("777 999")
                    .name("Өшетін қолданушы")
                    .email(deleteTargetUserId + "@tanda.kz")
                    .passwordHash("pwd")
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build());

            mockMvc.perform(delete("/api/v1/admin/users/" + deleteTargetUserId)
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isNoContent());

            assertThat(userRepository.existsById(deleteTargetUserId)).isFalse();
        }
    }
}
