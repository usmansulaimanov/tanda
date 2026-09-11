# Handoff Report — Independent Review & Adversarial Audit for Milestone M1

**Agent Archetype**: Reviewer & Adversarial Critic (Reviewer 2)  
**Milestone**: M1 (Core Security & Data Boundary Remediation)  
**Date**: 2026-09-10  
**Target Repository**: Tanda (Spring Boot 3.3.0 + React 18 / Vite 6)  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

Direct inspection of source files, Flyway migrations, build configurations, and test runs yielded the following verbatim observations:

1. **Flyway Migration V4 & JPA Entity Text / Unique Constraint Mappings**:
   - In `backend/src/main/resources/db/migration/V4__fix_schema_constraints_and_lengths.sql`:
     ```sql
     ALTER TABLE reading_progress ADD CONSTRAINT uq_reading_progress_user_book UNIQUE (user_id, book_id);
     ALTER TABLE books ALTER COLUMN cover_image TYPE TEXT;
     ALTER TABLE books ALTER COLUMN audio_url TYPE TEXT;
     ALTER TABLE audio_chapters ALTER COLUMN audio_url TYPE TEXT;
     ```
   - In `backend/src/main/java/com/tanda/entity/ReadingProgress.java` line 22:
     ```java
     @Table(name = "reading_progress", uniqueConstraints = {@UniqueConstraint(name = "uq_reading_progress_user_book", columnNames = {"user_id", "book_id"})})
     ```
   - In `backend/src/main/java/com/tanda/entity/Book.java` lines 46, 59, 62:
     ```java
     @Column(name = "pages")
     private Integer pages;
     @Column(name = "audio_url", columnDefinition = "TEXT")
     private String audioUrl;
     @Column(name = "cover_image", columnDefinition = "TEXT")
     private String coverImage;
     ```
   - In `backend/src/main/java/com/tanda/entity/AudioChapter.java` line 36:
     ```java
     @Column(name = "audio_url", columnDefinition = "TEXT", nullable = false)
     private String audioUrl;
     ```

2. **DTO Contracts for Nullable Pages**:
   - In `backend/src/main/java/com/tanda/dto/CreateBookRequestDto.java` lines 32-33:
     ```java
     @Min(value = 1, message = "Pages must be at least 1")
     private Integer pages;
     ```
   - In `backend/src/main/java/com/tanda/dto/UpdateBookRequestDto.java` lines 30-31:
     ```java
     @Min(value = 1, message = "Pages must be at least 1")
     private Integer pages;
     ```
   - `@NotNull` was removed while retaining `@Min(1)`. Because Jakarta Bean Validation specification treats `null` elements as valid for `@Min`, audiobooks can supply `pages = null` without validation errors.

3. **Reading Progress DTO vs Controller Validation Boundary**:
   - In `backend/src/main/java/com/tanda/dto/progress/ReadingProgressRequestDto.java` lines 17-23:
     ```java
     @Min(value = 1, message = "Current page must be at least 1")
     private Integer currentPage;

     private String currentAudioChapterId;

     @Min(value = 0, message = "Current audio time must be non-negative")
     private Integer currentAudioTime;
     ```
   - In `backend/src/main/java/com/tanda/controller/ReadingProgressController.java` lines 36-41:
     ```java
     @PutMapping("/{bookId}")
     public ResponseEntity<ReadingProgressResponseDto> updateProgress(
             @AuthenticationPrincipal UserPrincipal principal,
             @PathVariable String bookId,
             @RequestBody ReadingProgressRequestDto request
     )
     ```
   - Line 40 has `@RequestBody ReadingProgressRequestDto request` WITHOUT `@Valid` or `@Validated`. In contrast, `BookController.java` line 50 uses `@Valid @RequestBody CreateBookRequestDto request`, and line 58 uses `@Valid @RequestBody UpdateBookRequestDto request`.

4. **Archived Book Access Inconsistency**:
   - In `backend/src/main/java/com/tanda/service/BookService.java` lines 50-57:
     ```java
     if (Boolean.TRUE.equals(book.getIsArchived())) {
         Authentication auth = SecurityContextHolder.getContext().getAuthentication();
         boolean isAdmin = auth != null && auth.getAuthorities() != null &&
                 auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
         if (!isAdmin) {
             throw new ResourceNotFoundException("Book", "id", id);
         }
     }
     ```
     `getBookById(id)` properly conceals archived books from non-admin callers.
   - In `backend/src/main/java/com/tanda/controller/BookController.java` lines 35-41:
     ```java
     @GetMapping
     public ResponseEntity<List<BookResponseDto>> getAllBooks(
             @RequestParam(required = false) String category,
             @RequestParam(required = false) String search,
             @RequestParam(required = false, defaultValue = "false") boolean includeArchived) {
         List<BookResponseDto> books = bookService.getBooks(category, search, includeArchived);
         return ResponseEntity.ok(books);
     }
     ```
   - In `backend/src/main/java/com/tanda/service/BookService.java` line 39:
     ```java
     List<Book> books = bookRepository.searchBooks(cat, q, includeArchived);
     ```
   - In `backend/src/main/java/com/tanda/config/SecurityConfig.java` line 47:
     ```java
     .requestMatchers(HttpMethod.GET, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").permitAll()
     ```
   - Any unauthenticated caller who submits `GET /api/books?includeArchived=true` or `GET /api/v1/books?includeArchived=true` retrieves all archived books in the response without any authentication or role checks.

5. **Last Admin Account Protection Guard**:
   - In `backend/src/main/java/com/tanda/service/UserService.java` lines 58-65 and 90-97:
     ```java
     if (isAdmin && Boolean.TRUE.equals(user.getIsActive()) && (willDemote || willDeactivate)) {
         long otherActiveAdminCount = userRepository.findByRole("admin").stream()
                 .filter(u -> !u.getId().equals(id) && Boolean.TRUE.equals(u.getIsActive()))
                 .count();
         if (otherActiveAdminCount < 1) {
             throw new BadRequestException("Cannot deactivate or demote the last remaining admin");
         }
     }
     ```
     And for deletion:
     ```java
     if ("admin".equalsIgnoreCase(user.getRole())) {
         long otherActiveAdminCount = userRepository.findByRole("admin").stream()
                 .filter(u -> !u.getId().equals(id) && Boolean.TRUE.equals(u.getIsActive()))
                 .count();
         if (otherActiveAdminCount < 1) {
             throw new BadRequestException("Cannot delete the last remaining admin");
         }
     }
     ```

6. **Automated Builds & Test Results**:
   - `sh ./gradlew test` in `backend/`: PASS (`BUILD SUCCESSFUL in 5s`, all unit and integration tests green).
   - `npm run build` in `frontend/`: PASS (`tsc && vite build` completed cleanly in 1.56s).

---

## 2. Logic Chain

1. **Schema & Capacity Durability (Observations 1 & 2)**:
   - Migration V4 creates `uq_reading_progress_user_book` which aligns with `ReadingProgress.java` unique constraint definition and ensures duplicate rows for `(user_id, book_id)` cannot be created even under concurrent requests.
   - Changing `cover_image`, `audio_url`, and `audio_chapters.audio_url` to `TEXT` in Flyway and JPA removes the 1024-character ceiling, allowing base64 Data URLs to be stored cleanly.
   - Removing `@NotNull` on `pages` while retaining `@Min(1)` in `CreateBookRequestDto` and `UpdateBookRequestDto` allows audiobooks to have `null` pages while forbidding zero or negative pages for physical/ebook entries.

2. **Inactive Validation Boundary on Reading Progress (Observation 3)**:
   - In Spring MVC, Jakarta Bean Validation annotations placed on DTO fields (`@Min`, `@NotNull`, etc.) are only triggered when the controller method parameter is annotated with `@Valid` or `@Validated`.
   - Because `ReadingProgressController.java:40` declares `@RequestBody ReadingProgressRequestDto request` without `@Valid`, Spring skips constraint validation entirely when parsing incoming JSON.
   - Consequently, an authenticated user can submit negative values (e.g. `{"currentPage": -50, "currentAudioTime": -3600}`). These values are accepted without rejection and persisted directly to the database. The worker's claim in handoff.md that "Adding @Min(1) on currentPage and @Min(0) on currentAudioTime in ReadingProgressRequestDto stops negative progress values at the DTO validation boundary" is non-functional at runtime.

3. **Archived Book Data Leakage (Observation 4)**:
   - `PROJECT.md` specifies interface contract: `GET /api/books/**, GET /api/v1/books/**: permitAll() (excluding archived books for non-admin)`.
   - While `BookService.getBookById` guards individual book retrieval by checking for `ROLE_ADMIN`, `BookController.getAllBooks` exposes an optional query parameter `includeArchived`.
   - Neither `BookController` nor `BookService.getBooks` checks the caller's security context or authorities when `includeArchived=true`. Because `GET /api/books` is `permitAll()`, an unauthenticated attacker can dump all archived books by sending `GET /api/books?includeArchived=true`.

4. **Last Admin Guard Effectiveness (Observation 5)**:
   - In `UserService`, the guard queries `findByRole("admin")` and filters out the current user ID and any inactive admins (`u.getIsActive() == true`).
   - If `otherActiveAdminCount < 1`, deleting, deactivating (`isActive=false`), or demoting (`role != "admin"`) triggers `BadRequestException`. This prevents lockout and conforms to Feature 11.

---

## 3. Caveats

- **Concurrency Isolation for Admin Deletion**: The last-admin guard in `UserService` executes in a Spring `@Transactional` block with standard read committed isolation. Under extreme simultaneous administrative actions, two concurrent delete requests could hypothetically pass the count check without row-level locking (`PESSIMISTIC_WRITE`). However, for the scope of M1 and standard administrative loads, this is acceptable.
- **Client Route Guards**: Frontend admin routes (`#/admin`) do not possess client-side route navigation guards, relying on backend 403 responses. This was noted in the worker handoff and is part of M2/M3 frontend hardening.
- No other caveats.

---

## 4. Conclusion

### Final Assessment: **REQUEST_CHANGES**

While the database schema migrations (V4), entity definitions, last-admin deletion guard, and build pipelines are implemented well, two critical gaps prevent approval of Milestone M1:

### Required Changes:

1. **[CRITICAL / HIGH] Add `@Valid` to `ReadingProgressController.updateProgress`**:
   - **Location**: `backend/src/main/java/com/tanda/controller/ReadingProgressController.java:40`
   - **Issue**: Missing `@Valid` prevents `@Min(1)` and `@Min(0)` on `ReadingProgressRequestDto` from being evaluated, allowing negative progress values to enter the database.
   - **Fix**: Change line 40 to:
     ```java
     @Valid @RequestBody ReadingProgressRequestDto request
     ```

2. **[HIGH] Restrict `includeArchived=true` in `BookService.getBooks`**:
   - **Location**: `backend/src/main/java/com/tanda/service/BookService.java:31-43`
   - **Issue**: Unauthenticated callers can bypass archived book protection by requesting `GET /api/books?includeArchived=true`.
   - **Fix**: In `BookService.getBooks`, inspect `SecurityContextHolder.getContext().getAuthentication()`. If `includeArchived == true` and the caller does not have `ROLE_ADMIN`, force `includeArchived = false` (or throw an exception). For example:
     ```java
     Authentication auth = SecurityContextHolder.getContext().getAuthentication();
     boolean isAdmin = auth != null && auth.getAuthorities() != null &&
             auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
     boolean effectiveIncludeArchived = includeArchived && isAdmin;
     List<Book> books = bookRepository.searchBooks(cat, q, effectiveIncludeArchived);
     ```

---

## 5. Verification Method

To independently verify all findings and test suite execution:

1. **Verify Backend Build & Unit/Integration Tests**:
   ```bash
   cd "/Users/usman/Desktop/tanda site/backend"
   sh ./gradlew test
   ```
   *Expected Result*: `BUILD SUCCESSFUL`, all test classes pass.

2. **Verify Missing `@Valid` on Reading Progress**:
   Inspect `backend/src/main/java/com/tanda/controller/ReadingProgressController.java` line 40 and observe that `@Valid` is missing on `@RequestBody ReadingProgressRequestDto request`.

3. **Verify Public Archived Book Leakage**:
   Inspect `backend/src/main/java/com/tanda/service/BookService.java` line 31 and `BookController.java` line 38, confirming `includeArchived` is unconstrained by administrative role checks.

4. **Verify Frontend Build**:
   ```bash
   cd "/Users/usman/Desktop/tanda site/frontend"
   npm run build
   ```
   *Expected Result*: TypeScript typecheck and Vite build succeed with 0 errors.
