package com.tanda;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.dto.progress.ReadingProgressResponseDto;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.repository.BookRepository;
import com.tanda.repository.ReadingProgressRepository;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import com.tanda.service.BookService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class Challenger1M1Iter2EmpiricalVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private ReadingProgressRepository progressRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private BookService bookService;

    private Validator validator;

    private User testClientUser;
    private User testAdminUser;
    private String clientToken;
    private String adminToken;

    private static final String ACTIVE_BOOK_ID = "c1-iter2-active-book";
    private static final String ARCHIVED_BOOK_ID = "c1-iter2-archived-book";

    @BeforeEach
    void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();

        // 1. Seed or retrieve test client and admin users
        testClientUser = userRepository.findByEmail("client_challenger_iter2@tanda.kz").orElseGet(() -> {
            User u = User.builder()
                    .id("user-c1-i2-" + UUID.randomUUID().toString().substring(0, 8))
                    .idNumber("999 001")
                    .name("Client Challenger Iter2")
                    .email("client_challenger_iter2@tanda.kz")
                    .passwordHash("$2a$10$abcdefghijklmnopqrstuvwxyz1234567890")
                    .role("client")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            return userRepository.save(u);
        });

        testAdminUser = userRepository.findByEmail("admin@tanda.kz").orElseThrow();

        clientToken = jwtTokenProvider.generateToken(testClientUser);
        adminToken = jwtTokenProvider.generateToken(testAdminUser);

        // 2. Ensure active test book exists
        if (!bookRepository.existsById(ACTIVE_BOOK_ID)) {
            Book activeBook = Book.builder()
                    .id(ACTIVE_BOOK_ID)
                    .title("Белсенді кітап")
                    .author("Белсенді автор")
                    .category("Ғылым")
                    .pages(200)
                    .hasAudio(true)
                    .audioNarrator("Диктор 1")
                    .audioDuration("2 сағат")
                    .audioUrl("https://example.com/active.mp3")
                    .coverImage("https://example.com/active.jpg")
                    .isFree(true)
                    .isArchived(false)
                    .createdAt(OffsetDateTime.now())
                    .audioChapters(new ArrayList<>())
                    .build();
            bookRepository.save(activeBook);
        }

        // 3. Ensure archived test book exists
        if (!bookRepository.existsById(ARCHIVED_BOOK_ID)) {
            Book archivedBook = Book.builder()
                    .id(ARCHIVED_BOOK_ID)
                    .title("Архивтелген құпия кітап")
                    .author("Архив автор")
                    .category("Тарих")
                    .pages(150)
                    .hasAudio(false)
                    .isFree(false)
                    .isArchived(true)
                    .createdAt(OffsetDateTime.now())
                    .audioChapters(new ArrayList<>())
                    .build();
            bookRepository.save(archivedBook);
        }

        // 4. Clear progress table for isolation
        progressRepository.deleteAll();

        // 5. Clear SecurityContextHolder
        SecurityContextHolder.clearContext();
    }

    // =========================================================================
    // TASK 1: Reading Progress Bean Validation (currentPage=0, currentAudioTime=-5)
    // =========================================================================
    @Nested
    @DisplayName("Task 1: Reading Progress Bean Validation & HTTP 400 Bad Request")
    class ReadingProgressBeanValidationTests {

        @Test
        @DisplayName("1.1 Jakarta Validator: ReadingProgressRequestDto with currentPage=0 fails @Min(1)")
        void testDtoValidationCurrentPageZero() {
            ReadingProgressRequestDto dto = ReadingProgressRequestDto.builder()
                    .currentPage(0)
                    .currentAudioTime(10)
                    .build();

            Set<ConstraintViolation<ReadingProgressRequestDto>> violations = validator.validate(dto);
            assertThat(violations).hasSize(1);
            ConstraintViolation<ReadingProgressRequestDto> v = violations.iterator().next();
            assertThat(v.getPropertyPath().toString()).isEqualTo("currentPage");
            assertThat(v.getMessage()).isEqualTo("Current page must be at least 1");
        }

        @Test
        @DisplayName("1.2 Jakarta Validator: ReadingProgressRequestDto with currentAudioTime=-5 fails @Min(0)")
        void testDtoValidationCurrentAudioTimeNegative() {
            ReadingProgressRequestDto dto = ReadingProgressRequestDto.builder()
                    .currentPage(5)
                    .currentAudioTime(-5)
                    .build();

            Set<ConstraintViolation<ReadingProgressRequestDto>> violations = validator.validate(dto);
            assertThat(violations).hasSize(1);
            ConstraintViolation<ReadingProgressRequestDto> v = violations.iterator().next();
            assertThat(v.getPropertyPath().toString()).isEqualTo("currentAudioTime");
            assertThat(v.getMessage()).isEqualTo("Current audio time must be non-negative");
        }

        @Test
        @DisplayName("1.3 Jakarta Validator: ReadingProgressRequestDto with both currentPage=0 and currentAudioTime=-5 yields 2 violations")
        void testDtoValidationBothInvalid() {
            ReadingProgressRequestDto dto = ReadingProgressRequestDto.builder()
                    .currentPage(0)
                    .currentAudioTime(-5)
                    .build();

            Set<ConstraintViolation<ReadingProgressRequestDto>> violations = validator.validate(dto);
            assertThat(violations).hasSize(2);
        }

        @Test
        @DisplayName("1.4 PUT /api/v1/progress/{bookId} with currentPage=0 returns HTTP 400 Bad Request")
        void testPutV1ProgressCurrentPageZeroReturns400() throws Exception {
            ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
                    .currentPage(0)
                    .currentAudioTime(10)
                    .build();

            mockMvc.perform(put("/api/v1/progress/" + ACTIVE_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidDto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.error", is("Bad Request")))
                    .andExpect(jsonPath("$.message", containsString("Current page must be at least 1")));
        }

        @Test
        @DisplayName("1.5 PUT /api/v1/progress/{bookId} with negative page (currentPage=-1) returns HTTP 400 Bad Request")
        void testPutV1ProgressCurrentPageNegativeReturns400() throws Exception {
            ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
                    .currentPage(-1)
                    .currentAudioTime(0)
                    .build();

            mockMvc.perform(put("/api/v1/progress/" + ACTIVE_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidDto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.error", is("Bad Request")));
        }

        @Test
        @DisplayName("1.6 PUT /api/v1/progress/{bookId} with negative audio time (currentAudioTime=-5) returns HTTP 400 Bad Request")
        void testPutV1ProgressAudioTimeNegativeFiveReturns400() throws Exception {
            ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
                    .currentPage(1)
                    .currentAudioTime(-5)
                    .build();

            mockMvc.perform(put("/api/v1/progress/" + ACTIVE_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidDto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.error", is("Bad Request")))
                    .andExpect(jsonPath("$.message", containsString("Current audio time must be non-negative")));
        }

        @Test
        @DisplayName("1.7 PUT /api/v1/progress/{bookId} with boundary below zero (currentAudioTime=-1) returns HTTP 400 Bad Request")
        void testPutV1ProgressAudioTimeMinusOneReturns400() throws Exception {
            ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
                    .currentPage(1)
                    .currentAudioTime(-1)
                    .build();

            mockMvc.perform(put("/api/v1/progress/" + ACTIVE_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidDto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.error", is("Bad Request")));
        }

        @Test
        @DisplayName("1.8 PUT /api/v1/progress/{bookId} with both currentPage=0 AND currentAudioTime=-5 returns HTTP 400 Bad Request")
        void testPutV1ProgressBothInvalidReturns400() throws Exception {
            ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
                    .currentPage(0)
                    .currentAudioTime(-5)
                    .build();

            mockMvc.perform(put("/api/v1/progress/" + ACTIVE_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidDto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.error", is("Bad Request")));
        }

        @Test
        @DisplayName("1.9 Unversioned route PUT /api/progress/{bookId} with currentPage=0 returns HTTP 400 Bad Request")
        void testPutUnversionedProgressCurrentPageZeroReturns400() throws Exception {
            ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
                    .currentPage(0)
                    .currentAudioTime(10)
                    .build();

            mockMvc.perform(put("/api/progress/" + ACTIVE_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidDto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.error", is("Bad Request")));
        }

        @Test
        @DisplayName("1.10 Unversioned route PUT /api/progress/{bookId} with currentAudioTime=-5 returns HTTP 400 Bad Request")
        void testPutUnversionedProgressAudioTimeNegativeReturns400() throws Exception {
            ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
                    .currentPage(1)
                    .currentAudioTime(-5)
                    .build();

            mockMvc.perform(put("/api/progress/" + ACTIVE_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidDto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status", is(400)))
                    .andExpect(jsonPath("$.error", is("Bad Request")));
        }

        @Test
        @DisplayName("1.11 Valid progress boundary (currentPage=1, currentAudioTime=0) returns HTTP 200 OK")
        void testPutValidProgressSucceeds() throws Exception {
            ReadingProgressRequestDto validDto = ReadingProgressRequestDto.builder()
                    .currentPage(1)
                    .currentAudioChapterId("ch-1")
                    .currentAudioTime(0)
                    .build();

            mockMvc.perform(put("/api/v1/progress/" + ACTIVE_BOOK_ID)
                            .header("Authorization", "Bearer " + clientToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validDto)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentPage", is(1)))
                    .andExpect(jsonPath("$.currentAudioTime", is(0)));
        }
    }

    // =========================================================================
    // TASK 2: GET /api/v1/books?includeArchived=true Access Control Verification
    // =========================================================================
    @Nested
    @DisplayName("Task 2: Book Archive Filtering and Access Control")
    class BookArchiveFilteringAccessControlTests {

        @Test
        @DisplayName("2.1 GET /api/v1/books?includeArchived=true unauthenticated does NOT return archived books")
        void testGetBooksIncludeArchivedUnauthenticated() throws Exception {
            mockMvc.perform(get("/api/v1/books")
                            .param("includeArchived", "true")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + ACTIVE_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')]").doesNotExist());
        }

        @Test
        @DisplayName("2.2 GET /api/books?includeArchived=true (unversioned) unauthenticated does NOT return archived books")
        void testGetBooksIncludeArchivedUnversionedUnauthenticated() throws Exception {
            mockMvc.perform(get("/api/books")
                            .param("includeArchived", "true")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + ACTIVE_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')]").doesNotExist());
        }

        @Test
        @DisplayName("2.3 GET /api/v1/books?includeArchived=true with ROLE_CLIENT Bearer token does NOT return archived books")
        void testGetBooksIncludeArchivedAsClientDoesNotReturnArchived() throws Exception {
            mockMvc.perform(get("/api/v1/books")
                            .param("includeArchived", "true")
                            .header("Authorization", "Bearer " + clientToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + ACTIVE_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')]").doesNotExist());
        }

        @Test
        @DisplayName("2.4 GET /api/books?includeArchived=true (unversioned) with ROLE_CLIENT Bearer token does NOT return archived books")
        void testGetBooksIncludeArchivedUnversionedAsClientDoesNotReturnArchived() throws Exception {
            mockMvc.perform(get("/api/books")
                            .param("includeArchived", "true")
                            .header("Authorization", "Bearer " + clientToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + ACTIVE_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')]").doesNotExist());
        }

        @Test
        @DisplayName("2.5 GET /api/v1/books?includeArchived=true with ROLE_ADMIN Bearer token DOES return archived books")
        void testGetBooksIncludeArchivedAsAdminReturnsArchived() throws Exception {
            mockMvc.perform(get("/api/v1/books")
                            .param("includeArchived", "true")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + ACTIVE_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')].isArchived").value(true));
        }

        @Test
        @DisplayName("2.6 GET /api/books?includeArchived=true (unversioned) with ROLE_ADMIN Bearer token DOES return archived books")
        void testGetBooksIncludeArchivedUnversionedAsAdminReturnsArchived() throws Exception {
            mockMvc.perform(get("/api/books")
                            .param("includeArchived", "true")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + ACTIVE_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')].isArchived").value(true));
        }

        @Test
        @DisplayName("2.7 GET /api/v1/books default (includeArchived omitted) with ROLE_ADMIN does NOT return archived books")
        void testGetBooksDefaultAsAdminDoesNotReturnArchived() throws Exception {
            mockMvc.perform(get("/api/v1/books")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + ACTIVE_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')]").doesNotExist());
        }

        @Test
        @DisplayName("2.8 GET /api/v1/books?includeArchived=false with ROLE_ADMIN does NOT return archived books")
        void testGetBooksExplicitFalseAsAdminDoesNotReturnArchived() throws Exception {
            mockMvc.perform(get("/api/v1/books")
                            .param("includeArchived", "false")
                            .header("Authorization", "Bearer " + adminToken)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + ACTIVE_BOOK_ID + "')]").exists())
                    .andExpect(jsonPath("$[?(@.id == '" + ARCHIVED_BOOK_ID + "')]").doesNotExist());
        }

        @Test
        @DisplayName("2.9 Direct BookService call: getBooks with includeArchived=true without admin auth filters archived books")
        void testDirectBookServiceUnauthenticatedFiltersArchived() {
            SecurityContextHolder.clearContext();
            var books = bookService.getBooks(null, null, true);
            boolean containsArchived = books.stream().anyMatch(b -> ARCHIVED_BOOK_ID.equals(b.getId()));
            boolean containsActive = books.stream().anyMatch(b -> ACTIVE_BOOK_ID.equals(b.getId()));

            assertThat(containsActive).isTrue();
            assertThat(containsArchived).isFalse();
        }

        @Test
        @DisplayName("2.10 Direct BookService call: getBooks with includeArchived=true and ROLE_CLIENT filters archived books")
        void testDirectBookServiceRoleClientFiltersArchived() {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken("client", "pass", List.of(new SimpleGrantedAuthority("ROLE_CLIENT")))
            );
            var books = bookService.getBooks(null, null, true);
            boolean containsArchived = books.stream().anyMatch(b -> ARCHIVED_BOOK_ID.equals(b.getId()));
            boolean containsActive = books.stream().anyMatch(b -> ACTIVE_BOOK_ID.equals(b.getId()));

            assertThat(containsActive).isTrue();
            assertThat(containsArchived).isFalse();
        }

        @Test
        @DisplayName("2.11 Direct BookService call: getBooks with includeArchived=true and ROLE_ADMIN includes archived books")
        void testDirectBookServiceRoleAdminIncludesArchived() {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken("admin", "pass", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
            );
            var books = bookService.getBooks(null, null, true);
            boolean containsArchived = books.stream().anyMatch(b -> ARCHIVED_BOOK_ID.equals(b.getId()));
            boolean containsActive = books.stream().anyMatch(b -> ACTIVE_BOOK_ID.equals(b.getId()));

            assertThat(containsActive).isTrue();
            assertThat(containsArchived).isTrue();
        }
    }
}
