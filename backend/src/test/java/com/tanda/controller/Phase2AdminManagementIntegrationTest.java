package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.admin.AuthorRequestDto;
import com.tanda.dto.admin.ManagerRequestDto;
import com.tanda.dto.user.CreateUserRequestDto;
import com.tanda.entity.User;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class Phase2AdminManagementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;
    private String clientToken;

    @BeforeEach
    void setUp() {
        User adminUser = userRepository.findByEmail("admin@tanda.kz").orElseGet(() -> {
            User a = User.builder()
                    .id("admin-test-" + UUID.randomUUID().toString().substring(0, 6))
                    .idNumber("0000 0001")
                    .name("Бас Әкімші")
                    .email("admin@tanda.kz")
                    .role("admin")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(a);
        });

        User clientUser = userRepository.findByEmail("reader.phase2@tanda.kz").orElseGet(() -> {
            User c = User.builder()
                    .id("client-test-" + UUID.randomUUID().toString().substring(0, 6))
                    .idNumber("0000 1099")
                    .name("Сынақ Оқырман")
                    .email("reader.phase2@tanda.kz")
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(c);
        });

        adminToken = jwtTokenProvider.generateToken(adminUser);
        clientToken = jwtTokenProvider.generateToken(clientUser);
    }

    // ==========================================
    // 1. Reserved Usernames Tests
    // ==========================================
    @Test
    @DisplayName("GET /api/v1/admin/usernames/reserved returns initial reserved usernames list")
    void testGetReservedUsernames() throws Exception {
        mockMvc.perform(get("/api/v1/admin/usernames/reserved")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasItem("admin")))
                .andExpect(jsonPath("$", hasItem("support")));
    }

    @Test
    @DisplayName("POST /api/v1/admin/usernames/reserved adds new reserved username")
    void testAddReservedUsername() throws Exception {
        mockMvc.perform(post("/api/v1/admin/usernames/reserved")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "security_officer"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/admin/usernames/reserved")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasItem("security_officer")));
    }

    @Test
    @DisplayName("DELETE /api/v1/admin/usernames/reserved/{username} removes reserved username")
    void testRemoveReservedUsername() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/usernames/reserved/help")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    // ==========================================
    // 2. Admin User Creation & Block Toggle Tests
    // ==========================================
    @Test
    @DisplayName("POST /api/v1/admin/users creates reader with username check")
    void testCreateReaderByAdmin() throws Exception {
        CreateUserRequestDto dto = CreateUserRequestDto.builder()
                .name("Жаңа Оқырман")
                .email("new.reader." + UUID.randomUUID() + "@tanda.kz")
                .username("new_reader_01")
                .password("readerSecret123")
                .role("client")
                .phone("+7 (777) 123-45-67")
                .build();

        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("Жаңа Оқырман")))
                .andExpect(jsonPath("$.username", is("new_reader_01")))
                .andExpect(jsonPath("$.role", is("client")))
                .andExpect(jsonPath("$.isActive", is(true)));
    }

    @Test
    @DisplayName("POST /api/v1/admin/users with reserved username fails 400")
    void testCreateUserWithReservedUsernameFails() throws Exception {
        CreateUserRequestDto dto = CreateUserRequestDto.builder()
                .name("Хакер")
                .email("hacker." + UUID.randomUUID() + "@tanda.kz")
                .username("admin")
                .role("client")
                .build();

        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", is("Бұл юзернейм жүйе тарапынан резервтелген")));
    }

    @Test
    @DisplayName("PATCH /api/v1/admin/users/{id}/block toggles isBlocked status")
    void testToggleBlockUser() throws Exception {
        User targetUser = User.builder()
                .id("target-block-" + UUID.randomUUID().toString().substring(0, 6))
                .idNumber("0000 9988")
                .name("Блокталатын адам")
                .email("to.block." + UUID.randomUUID() + "@tanda.kz")
                .role("client")
                .isActive(true)
                .isBlocked(false)
                .createdAt(OffsetDateTime.now())
                .build();
        targetUser = userRepository.save(targetUser);

        // Block
        mockMvc.perform(patch("/api/v1/admin/users/" + targetUser.getId() + "/block")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isBlocked", is(true)))
                .andExpect(jsonPath("$.isActive", is(false)));

        // Unblock
        mockMvc.perform(patch("/api/v1/admin/users/" + targetUser.getId() + "/block")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isBlocked", is(false)))
                .andExpect(jsonPath("$.isActive", is(true)));
    }

    // ==========================================
    // 3. Managers Management Tests
    // ==========================================
    @Test
    @DisplayName("POST /api/v1/admin/managers creates manager with permissions")
    void testCreateManagerWithPermissions() throws Exception {
        ManagerRequestDto request = ManagerRequestDto.builder()
                .name("Модератор Айгүл")
                .email("aygul.mod." + UUID.randomUUID() + "@tanda.kz")
                .duty("Кітап модераторы")
                .permissions(List.of("books_view", "books_create", "books_edit"))
                .build();

        mockMvc.perform(post("/api/v1/admin/managers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("Модератор Айгүл")))
                .andExpect(jsonPath("$.duty", is("Кітап модераторы")))
                .andExpect(jsonPath("$.permissions", containsInAnyOrder("books_view", "books_create", "books_edit")));
    }

    // ==========================================
    // 4. Authors Management Tests
    // ==========================================
    @Test
    @DisplayName("POST /api/v1/admin/authors creates author")
    void testCreateAuthor() throws Exception {
        AuthorRequestDto request = AuthorRequestDto.builder()
                .name("Абай Құнанбайұлы")
                .email("abai." + UUID.randomUUID() + "@tanda.kz")
                .assignedAuthorName("Абай Құнанбайұлы")
                .bio("Ұлы қазақ ақыны, композитор, философ")
                .build();

        mockMvc.perform(post("/api/v1/admin/authors")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.displayName", is("Абай Құнанбайұлы")))
                .andExpect(jsonPath("$.bio", is("Ұлы қазақ ақыны, композитор, философ")));
    }

    @Test
    @DisplayName("Client cannot access /api/v1/admin/managers (403 Forbidden)")
    void testClientForbiddenAdminManagers() throws Exception {
        mockMvc.perform(get("/api/v1/admin/managers")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());
    }
}
