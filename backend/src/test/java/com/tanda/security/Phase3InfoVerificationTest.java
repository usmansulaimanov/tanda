package com.tanda.security;

import com.tanda.dto.BookDetailResponseDto;
import com.tanda.dto.BookResponseDto;
import com.tanda.entity.Book;
import com.tanda.entity.RefreshToken;
import com.tanda.repository.BookRepository;
import com.tanda.repository.RefreshTokenRepository;
import com.tanda.service.BookService;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Field;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class Phase3InfoVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BookService bookService;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private RefreshTokenCleanupJob cleanupJob;

    @Autowired
    private com.tanda.repository.UserRepository userRepository;

    private Book testBook;
    private Book archivedBook;
    private com.tanda.entity.User testUser;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        testUser = userRepository.findById("phase3-test-user").orElseGet(() -> {
            com.tanda.entity.User u = com.tanda.entity.User.builder()
                    .id("phase3-test-user")
                    .idNumber("999 003")
                    .name("Фаза 3 Қолданушы")
                    .email("phase3_user@tanda.kz")
                    .passwordHash("hashed")
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(u);
        });

        testBook = bookRepository.findById("phase3-test-book").orElseGet(() -> {
            Book b = Book.builder()
                    .id("phase3-test-book")
                    .title("Фаза 3 Тест Кітабы")
                    .author("Автор 3")
                    .category("Ғылым")
                    .pages(200)
                    .isArchived(false)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return bookRepository.save(b);
        });

        archivedBook = bookRepository.findById("phase3-archived-book").orElseGet(() -> {
            Book b = Book.builder()
                    .id("phase3-archived-book")
                    .title("Фаза 3 Мұрағат")
                    .author("Автор 3")
                    .category("Ғылым")
                    .pages(150)
                    .isArchived(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return bookRepository.save(b);
        });
    }

    @Test
    @DisplayName("3.1 BookService works without SecurityContextHolder via isAdmin parameter")
    void testBookServiceDecoupledFromSecurityContext() {
        // Without setting SecurityContextHolder:
        // 1. Non-admin cannot see archived book
        Page<BookResponseDto> userBooks = bookService.getBooks(null, "Мұрағат", true, false, PageRequest.of(0, 10));
        assertThat(userBooks.getContent()).isEmpty();

        // 2. Admin can see archived book
        Page<BookResponseDto> adminBooks = bookService.getBooks(null, "Мұрағат", true, true, PageRequest.of(0, 10));
        assertThat(adminBooks.getContent()).hasSize(1);
        assertThat(adminBooks.getContent().get(0).getId()).isEqualTo(archivedBook.getId());

        // 3. getBookById with isAdmin=false throws for archived book
        org.junit.jupiter.api.Assertions.assertThrows(
                com.tanda.exception.ResourceNotFoundException.class,
                () -> bookService.getBookById(archivedBook.getId(), false)
        );

        // 4. getBookById with isAdmin=true succeeds for archived book
        BookDetailResponseDto detail = bookService.getBookById(archivedBook.getId(), true);
        assertThat(detail).isNotNull();
        assertThat(detail.getId()).isEqualTo(archivedBook.getId());
    }

    @Test
    @DisplayName("3.2 Canonical /api/v1 prefix endpoints are reachable")
    void testCanonicalEndpointsReachable() throws Exception {
        mockMvc.perform(get("/api/v1/books"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("3.4 Book.audioChapters has explicit FetchType.LAZY")
    void testBookAudioChaptersExplicitLazyFetch() throws Exception {
        Field field = Book.class.getDeclaredField("audioChapters");
        OneToMany annotation = field.getAnnotation(OneToMany.class);
        assertThat(annotation).isNotNull();
        assertThat(annotation.fetch()).isEqualTo(FetchType.LAZY);
    }

    @Test
    @DisplayName("3.5 RefreshTokenCleanupJob purges expired and revoked tokens")
    void testRefreshTokenCleanupJob() {
        String activeTokenHash = UUID.randomUUID().toString();
        RefreshToken activeToken = RefreshToken.builder()
                .id(UUID.randomUUID().toString())
                .userId(testUser.getId())
                .tokenHash(activeTokenHash)
                .expiresAt(OffsetDateTime.now().plusDays(7))
                .revoked(false)
                .createdAt(OffsetDateTime.now())
                .build();
        refreshTokenRepository.save(activeToken);

        String expiredTokenHash = UUID.randomUUID().toString();
        RefreshToken expiredToken = RefreshToken.builder()
                .id(UUID.randomUUID().toString())
                .userId(testUser.getId())
                .tokenHash(expiredTokenHash)
                .expiresAt(OffsetDateTime.now().minusDays(1))
                .revoked(false)
                .createdAt(OffsetDateTime.now().minusDays(10))
                .build();
        refreshTokenRepository.save(expiredToken);

        String revokedTokenHash = UUID.randomUUID().toString();
        RefreshToken revokedToken = RefreshToken.builder()
                .id(UUID.randomUUID().toString())
                .userId(testUser.getId())
                .tokenHash(revokedTokenHash)
                .expiresAt(OffsetDateTime.now().plusDays(5))
                .revoked(true)
                .createdAt(OffsetDateTime.now())
                .build();
        refreshTokenRepository.save(revokedToken);

        // Run cleanup job
        cleanupJob.cleanupExpiredTokens();

        // Active token must remain
        assertThat(refreshTokenRepository.findByTokenHash(activeTokenHash)).isPresent();

        // Expired & revoked tokens must be deleted
        assertThat(refreshTokenRepository.findByTokenHash(expiredTokenHash)).isEmpty();
        assertThat(refreshTokenRepository.findByTokenHash(revokedTokenHash)).isEmpty();
    }
}
