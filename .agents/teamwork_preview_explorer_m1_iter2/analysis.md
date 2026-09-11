# Detailed Remediation Analysis & Technical Fix Strategy
**Milestone**: M1 Iteration 2 Remediation  
**Target Project**: Tanda (Spring Boot 3.3.0 + React 18 / Vite 6)  
**Author**: Explorer (Milestone M1 Iteration 2)  
**Date**: 2026-09-10  

---

## 1. Context & Remediation Scope

During Milestone M1 Gate 1 evaluation, Reviewer 2 returned a verdict of `REQUEST_CHANGES`, and Reviewer 1 and Challenger 1 surfaced high-priority findings requiring remediation before proceeding to Milestone M2. The required fixes span four key areas:

1. **Reading Progress Validation Gap**: `ReadingProgressController.java:40` omits `@Valid` on `@RequestBody ReadingProgressRequestDto request`, allowing negative values (e.g. `currentPage < 1` or `currentAudioTime < 0`) to bypass Bean Validation at runtime.
2. **Archived Book Information Leak**: Public unauthenticated route `GET /api/books?includeArchived=true` (and `GET /api/v1/books?includeArchived=true`) returns archived books because `BookService.getBooks()` unconditionally executes `bookRepository.searchBooks()` with `includeArchived=true` without verifying caller authorities.
3. **Test Suite Isolation Failure**: `SavedBookAndProgressIntegrationTest` fails with assertion errors on line 61 and line 89 when run in isolation because it depends on `test-book-1` seeded exclusively by `BookControllerIntegrationTest`.
4. **Gradle 9.7.1 HTML Report Deserialization Failure**: Gradle 9.7.1 on macOS encounters `UncheckedIOException: java.io.EOFException` inside `GenericHtmlTestReportGenerator.generate()` unless configured with `reports.html.required = false`.

---

## 2. Technical Analysis & Step-by-Step Fix Specifications

### Item 1: Enable Bean Validation on `ReadingProgressController.java`

#### Root Cause Analysis
- `ReadingProgressRequestDto.java` defines `@Min(value = 1, message = "Current page must be at least 1")` on `currentPage` and `@Min(value = 0, message = "Current audio time must be non-negative")` on `currentAudioTime`.
- In Spring MVC, Jakarta Bean Validation annotations on DTO fields are only activated when the `@RequestBody` parameter is annotated with `@Valid` or `@Validated`.
- In `backend/src/main/java/com/tanda/controller/ReadingProgressController.java`, the parameter at line 40 is declared as `@RequestBody ReadingProgressRequestDto request` without `@Valid`.
- Consequently, Spring's `RequestResponseBodyMethodProcessor` deserializes incoming JSON payloads without executing validator constraints, allowing negative numbers (such as `-1` or `0`) to reach `ReadingProgressService.updateProgress` and persist into the database.

#### Exact Modifications
**Target File**: `backend/src/main/java/com/tanda/controller/ReadingProgressController.java`

1. **Add Import**:
   ```java
   import jakarta.validation.Valid;
   ```
2. **Update Method Parameter at Line 40**:
   ```java
   // BEFORE:
   @PutMapping("/{bookId}")
   public ResponseEntity<ReadingProgressResponseDto> updateProgress(
           @AuthenticationPrincipal UserPrincipal principal,
           @PathVariable String bookId,
           @RequestBody ReadingProgressRequestDto request
   )

   // AFTER:
   @PutMapping("/{bookId}")
   public ResponseEntity<ReadingProgressResponseDto> updateProgress(
           @AuthenticationPrincipal UserPrincipal principal,
           @PathVariable String bookId,
           @Valid @RequestBody ReadingProgressRequestDto request
   )
   ```

#### Expected Behavior
When an authenticated user submits an invalid body such as `{"currentPage": 0}` or `{"currentAudioTime": -5}`, Spring validation intercepts the payload and throws `MethodArgumentNotValidException`, which `GlobalExceptionHandler.handleValidationExceptions` handles by returning HTTP 400 Bad Request with field-level validation error details.

---

### Item 2: Restrict `includeArchived=true` in `BookService.java`

#### Root Cause Analysis
- In `PROJECT.md`, the interface contract specifies:  
  `GET /api/books/**, GET /api/v1/books/**: permitAll() (excluding archived books for non-admin)`.
- In `SecurityConfig.java:47`, `GET /api/books/**` and `GET /api/v1/books/**` are marked `permitAll()`.
- While `BookService.getBookById()` explicitly verifies `ROLE_ADMIN` before returning an archived book (throwing 404 if not admin), `BookController.getAllBooks` accepts `boolean includeArchived` from query parameters and forwards it to `BookService.getBooks()`.
- `BookService.getBooks()` previously forwarded `includeArchived` directly to `bookRepository.searchBooks(cat, q, includeArchived)` without inspecting `SecurityContextHolder`.
- As a result, an unauthenticated client or non-admin caller sending `GET /api/books?includeArchived=true` received all archived books in the response.

#### Exact Modifications
**Target File**: `backend/src/main/java/com/tanda/service/BookService.java`

1. **Add `isAdmin()` Helper Method**:
   Extract the authority check logic used in `getBookById` into a reusable helper method:
   ```java
   private boolean isAdmin() {
       Authentication auth = SecurityContextHolder.getContext().getAuthentication();
       return auth != null && auth.getAuthorities() != null &&
               auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
   }
   ```
2. **Update `getBooks()` (lines 31–43)**:
   Ensure `includeArchived` is effective ONLY if the caller is an active administrator:
   ```java
   // BEFORE:
   @Transactional(readOnly = true)
   public List<BookResponseDto> getBooks(String category, String search, boolean includeArchived) {
       String cat = (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("Барлығы")) 
               ? category.trim() 
               : null;
       String q = (search != null && !search.trim().isEmpty()) 
               ? search.trim() 
               : null;

       List<Book> books = bookRepository.searchBooks(cat, q, includeArchived);
       return books.stream()
               .map(this::toResponseDto)
               .collect(Collectors.toList());
   }

   // AFTER:
   @Transactional(readOnly = true)
   public List<BookResponseDto> getBooks(String category, String search, boolean includeArchived) {
       String cat = (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("Барлығы")) 
               ? category.trim() 
               : null;
       String q = (search != null && !search.trim().isEmpty()) 
               ? search.trim() 
               : null;

       boolean effectiveIncludeArchived = includeArchived && isAdmin();
       List<Book> books = bookRepository.searchBooks(cat, q, effectiveIncludeArchived);
       return books.stream()
               .map(this::toResponseDto)
               .collect(Collectors.toList());
   }
   ```
3. **Refactor `getBookById()` (lines 46–60)**:
   Use the helper method to keep logic DRY:
   ```java
   // BEFORE:
   if (Boolean.TRUE.equals(book.getIsArchived())) {
       Authentication auth = SecurityContextHolder.getContext().getAuthentication();
       boolean isAdmin = auth != null && auth.getAuthorities() != null &&
               auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
       if (!isAdmin) {
           throw new ResourceNotFoundException("Book", "id", id);
       }
   }

   // AFTER:
   if (Boolean.TRUE.equals(book.getIsArchived()) && !isAdmin()) {
       throw new ResourceNotFoundException("Book", "id", id);
   }
   ```

#### Expected Behavior
- Calling `GET /api/v1/books?includeArchived=true` anonymously or as a client user sets `effectiveIncludeArchived = false`. Only active, non-archived books are returned.
- Calling `GET /api/v1/books?includeArchived=true` as an authenticated user holding `ROLE_ADMIN` sets `effectiveIncludeArchived = true` and returns both active and archived books.

---

### Item 3: Stabilize Test Fixtures in `SavedBookAndProgressIntegrationTest.java`

#### Root Cause Analysis
- `SavedBookAndProgressIntegrationTest` tests `post("/api/saved-books/test-book-1")` and `put("/api/progress/test-book-1")`.
- `SavedBookService.saveBook()` and `ReadingProgressService.updateProgress()` both query `bookRepository.findById("test-book-1")` and throw `ResourceNotFoundException("Кітап табылмады id: test-book-1")` if the book entity does not exist in the database.
- Previously, `test-book-1` was only inserted into H2 in `BookControllerIntegrationTest.setUp()`.
- If `SavedBookAndProgressIntegrationTest` is executed alone (`--tests SavedBookAndProgressIntegrationTest`), or if test execution order changes, `test-book-1` is absent, causing HTTP 404 and failing assertions at lines 61 and 89 (`status().isCreated()` and `status().isOk()`).

#### Exact Modifications
**Target File**: `backend/src/test/java/com/tanda/controller/SavedBookAndProgressIntegrationTest.java`

1. **Add Required Imports**:
   ```java
   import com.tanda.entity.Book;
   import com.tanda.repository.BookRepository;
   import com.tanda.repository.ReadingProgressRepository;
   import com.tanda.repository.SavedBookRepository;

   import java.time.OffsetDateTime;
   import java.util.ArrayList;
   ```
2. **Inject Repositories**:
   ```java
   @Autowired
   private BookRepository bookRepository;

   @Autowired
   private SavedBookRepository savedBookRepository;

   @Autowired
   private ReadingProgressRepository progressRepository;
   ```
3. **Update `@BeforeEach void setUp()`**:
   Clean up previous state to ensure total test isolation, and verify/seed `test-book-1`:
   ```java
   @BeforeEach
   void setUp() throws Exception {
       // 1. Isolate test state by clearing previous user data
       savedBookRepository.deleteAll();
       progressRepository.deleteAll();

       // 2. Ensure test fixture book exists independently
       if (!bookRepository.existsById("test-book-1")) {
           Book testBook = Book.builder()
                   .id("test-book-1")
                   .title("Тест кітап")
                   .author("Тест автор")
                   .category("Классика")
                   .pages(150)
                   .hasAudio(true)
                   .audioNarrator("Диктор 1")
                   .audioDuration("1 сағат")
                   .audioUrl("https://example.com/audio.mp3")
                   .coverImage("https://example.com/cover.jpg")
                   .isFree(true)
                   .isArchived(false)
                   .gradient("linear-gradient(135deg, #000, #333)")
                   .description("Тест сипаттамасы")
                   .createdAt(OffsetDateTime.now())
                   .audioChapters(new ArrayList<>())
                   .build();
           bookRepository.save(testBook);
       }

       // 3. Authenticate admin user
       LoginRequestDto request = LoginRequestDto.builder()
               .email("admin@tanda.kz")
               .password("admin123")
               .build();

       MvcResult result = mockMvc.perform(post("/api/auth/login")
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isOk())
               .andReturn();

       String body = result.getResponse().getContentAsString();
       adminToken = objectMapper.readTree(body).path("token").asText();
   }
   ```
4. **Add Regression Tests for Bean Validation in `SavedBookAndProgressIntegrationTest.java`**:
   Verify that invalid reading progress requests fail validation:
   ```java
   @Test
   @DisplayName("Reading progress update rejects invalid currentPage (0) with 400 Bad Request")
   void testReadingProgressValidationInvalidPage() throws Exception {
       ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
               .currentPage(0) // Violates @Min(1)
               .currentAudioTime(10)
               .build();

       mockMvc.perform(put("/api/progress/test-book-1")
                       .header("Authorization", "Bearer " + adminToken)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(invalidDto)))
               .andExpect(status().isBadRequest());
   }

   @Test
   @DisplayName("Reading progress update rejects negative audio time (-1) with 400 Bad Request")
   void testReadingProgressValidationInvalidAudioTime() throws Exception {
       ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
               .currentPage(1)
               .currentAudioTime(-5) // Violates @Min(0)
               .build();

       mockMvc.perform(put("/api/progress/test-book-1")
                       .header("Authorization", "Bearer " + adminToken)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(invalidDto)))
               .andExpect(status().isBadRequest());
   }
   ```

---

### Item 4: Gradle 9.7.1 HTML Test Report Configuration in `backend/build.gradle`

#### Root Cause Analysis
- In Gradle 9.7.1 running on macOS, Gradle's internal `GenericHtmlTestReportGenerator.generate()` reads binary test result event streams and intermittently throws `UncheckedIOException: java.io.EOFException` inside `SerializableTestResultStore.hasResults()`.
- Disabling the HTML report via `reports.html.required = false` resolves this binary deserialization bug while still generating JUnit standard XML results (`build/test-results/test/`) and full console status output.

#### Exact Modifications
**Target File**: `backend/build.gradle`

Update lines 52–54:
```groovy
// BEFORE:
tasks.named('test') {
    useJUnitPlatform()
}

// AFTER:
tasks.named('test') {
    useJUnitPlatform()
    reports.html.required = false
}
```

---

## 3. Supplementary Regression Verification Tests

To verify Item 2 (Archived Book Access Protection) empirically, the worker should add the following two regression test cases to `backend/src/test/java/com/tanda/controller/BookControllerIntegrationTest.java`:

```java
@Test
@DisplayName("GET /api/v1/books?includeArchived=true unauthenticated does not return archived books")
void testGetBooksIncludeArchivedUnauthenticated() throws Exception {
    if (!bookRepository.existsById("archived-test-book-1")) {
        Book archivedBook = Book.builder()
                .id("archived-test-book-1")
                .title("Жасырын мұрағат кітабы")
                .author("Мұрағат автор")
                .category("Классика")
                .pages(100)
                .isArchived(true)
                .createdAt(OffsetDateTime.now())
                .build();
        bookRepository.save(archivedBook);
    }

    mockMvc.perform(get("/api/v1/books")
                    .param("includeArchived", "true")
                    .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == 'archived-test-book-1')]").doesNotExist());
}

@Test
@org.springframework.security.test.context.support.WithMockUser(roles = "ADMIN")
@DisplayName("GET /api/v1/books?includeArchived=true as ADMIN returns archived books")
void testGetBooksIncludeArchivedAdmin() throws Exception {
    if (!bookRepository.existsById("archived-test-book-1")) {
        Book archivedBook = Book.builder()
                .id("archived-test-book-1")
                .title("Жасырын мұрағат кітабы")
                .author("Мұрағат автор")
                .category("Классика")
                .pages(100)
                .isArchived(true)
                .createdAt(OffsetDateTime.now())
                .build();
        bookRepository.save(archivedBook);
    }

    mockMvc.perform(get("/api/v1/books")
                    .param("includeArchived", "true")
                    .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == 'archived-test-book-1')]").exists());
}
```

---

## 4. Execution Plan for Worker

| Step | Action | Files Touched | Verification |
|---|---|---|---|
| 1 | Configure Gradle test task | `backend/build.gradle` | Verify `reports.html.required = false` |
| 2 | Add `@Valid` on `ReadingProgressController` | `backend/src/main/java/com/tanda/controller/ReadingProgressController.java` | Check import and parameter |
| 3 | Restrict `includeArchived` to admins | `backend/src/main/java/com/tanda/service/BookService.java` | Check `isAdmin()` helper and effective parameter |
| 4 | Stabilize test suite and add validation tests | `backend/src/test/java/com/tanda/controller/SavedBookAndProgressIntegrationTest.java` | Run isolated test: `sh ./gradlew test --tests "com.tanda.controller.SavedBookAndProgressIntegrationTest"` |
| 5 | Add archived book authorization tests | `backend/src/test/java/com/tanda/controller/BookControllerIntegrationTest.java` | Run: `sh ./gradlew test --tests "com.tanda.controller.BookControllerIntegrationTest"` |
| 6 | Execute full test suite | Whole backend suite | `sh ./gradlew test` (100% green status) |
| 7 | Execute frontend build | Whole frontend | `cd frontend && npm run build` (0 type errors) |

---

## 5. Risk Assessment & Safety Invariants

1. **Zero Impact on Active Book Readers**: The change in `BookService.getBooks` only alters behavior when `includeArchived=true` is requested by non-admins. The default query (`includeArchived=false`) retains identical behavior.
2. **Backwards Compatibility**: Audiobooks with `pages = null` continue to be supported because `@Min(1)` ignores `null`.
3. **Flyway Migration V4**: No further schema modifications are required; Flyway V4 remains intact.
