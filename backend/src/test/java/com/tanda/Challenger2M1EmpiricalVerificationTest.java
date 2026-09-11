package com.tanda;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.BookDetailResponseDto;
import com.tanda.dto.CreateBookRequestDto;
import com.tanda.dto.UpdateBookRequestDto;
import com.tanda.dto.user.UpdateUserRequestDto;
import com.tanda.entity.AudioChapter;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AudioChapterRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.ReadingProgressRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.BookService;
import com.tanda.service.UserService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public class Challenger2M1EmpiricalVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookService bookService;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReadingProgressRepository readingProgressRepository;

    @Autowired
    private AudioChapterRepository audioChapterRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Validator validator;

    @BeforeEach
    void init() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
        SecurityContextHolder.clearContext();
    }

    // =========================================================================
    // TASK 1: Verify audiobook creation with pages = null (DTO Validation & Persistence)
    // =========================================================================

    @Test
    @DisplayName("Task 1.1: CreateBookRequestDto with pages = null passes Jakarta validation")
    void testCreateDtoPagesNullPassesValidation() {
        CreateBookRequestDto dto = CreateBookRequestDto.builder()
                .title("Аудиокітап сыны")
                .author("Диктор автор")
                .category("Бизнес")
                .pages(null)
                .hasAudio(true)
                .audioUrl("https://example.com/stream.mp3")
                .build();

        Set<ConstraintViolation<CreateBookRequestDto>> violations = validator.validate(dto);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Task 1.2: CreateBookRequestDto with pages < 1 fails validation with @Min violation")
    void testCreateDtoPagesZeroFailsValidation() {
        CreateBookRequestDto dtoZero = CreateBookRequestDto.builder()
                .title("Аудиокітап сыны")
                .author("Диктор автор")
                .category("Бизнес")
                .pages(0)
                .build();

        Set<ConstraintViolation<CreateBookRequestDto>> violations = validator.validate(dtoZero);
        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getMessage()).isEqualTo("Pages must be at least 1");
    }

    @Test
    @DisplayName("Task 1.3: UpdateBookRequestDto with pages = null passes validation")
    void testUpdateDtoPagesNullPassesValidation() {
        UpdateBookRequestDto dto = UpdateBookRequestDto.builder()
                .title("Жаңартылған аудио")
                .author("Автор")
                .category("Ғылым")
                .pages(null)
                .hasAudio(true)
                .build();

        Set<ConstraintViolation<UpdateBookRequestDto>> violations = validator.validate(dto);
        assertThat(violations).isEmpty();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Task 1.4: POST /api/v1/books with pages = null creates audiobook and returns 201 with null pages")
    void testPostAudiobookWithPagesNull() throws Exception {
        String bookId = "audiobook-null-pages-" + UUID.randomUUID().toString().substring(0, 8);
        CreateBookRequestDto request = CreateBookRequestDto.builder()
                .id(bookId)
                .title("Таза Аудиокітап")
                .author("Аудио Диктор")
                .category("Аудио")
                .pages(null)
                .hasAudio(true)
                .audioUrl("https://tanda.kz/audio/sample.mp3")
                .isFree(true)
                .build();

        mockMvc.perform(post("/api/v1/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(bookId)))
                .andExpect(jsonPath("$.pages", nullValue()))
                .andExpect(jsonPath("$.hasAudio", is(true)));

        Book persisted = bookRepository.findById(bookId).orElseThrow();
        assertThat(persisted.getPages()).isNull();
        assertThat(persisted.getHasAudio()).isTrue();
    }

    // =========================================================================
    // TASK 2: Verify unauthenticated or client requests for archived book return 404
    // =========================================================================

    private String createArchivedBook() {
        String archivedBookId = "archived-test-book-" + UUID.randomUUID().toString().substring(0, 8);
        Book archivedBook = Book.builder()
                .id(archivedBookId)
                .title("Архивтелген құпия кітап")
                .author("Жасырын автор")
                .category("Архив")
                .pages(200)
                .hasAudio(false)
                .isFree(false)
                .isArchived(true)
                .createdAt(OffsetDateTime.now())
                .build();
        bookRepository.save(archivedBook);
        return archivedBookId;
    }

    @Test
    @DisplayName("Task 2.1: Direct service call: Unauthenticated caller gets ResourceNotFoundException")
    void testServiceUnauthenticatedThrowsNotFound() {
        String archivedBookId = createArchivedBook();
        SecurityContextHolder.clearContext();
        assertThatThrownBy(() -> bookService.getBookById(archivedBookId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Book");
    }

    @Test
    @DisplayName("Task 2.2: Direct service call: CLIENT role gets ResourceNotFoundException")
    void testServiceClientRoleThrowsNotFound() {
        String archivedBookId = createArchivedBook();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("clientUser", "pwd",
                        List.of(new SimpleGrantedAuthority("ROLE_CLIENT")))
        );
        assertThatThrownBy(() -> bookService.getBookById(archivedBookId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Book");
    }

    @Test
    @DisplayName("Task 2.3: Direct service call: ADMIN role succeeds and retrieves archived book")
    void testServiceAdminRoleSucceeds() {
        String archivedBookId = createArchivedBook();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("adminUser", "pwd",
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
        );
        BookDetailResponseDto result = bookService.getBookById(archivedBookId);
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(archivedBookId);
        assertThat(result.getIsArchived()).isTrue();
    }

    @Test
    @DisplayName("Task 2.4: HTTP GET /api/v1/books/{id}: Unauthenticated request returns 404 ResourceNotFound")
    void testHttpGetUnauthenticatedReturns404() throws Exception {
        String archivedBookId = createArchivedBook();
        mockMvc.perform(get("/api/v1/books/" + archivedBookId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    @Test
    @WithMockUser(roles = "CLIENT")
    @DisplayName("Task 2.5: HTTP GET /api/v1/books/{id}: Client request returns 404 ResourceNotFound")
    void testHttpGetClientReturns404() throws Exception {
        String archivedBookId = createArchivedBook();
        mockMvc.perform(get("/api/v1/books/" + archivedBookId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Task 2.6: HTTP GET /api/v1/books/{id}: Admin request returns 200 OK")
    void testHttpGetAdminReturns200() throws Exception {
        String archivedBookId = createArchivedBook();
        mockMvc.perform(get("/api/v1/books/" + archivedBookId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(archivedBookId)))
                .andExpect(jsonPath("$.isArchived", is(true)));
    }

    @Test
    @DisplayName("Task 2.7: HTTP GET /api/books/{id} (unversioned): Unauthenticated request returns 404")
    void testHttpGetUnversionedUnauthenticatedReturns404() throws Exception {
        String archivedBookId = createArchivedBook();
        mockMvc.perform(get("/api/books/" + archivedBookId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)));
    }

    // =========================================================================
    // TASK 3: Verify sole active admin deletion and deactivation guard
    // =========================================================================

    private String setupSoleAdminState() {
        List<User> existingAdmins = userRepository.findByRole("admin");
        for (User a : existingAdmins) {
            userRepository.delete(a);
        }

        String soleAdminId = "sole-admin-" + UUID.randomUUID().toString().substring(0, 8);
        User admin = User.builder()
                .id(soleAdminId)
                .idNumber("ADM-" + UUID.randomUUID().toString().substring(0, 4))
                .name("Sole Administrator")
                .email("sole.admin." + UUID.randomUUID() + "@tanda.kz")
                .passwordHash("hash")
                .role("admin")
                .isActive(true)
                .build();
        userRepository.save(admin);
        return soleAdminId;
    }

    @Test
    @DisplayName("Task 3.1: Attempting to delete sole active admin throws BadRequestException")
    void testDeleteSoleAdminThrowsBadRequest() {
        String soleAdminId = setupSoleAdminState();
        assertThatThrownBy(() -> userService.deleteUser(soleAdminId))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Cannot delete the last remaining admin");

        assertThat(userRepository.existsById(soleAdminId)).isTrue();
    }

    @Test
    @DisplayName("Task 3.2: Attempting to deactivate sole active admin (isActive=false) throws BadRequestException")
    void testDeactivateSoleAdminThrowsBadRequest() {
        String soleAdminId = setupSoleAdminState();
        UpdateUserRequestDto dto = UpdateUserRequestDto.builder()
                .isActive(false)
                .build();

        assertThatThrownBy(() -> userService.updateUser(soleAdminId, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Cannot deactivate or demote the last remaining admin");

        User admin = userRepository.findById(soleAdminId).orElseThrow();
        assertThat(admin.getIsActive()).isTrue();
    }

    @Test
    @DisplayName("Task 3.3: Attempting to demote sole active admin (role=client) throws BadRequestException")
    void testDemoteSoleAdminThrowsBadRequest() {
        String soleAdminId = setupSoleAdminState();
        UpdateUserRequestDto dto = UpdateUserRequestDto.builder()
                .role("client")
                .build();

        assertThatThrownBy(() -> userService.updateUser(soleAdminId, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Cannot deactivate or demote the last remaining admin");

        User admin = userRepository.findById(soleAdminId).orElseThrow();
        assertThat(admin.getRole()).isEqualTo("admin");
    }

    @Test
    @DisplayName("Task 3.4: When two active admins exist, deleting one succeeds, but deleting the last fails")
    void testDeleteWhenMultipleAdminsExist() {
        String soleAdminId = setupSoleAdminState();
        String secondAdminId = "second-admin-" + UUID.randomUUID().toString().substring(0, 8);
        User admin2 = User.builder()
                .id(secondAdminId)
                .idNumber("ADM-" + UUID.randomUUID().toString().substring(0, 4))
                .name("Second Administrator")
                .email("second.admin." + UUID.randomUUID() + "@tanda.kz")
                .passwordHash("hash")
                .role("admin")
                .isActive(true)
                .build();
        userRepository.save(admin2);

        // First admin can now be safely deleted
        assertDoesNotThrow(() -> userService.deleteUser(soleAdminId));
        assertThat(userRepository.existsById(soleAdminId)).isFalse();

        // Now secondAdmin is the sole remaining admin; deleting it must fail
        assertThatThrownBy(() -> userService.deleteUser(secondAdminId))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Cannot delete the last remaining admin");
        assertThat(userRepository.existsById(secondAdminId)).isTrue();
    }

    @Test
    @DisplayName("Task 3.5: Inactive second admin does NOT satisfy the active admin requirement")
    void testInactiveAdminDoesNotCountTowardsActiveGuard() {
        String soleAdminId = setupSoleAdminState();
        String inactiveAdminId = "inactive-admin-" + UUID.randomUUID().toString().substring(0, 8);
        User inactiveAdmin = User.builder()
                .id(inactiveAdminId)
                .idNumber("ADM-" + UUID.randomUUID().toString().substring(0, 4))
                .name("Inactive Admin")
                .email("inactive.admin." + UUID.randomUUID() + "@tanda.kz")
                .passwordHash("hash")
                .role("admin")
                .isActive(false)
                .build();
        userRepository.save(inactiveAdmin);

        // Deleting sole active admin must still fail even though inactive admin exists
        assertThatThrownBy(() -> userService.deleteUser(soleAdminId))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Cannot delete the last remaining admin");
    }

    // =========================================================================
    // TASK 4: Verify Flyway V4 migration creates unique constraint on reading_progress
    // =========================================================================

    @Test
    @DisplayName("Task 4.0: Flyway schema history records V4 migration as successful")
    void testFlywayV4AppliedSuccessfully() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT \"version\", \"description\", \"success\" FROM \"PUBLIC\".\"flyway_schema_history\" WHERE \"version\" = '4'"
        );
        assertThat(rows).hasSize(1);
        Map<String, Object> v4 = rows.get(0);
        assertThat(v4.get("version")).isEqualTo("4");
        assertThat(v4.get("description").toString()).containsIgnoringCase("schema constraints and lengths");
        assertThat(v4.get("success")).isEqualTo(true);
    }

    @Test
    @DisplayName("Task 4.1: Database information schema contains UNIQUE constraint uq_reading_progress_user_book")
    void testUniqueConstraintExistsInDatabase() {
        List<Map<String, Object>> constraints = jdbcTemplate.queryForList(
                "SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE " +
                "FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS " +
                "WHERE UPPER(TABLE_NAME) = 'READING_PROGRESS' " +
                "AND (UPPER(CONSTRAINT_NAME) LIKE '%UQ_READING_PROGRESS_USER_BOOK%' OR CONSTRAINT_TYPE = 'UNIQUE')"
        );
        assertThat(constraints).isNotEmpty();
        boolean hasUniqueConstraint = constraints.stream()
                .anyMatch(c -> "UNIQUE".equalsIgnoreCase(String.valueOf(c.get("CONSTRAINT_TYPE"))) ||
                               String.valueOf(c.get("CONSTRAINT_NAME")).toUpperCase().contains("UQ_READING_PROGRESS_USER_BOOK"));
        assertThat(hasUniqueConstraint).isTrue();
    }

    @Test
    @DisplayName("Task 4.2: Database enforces uniqueness: duplicate (user_id, book_id) insert throws DataIntegrityViolationException")
    void testDuplicateProgressInsertionThrowsDataIntegrityViolation() {
        String testUserId = "stress-user-" + UUID.randomUUID().toString().substring(0, 8);
        String testBookId = "stress-book-" + UUID.randomUUID().toString().substring(0, 8);

        // Create book
        Book book = Book.builder()
                .id(testBookId)
                .title("Прогресс тест кітабы")
                .author("Автор")
                .category("Тест")
                .pages(100)
                .build();
        bookRepository.save(book);

        // Direct JDBC insert 1: must succeed
        jdbcTemplate.update(
                "INSERT INTO reading_progress (id, user_id, book_id, current_page, current_audio_time, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "rp-1-" + UUID.randomUUID().toString().substring(0, 8), testUserId, testBookId, 10, 0
        );

        // Direct JDBC insert 2 with SAME user_id and book_id: must fail at database level
        assertThatThrownBy(() -> {
            jdbcTemplate.update(
                    "INSERT INTO reading_progress (id, user_id, book_id, current_page, current_audio_time, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                    "rp-2-" + UUID.randomUUID().toString().substring(0, 8), testUserId, testBookId, 25, 0
            );
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Task 4.3: Flyway V4 altered cover_image, audio_url and chapter audio_url to TEXT allowing > 1024 chars")
    void testTextColumnsSupportLongBase64Data() {
        String longBase64 = "data:image/jpeg;base64," + "A".repeat(2048);
        String longAudioUrl = "https://cdn.tanda.kz/audio/track?param=" + "B".repeat(2048);
        String bookId = "long-assets-book-" + UUID.randomUUID().toString().substring(0, 8);

        Book bookWithLargeAssets = Book.builder()
                .id(bookId)
                .title("Үлкен файл кітабы")
                .author("Автор")
                .category("Технология")
                .pages(300)
                .coverImage(longBase64)
                .audioUrl(longAudioUrl)
                .build();

        // Must save without varchar length truncation error
        assertDoesNotThrow(() -> bookRepository.saveAndFlush(bookWithLargeAssets));

        Book retrieved = bookRepository.findById(bookId).orElseThrow();
        assertThat(retrieved.getCoverImage()).isEqualTo(longBase64);
        assertThat(retrieved.getAudioUrl()).isEqualTo(longAudioUrl);

        // Also test audio chapter audio_url TEXT column
        String chapterId = "ch-long-" + UUID.randomUUID().toString().substring(0, 8);
        AudioChapter chapter = AudioChapter.builder()
                .id(chapterId)
                .book(retrieved)
                .title("1-тарау")
                .audioUrl(longAudioUrl)
                .chapterOrder(1)
                .duration("10:00")
                .build();

        assertDoesNotThrow(() -> audioChapterRepository.saveAndFlush(chapter));
        AudioChapter retrievedChapter = audioChapterRepository.findById(chapterId).orElseThrow();
        assertThat(retrievedChapter.getAudioUrl()).isEqualTo(longAudioUrl);
    }
}
