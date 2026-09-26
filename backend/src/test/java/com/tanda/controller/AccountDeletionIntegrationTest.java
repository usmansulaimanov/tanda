package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.auth.DeleteAccountRequestDto;
import com.tanda.entity.AudioSession;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.repository.AudioSessionRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.DeletedUserArchiveRepository;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AccountDeletionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AudioSessionRepository audioSessionRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private DeletedUserArchiveRepository deletedUserArchiveRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User readerUser;
    private User adminUser;
    private User authorUser;
    private Book testBook;

    @BeforeEach
    void setUp() {
        testBook = bookRepository.save(Book.builder()
                .id("test-book-" + UUID.randomUUID())
                .title("Абай жолы")
                .author("Мұхтар Әуезов")
                .category("FICTION")
                .hasAudio(true)
                .build());

        readerUser = userRepository.save(User.builder()
                .id("reader-" + UUID.randomUUID())
                .idNumber("0000 9999")
                .name("Оқырман Тест")
                .email("reader_delete_test@tanda.kz")
                .username("reader_del_test")
                .role("client")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .authProvider("LOCAL")
                .isActive(true)
                .isBlocked(false)
                .createdAt(OffsetDateTime.now().minusDays(10))
                .build());

        adminUser = userRepository.save(User.builder()
                .id("admin-" + UUID.randomUUID())
                .name("Бас Әкімші")
                .email("admin_delete_test@tanda.kz")
                .role("admin")
                .passwordHash(passwordEncoder.encode("AdminPass123!"))
                .authProvider("LOCAL")
                .isActive(true)
                .isBlocked(false)
                .build());

        authorUser = userRepository.save(User.builder()
                .id("author-" + UUID.randomUUID())
                .name("Тест Автор")
                .email("author_delete_test@tanda.kz")
                .role("author")
                .passwordHash(passwordEncoder.encode("AuthorPass123!"))
                .authProvider("LOCAL")
                .isActive(true)
                .isBlocked(false)
                .build());

        // Add an audio session of 3600 seconds (60 mins) for the reader
        audioSessionRepository.save(AudioSession.builder()
                .id("session-" + UUID.randomUUID())
                .userId(readerUser.getId())
                .book(testBook)
                .validSeconds(3600)
                .startedAt(OffsetDateTime.now().minusDays(2))
                .lastHeartbeatAt(OffsetDateTime.now().minusDays(2).plusHours(1))
                .build());
    }

    @Test
    @DisplayName("Reader deletes account: snapshot archived with listen time, user anonymized, audio session preserved")
    void readerCanDeleteAccountSuccessfully() throws Exception {
        String token = jwtTokenProvider.generateToken(readerUser);

        DeleteAccountRequestDto request = DeleteAccountRequestDto.builder()
                .password("Password123!")
                .reason("Қолданбайтын болдым")
                .build();

        mockMvc.perform(post("/api/v1/auth/delete-account")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 1. Verify DeletedUserArchive was created with exact stats
        var archives = deletedUserArchiveRepository.findByUserIdOrderByDeletedAtDesc(readerUser.getId());
        assertThat(archives).hasSize(1);
        var archive = archives.get(0);
        assertThat(archive.getOriginalEmail()).isEqualTo("reader_delete_test@tanda.kz");
        assertThat(archive.getOriginalName()).isEqualTo("Оқырман Тест");
        assertThat(archive.getTotalListenSeconds()).isEqualTo(3600L);
        assertThat(archive.getBooksListenedCount()).isEqualTo(1);
        assertThat(archive.getDeleteReason()).isEqualTo("Қолданбайтын болдым");

        // 2. Verify user record is deactivated and anonymized in users table
        User updatedUser = userRepository.findById(readerUser.getId()).orElseThrow();
        assertThat(updatedUser.getIsActive()).isFalse();
        assertThat(updatedUser.getIsBlocked()).isTrue();
        assertThat(updatedUser.getEmail()).startsWith("deleted_");
        assertThat(updatedUser.getUsername()).isNull();

        // 3. Verify audio sessions are intact for royalty calculation
        var sessions = audioSessionRepository.findByUserIdOrderByStartedAtDesc(readerUser.getId());
        assertThat(sessions).isNotEmpty();
        assertThat(sessions.get(0).getValidSeconds()).isEqualTo(3600);

        // 4. Verify original email is now available for new registration
        assertThat(userRepository.findByEmail("reader_delete_test@tanda.kz")).isEmpty();
    }

    @Test
    @DisplayName("Admin and Author cannot delete their account via delete-account endpoint (403/400)")
    void staffCannotDeleteAccount() throws Exception {
        String adminToken = jwtTokenProvider.generateToken(adminUser);
        String authorToken = jwtTokenProvider.generateToken(authorUser);

        mockMvc.perform(post("/api/v1/auth/delete-account")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/auth/delete-account")
                        .header("Authorization", "Bearer " + authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Admin can fetch deleted users archive list")
    void adminCanFetchDeletedUsersArchive() throws Exception {
        // Create an archive entry
        deletedUserArchiveRepository.save(com.tanda.entity.DeletedUserArchive.builder()
                .userId(readerUser.getId())
                .idNumber(readerUser.getIdNumber())
                .originalName(readerUser.getName())
                .originalEmail(readerUser.getEmail())
                .originalRole("client")
                .registeredAt(readerUser.getCreatedAt())
                .deletedAt(OffsetDateTime.now())
                .totalListenSeconds(7200L)
                .booksListenedCount(2)
                .build());

        String adminToken = jwtTokenProvider.generateToken(adminUser);

        mockMvc.perform(get("/api/v1/admin/users/deleted-archives")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].originalEmail").value(readerUser.getEmail()))
                .andExpect(jsonPath("$[0].totalListenSeconds").value(7200))
                .andExpect(jsonPath("$[0].totalListenMinutes").value(120));
    }
}
