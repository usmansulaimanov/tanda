package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.user.UpdateUserRequestDto;
import com.tanda.entity.Book;
import com.tanda.entity.SavedBook;
import com.tanda.entity.User;
import com.tanda.repository.BookRepository;
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
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public class UserAdminIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SavedBookRepository savedBookRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User adminUser;
    private User secondAdminUser;
    private User clientReader1;
    private User clientReader2;
    private User clientReaderWithSavedBooks;

    private String adminToken;
    private String clientToken;

    private static final String CLIENT_1_ID = "test-client-reader-1";
    private static final String CLIENT_2_ID = "test-client-reader-2";
    private static final String CLIENT_3_ID = "test-client-reader-3";
    private static final String SECOND_ADMIN_ID = "test-admin-secondary";

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        // 1. Clean up saved books to avoid foreign key issues
        savedBookRepository.deleteAll();

        // Clean up any extra admin users left by other tests
        List<User> existingAdmins = userRepository.findByRole("admin");
        for (User a : existingAdmins) {
            if (!a.getId().equals("admin-1") && !a.getId().equals(SECOND_ADMIN_ID)) {
                userRepository.delete(a);
            }
        }

        // 2. Ensure default primary admin exists
        adminUser = userRepository.findById("admin-1").orElseGet(() -> {
            return userRepository.findByEmail("admin@tanda.kz").orElseGet(() -> {
                User a = User.builder()
                        .id("admin-1")
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
        });
        adminUser.setEmail("admin@tanda.kz");
        adminUser.setIsActive(true);
        adminUser.setRole("admin");
        adminUser = userRepository.save(adminUser);

        // 3. Ensure a secondary admin exists for multi-admin test scenarios
        secondAdminUser = userRepository.findById(SECOND_ADMIN_ID).orElseGet(() -> {
            User a2 = User.builder()
                    .id(SECOND_ADMIN_ID)
                    .idNumber("000 002")
                    .name("Екінші Әкімші")
                    .email("second_admin_test@tanda.kz")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role("admin")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(a2);
        });
        secondAdminUser.setEmail("second_admin_test@tanda.kz");
        secondAdminUser.setIsActive(true);
        secondAdminUser.setRole("admin");
        secondAdminUser = userRepository.save(secondAdminUser);

        // 4. Seed test reader 1 (Active client)
        clientReader1 = userRepository.findById(CLIENT_1_ID).orElseGet(() -> {
            User r1 = User.builder()
                    .id(CLIENT_1_ID)
                    .idNumber("100 001")
                    .name("Айгерім Оқырман")
                    .email("aigerim_reader@tanda.kz")
                    .passwordHash(passwordEncoder.encode("reader123"))
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(r1);
        });
        clientReader1.setName("Айгерім Оқырман");
        clientReader1.setRole("client");
        clientReader1.setIsActive(true);
        clientReader1 = userRepository.save(clientReader1);

        // 5. Seed test reader 2 (Inactive client)
        clientReader2 = userRepository.findById(CLIENT_2_ID).orElseGet(() -> {
            User r2 = User.builder()
                    .id(CLIENT_2_ID)
                    .idNumber("100 002")
                    .name("Болат Оқырман")
                    .email("bolat_reader@tanda.kz")
                    .passwordHash(passwordEncoder.encode("reader123"))
                    .role("client")
                    .isActive(false)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(r2);
        });
        clientReader2.setName("Болат Оқырман");
        clientReader2.setRole("client");
        clientReader2.setIsActive(false);
        clientReader2 = userRepository.save(clientReader2);

        // 6. Seed test reader 3 with a saved book
        clientReaderWithSavedBooks = userRepository.findById(CLIENT_3_ID).orElseGet(() -> {
            User r3 = User.builder()
                    .id(CLIENT_3_ID)
                    .idNumber("100 003")
                    .name("Сәуле Оқырман")
                    .email("saule_reader@tanda.kz")
                    .passwordHash(passwordEncoder.encode("reader123"))
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(r3);
        });
        clientReaderWithSavedBooks.setName("Сәуле Оқырман");
        clientReaderWithSavedBooks.setRole("client");
        clientReaderWithSavedBooks.setIsActive(true);
        clientReaderWithSavedBooks = userRepository.save(clientReaderWithSavedBooks);

        // Ensure a book exists for saved book link
        Book testBook = bookRepository.findById("user-admin-test-book").orElseGet(() -> {
            Book b = Book.builder()
                    .id("user-admin-test-book")
                    .title("Оқырман тест кітабы")
                    .author("Автор")
                    .category("Классика")
                    .pages(100)
                    .build();
            return bookRepository.save(b);
        });

        savedBookRepository.save(SavedBook.builder()
                .id("sb-test-" + UUID.randomUUID().toString().substring(0, 8))
                .user(clientReaderWithSavedBooks)
                .book(testBook)
                .savedAt(OffsetDateTime.now())
                .build());

        // Generate tokens
        adminToken = jwtTokenProvider.generateToken(adminUser);
        clientToken = jwtTokenProvider.generateToken(clientReader1);
    }

    // =========================================================================
    // 1. GET /api/admin/users and GET /api/v1/admin/users
    // =========================================================================
    @Nested
    @DisplayName("GET /api/admin/users & /api/v1/admin/users: Listing and Search")
    class GetAllUsersTests {

        @Test
        @DisplayName("1.1 GET /api/v1/admin/users returns 200 OK with complete user list and metadata")
        void testGetAllUsersV1() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                    .andExpect(jsonPath("$[?(@.id == '" + CLIENT_1_ID + "')].name").value("Айгерім Оқырман"))
                    .andExpect(jsonPath("$[?(@.id == '" + CLIENT_1_ID + "')].email").value("aigerim_reader@tanda.kz"))
                    .andExpect(jsonPath("$[?(@.id == '" + CLIENT_1_ID + "')].role").value("client"))
                    .andExpect(jsonPath("$[?(@.id == '" + CLIENT_1_ID + "')].isActive").value(true))
                    .andExpect(jsonPath("$[?(@.id == '" + CLIENT_1_ID + "')].savedBooksCount").value(0))
                    .andExpect(jsonPath("$[?(@.id == '" + CLIENT_3_ID + "')].savedBooksCount").value(1));
        }

        @Test
        @DisplayName("1.2 Dual prefix parity: GET /api/admin/users (unversioned) returns same user list")
        void testGetAllUsersUnversioned() throws Exception {
            mockMvc.perform(get("/api/admin/users")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                    .andExpect(jsonPath("$[?(@.id == '" + CLIENT_1_ID + "')].name").value("Айгерім Оқырман"));
        }

        @Test
        @DisplayName("1.3 Filter by role=client returns only client users across both prefixes")
        void testFilterByRoleClient() throws Exception {
            for (String prefix : List.of("/api/v1/admin/users", "/api/admin/users")) {
                mockMvc.perform(get(prefix)
                                .param("role", "client")
                                .header("Authorization", "Bearer " + adminToken)
                                .accept(MediaType.APPLICATION_JSON))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$[?(@.role != 'client')]").doesNotExist())
                        .andExpect(jsonPath("$[?(@.id == '" + CLIENT_1_ID + "')]").exists())
                        .andExpect(jsonPath("$[?(@.id == '" + CLIENT_2_ID + "')]").exists())
                        .andExpect(jsonPath("$[?(@.id == '" + adminUser.getId() + "')]").doesNotExist());
            }
        }

        @Test
        @DisplayName("1.4 Filter by role=admin returns only admin users across both prefixes")
        void testFilterByRoleAdmin() throws Exception {
            for (String prefix : List.of("/api/v1/admin/users", "/api/admin/users")) {
                mockMvc.perform(get(prefix)
                                .param("role", "admin")
                                .header("Authorization", "Bearer " + adminToken)
                                .accept(MediaType.APPLICATION_JSON))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$[?(@.role != 'admin')]").doesNotExist())
                        .andExpect(jsonPath("$[?(@.id == '" + adminUser.getId() + "')]").exists())
                        .andExpect(jsonPath("$[?(@.id == '" + SECOND_ADMIN_ID + "')]").exists())
                        .andExpect(jsonPath("$[?(@.id == '" + CLIENT_1_ID + "')]").doesNotExist());
            }
        }

        @Test
        @DisplayName("1.5 Search by name (search=Айгерім) matches user")
        void testSearchByName() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .param("search", "Айгерім")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].id", is(CLIENT_1_ID)))
                    .andExpect(jsonPath("$[0].name", is("Айгерім Оқырман")));
        }

        @Test
        @DisplayName("1.6 Search by email (search=bolat_reader@tanda.kz) matches user")
        void testSearchByEmail() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .param("search", "bolat_reader@tanda.kz")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].id", is(CLIENT_2_ID)))
                    .andExpect(jsonPath("$[0].email", is("bolat_reader@tanda.kz")));
        }

        @Test
        @DisplayName("1.7 Search by ID number (search=100 003) matches user")
        void testSearchByIdNumber() throws Exception {
            mockMvc.perform(get("/api/admin/users")
                            .param("search", "100 003")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].id", is(CLIENT_3_ID)))
                    .andExpect(jsonPath("$[0].name", is("Сәуле Оқырман")));
        }

        @Test
        @DisplayName("1.8 Combined role filter and search query (role=client, search=Болат)")
        void testCombinedRoleAndSearch() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .param("role", "client")
                            .param("search", "Болат")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].id", is(CLIENT_2_ID)));
        }

        @Test
        @DisplayName("1.9 Search with no matching records returns empty list with 200 OK")
        void testSearchNoMatchReturnsEmptyList() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .param("search", "NonExistentUserQuery999XYZ")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    // =========================================================================
    // 2. GET /api/admin/users/{id} and GET /api/v1/admin/users/{id}
    // =========================================================================
    @Nested
    @DisplayName("GET /api/admin/users/{id} & /api/v1/admin/users/{id}: Fetch User by ID")
    class GetUserByIdTests {

        @Test
        @DisplayName("2.1 GET /api/v1/admin/users/{id} returns 200 OK with UserResponseDto")
        void testGetUserByIdV1Success() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users/" + CLIENT_1_ID)
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(CLIENT_1_ID)))
                    .andExpect(jsonPath("$.name", is("Айгерім Оқырман")))
                    .andExpect(jsonPath("$.email", is("aigerim_reader@tanda.kz")))
                    .andExpect(jsonPath("$.role", is("client")))
                    .andExpect(jsonPath("$.isActive", is(true)))
                    .andExpect(jsonPath("$.idNumber", is("100 001")))
                    .andExpect(jsonPath("$.createdAt", notNullValue()));
        }

        @Test
        @DisplayName("2.2 Dual prefix parity: GET /api/admin/users/{id} (unversioned) returns 200 OK")
        void testGetUserByIdUnversionedSuccess() throws Exception {
            mockMvc.perform(get("/api/admin/users/" + CLIENT_1_ID)
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(CLIENT_1_ID)))
                    .andExpect(jsonPath("$.name", is("Айгерім Оқырман")));
        }

        @Test
        @DisplayName("2.3 GET /api/v1/admin/users/{id} with non-existent ID returns 404 Not Found")
        void testGetUserByIdNotFoundV1() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users/non-existent-user-id-9999")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status", is(404)))
                    .andExpect(jsonPath("$.error", is("Not Found")));
        }

        @Test
        @DisplayName("2.4 Dual prefix parity: GET /api/admin/users/{id} with non-existent ID returns 404 Not Found")
        void testGetUserByIdNotFoundUnversioned() throws Exception {
            mockMvc.perform(get("/api/admin/users/non-existent-user-id-9999")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status", is(404)));
        }
    }

    // =========================================================================
    // 3. PATCH /api/admin/users/{id} and PATCH /api/v1/admin/users/{id}
    // =========================================================================
    @Nested
    @DisplayName("PATCH /api/admin/users/{id} & /api/v1/admin/users/{id}: User Updates")
    class PatchUserTests {

        @Test
        @DisplayName("3.1 PATCH /api/v1/admin/users/{id} updates user name")
        void testPatchUserName() throws Exception {
            UpdateUserRequestDto request = UpdateUserRequestDto.builder()
                    .name("Жаңартылған Айгерім")
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/" + CLIENT_1_ID)
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(CLIENT_1_ID)))
                    .andExpect(jsonPath("$.name", is("Жаңартылған Айгерім")));

            User updated = userRepository.findById(CLIENT_1_ID).orElseThrow();
            assertThat(updated.getName()).isEqualTo("Жаңартылған Айгерім");
        }

        @Test
        @DisplayName("3.2 Dual prefix parity: PATCH /api/admin/users/{id} promotes client to admin")
        void testPatchUserRolePromote() throws Exception {
            UpdateUserRequestDto request = UpdateUserRequestDto.builder()
                    .role("admin")
                    .build();

            mockMvc.perform(patch("/api/admin/users/" + CLIENT_1_ID)
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(CLIENT_1_ID)))
                    .andExpect(jsonPath("$.role", is("admin")));

            User updated = userRepository.findById(CLIENT_1_ID).orElseThrow();
            assertThat(updated.getRole()).isEqualTo("admin");
        }

        @Test
        @DisplayName("3.3 PATCH /api/v1/admin/users/{id} deactivates user (isActive = false)")
        void testPatchUserDeactivate() throws Exception {
            UpdateUserRequestDto request = UpdateUserRequestDto.builder()
                    .isActive(false)
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/" + CLIENT_1_ID)
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive", is(false)));

            User updated = userRepository.findById(CLIENT_1_ID).orElseThrow();
            assertThat(updated.getIsActive()).isFalse();
        }

        @Test
        @DisplayName("3.4 PATCH /api/v1/admin/users/{id} activates inactive user (isActive = true)")
        void testPatchUserActivate() throws Exception {
            UpdateUserRequestDto request = UpdateUserRequestDto.builder()
                    .isActive(true)
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/" + CLIENT_2_ID)
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive", is(true)));

            User updated = userRepository.findById(CLIENT_2_ID).orElseThrow();
            assertThat(updated.getIsActive()).isTrue();
        }

        @Test
        @DisplayName("3.5 PATCH with invalid role returns 400 Bad Request")
        void testPatchInvalidRoleReturns400() throws Exception {
            UpdateUserRequestDto request = UpdateUserRequestDto.builder()
                    .role("superadmin")
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/" + CLIENT_1_ID)
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.message", is("Role must be 'admin' or 'client'")));
        }

        @Test
        @DisplayName("3.6 PATCH non-existent user returns 404 Not Found")
        void testPatchUserNotFoundReturns404() throws Exception {
            UpdateUserRequestDto request = UpdateUserRequestDto.builder()
                    .name("Жоқ адам")
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/non-existent-user-9999")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status", is(404)));
        }

        private void leaveOnlySoleAdmin() {
            List<User> allAdmins = userRepository.findByRole("admin");
            for (User a : allAdmins) {
                if (!a.getId().equals(adminUser.getId())) {
                    userRepository.delete(a);
                }
            }
        }

        @Test
        @DisplayName("3.7 Demoting sole active admin returns 400 Bad Request")
        void testDemoteSoleAdminReturns400() throws Exception {
            // Leave only sole active admin
            leaveOnlySoleAdmin();

            UpdateUserRequestDto request = UpdateUserRequestDto.builder()
                    .role("client")
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/" + adminUser.getId())
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.message", is("Cannot deactivate or demote the last remaining admin")));
        }

        @Test
        @DisplayName("3.8 Deactivating sole active admin returns 400 Bad Request")
        void testDeactivateSoleAdminReturns400() throws Exception {
            // Leave only sole active admin
            leaveOnlySoleAdmin();

            UpdateUserRequestDto request = UpdateUserRequestDto.builder()
                    .isActive(false)
                    .build();

            mockMvc.perform(patch("/api/admin/users/" + adminUser.getId())
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.message", is("Cannot deactivate or demote the last remaining admin")));
        }
    }

    // =========================================================================
    // 4. DELETE /api/admin/users/{id} and DELETE /api/v1/admin/users/{id}
    // =========================================================================
    @Nested
    @DisplayName("DELETE /api/admin/users/{id} & /api/v1/admin/users/{id}: User Deletion")
    class DeleteUserTests {

        private void leaveOnlySoleAdmin() {
            List<User> allAdmins = userRepository.findByRole("admin");
            for (User a : allAdmins) {
                if (!a.getId().equals(adminUser.getId())) {
                    userRepository.delete(a);
                }
            }
        }

        @Test
        @DisplayName("4.1 DELETE /api/v1/admin/users/{id} deletes client user and returns 204 No Content")
        void testDeleteClientUserV1() throws Exception {
            mockMvc.perform(delete("/api/v1/admin/users/" + CLIENT_1_ID)
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isNoContent());

            assertThat(userRepository.existsById(CLIENT_1_ID)).isFalse();
        }

        @Test
        @DisplayName("4.2 Dual prefix parity: DELETE /api/admin/users/{id} (unversioned) returns 204 No Content")
        void testDeleteClientUserUnversioned() throws Exception {
            mockMvc.perform(delete("/api/admin/users/" + CLIENT_2_ID)
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isNoContent());

            assertThat(userRepository.existsById(CLIENT_2_ID)).isFalse();
        }

        @Test
        @DisplayName("4.3 DELETE non-existent user returns 404 Not Found")
        void testDeleteUserNotFoundReturns404() throws Exception {
            mockMvc.perform(delete("/api/v1/admin/users/non-existent-user-9999")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status", is(404)));
        }

        @Test
        @DisplayName("4.4 Attempt to delete sole active admin returns 400 Bad Request")
        void testDeleteSoleAdminReturns400() throws Exception {
            // Leave only sole active admin
            leaveOnlySoleAdmin();

            mockMvc.perform(delete("/api/v1/admin/users/" + adminUser.getId())
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.message", is("Cannot delete the last remaining admin")));

            assertThat(userRepository.existsById(adminUser.getId())).isTrue();
        }

        @Test
        @DisplayName("4.5 When multiple admins exist, deleting one admin returns 204 No Content")
        void testDeleteAdminWhenMultipleAdminsExist() throws Exception {
            // Ensure both adminUser and secondAdminUser are active and saved
            adminUser.setIsActive(true);
            userRepository.save(adminUser);
            secondAdminUser.setIsActive(true);
            userRepository.save(secondAdminUser);

            mockMvc.perform(delete("/api/v1/admin/users/" + SECOND_ADMIN_ID)
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isNoContent());

            assertThat(userRepository.existsById(SECOND_ADMIN_ID)).isFalse();
            assertThat(userRepository.existsById(adminUser.getId())).isTrue();
        }
    }

    // =========================================================================
    // 5. Access Control for UserAdmin endpoints (401 and 403 enforcement)
    // =========================================================================
    @Nested
    @DisplayName("Access Control: Anonymous and Client Blocking")
    class AccessControlTests {

        @Test
        @DisplayName("5.1 Anonymous request to GET /api/v1/admin/users returns 401 Unauthorized")
        void testAnonymousGetUsersReturns401() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("5.2 Anonymous request to PATCH /api/v1/admin/users/{id} returns 401 Unauthorized")
        void testAnonymousPatchUserReturns401() throws Exception {
            mockMvc.perform(patch("/api/v1/admin/users/" + CLIENT_1_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\": \"Hacked\"}"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("5.3 Anonymous request to DELETE /api/v1/admin/users/{id} returns 401 Unauthorized")
        void testAnonymousDeleteUserReturns401() throws Exception {
            mockMvc.perform(delete("/api/v1/admin/users/" + CLIENT_1_ID))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("5.4 Client request to GET /api/v1/admin/users returns 403 Forbidden")
        void testClientGetUsersReturns403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("5.5 Client request to GET /api/admin/users (unversioned) returns 403 Forbidden")
        void testClientGetUsersUnversionedReturns403() throws Exception {
            mockMvc.perform(get("/api/admin/users")
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("5.6 Client request to PATCH /api/v1/admin/users/{id} returns 403 Forbidden")
        void testClientPatchUserReturns403() throws Exception {
            mockMvc.perform(patch("/api/v1/admin/users/" + CLIENT_1_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\": \"Hacked\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("5.7 Client request to DELETE /api/v1/admin/users/{id} returns 403 Forbidden")
        void testClientDeleteUserReturns403() throws Exception {
            mockMvc.perform(delete("/api/v1/admin/users/" + CLIENT_1_ID)
                            .header("Authorization", "Bearer " + clientToken))
                    .andExpect(status().isForbidden());
        }
    }
}
