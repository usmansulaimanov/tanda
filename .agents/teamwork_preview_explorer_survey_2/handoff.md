# Handoff Report: IDOR & Data Boundary Survey

## 1. Observation

### Exact File Paths & Code Evidence
1. **Missing `/api/v1/admin/**` RBAC Protection:**
   - File: `backend/src/main/java/com/tanda/config/SecurityConfig.java:54-63`
     ```java
     // Admin-only endpoints
     .requestMatchers(HttpMethod.POST, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
     .requestMatchers(HttpMethod.PUT, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
     .requestMatchers(HttpMethod.PATCH, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
     .requestMatchers(HttpMethod.DELETE, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
     .requestMatchers("/api/admin/**").hasRole("ADMIN")

     // All other requests require authentication
     .anyRequest().authenticated()
     ```
   - File: `backend/src/main/java/com/tanda/controller/UserController.java:22`
     ```java
     @RestController
     @RequestMapping({"/api/admin/users", "/api/v1/admin/users"})
     @RequiredArgsConstructor
     public class UserController {
     ```
   - Line 9 in `UserController.java` imports `org.springframework.security.access.prepost.PreAuthorize`, but `@PreAuthorize` is never annotated on the class or methods. `SecurityConfig` does not annotate `@EnableMethodSecurity`.

2. **Missing PermitAll on `/api/v1/auth/login` and `/api/v1/auth/register`:**
   - File: `backend/src/main/java/com/tanda/config/SecurityConfig.java:46`
     ```java
     .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout").permitAll()
     ```
   - File: `backend/src/main/java/com/tanda/controller/AuthController.java:23`
     ```java
     @RestController
     @RequestMapping({"/api/auth", "/api/v1/auth"})
     ```

3. **Archived Book Data Exposure via IDOR / Direct Reference:**
   - File: `backend/src/main/java/com/tanda/config/SecurityConfig.java:45`
     ```java
     .requestMatchers(HttpMethod.GET, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").permitAll()
     ```
   - File: `backend/src/main/java/com/tanda/service/BookService.java:44-48`
     ```java
     @Transactional(readOnly = true)
     public BookDetailResponseDto getBookById(String id) {
         Book book = bookRepository.findById(id)
                 .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
         return toDetailResponseDto(book);
     }
     ```
     Does not evaluate `book.getIsArchived()`.

4. **Missing Unique Constraint on Reading Progress:**
   - File: `backend/src/main/resources/db/migration/V1__init_books_schema.sql:28-40`
     ```sql
     CREATE TABLE reading_progress (
         id VARCHAR(64) PRIMARY KEY,
         book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
         user_id VARCHAR(64) NOT NULL,
         current_page INT DEFAULT 1,
         current_audio_chapter_id VARCHAR(64),
         current_audio_time INT DEFAULT 0,
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
     );
     CREATE INDEX idx_reading_progress_user_book ON reading_progress(user_id, book_id);
     ```
     Lacks `UNIQUE (user_id, book_id)`.
   - File: `backend/src/main/java/com/tanda/repository/ReadingProgressRepository.java:12`
     ```java
     Optional<ReadingProgress> findByUserIdAndBookId(String userId, String bookId);
     ```

5. **SQL / JPQL Injection Audit:**
   - File: `backend/src/main/java/com/tanda/repository/BookRepository.java:18-27` and `UserRepository.java:23-26` use Spring Data `@Param` parameterized binding with no dynamic query string concatenation.
   - Grep search for `createNativeQuery`, `createQuery`, `JdbcTemplate`, `EntityManager` in `backend/src/main/java` returned 0 results.

6. **Build and Test Baseline:**
   - Executed `sh gradlew test` in `backend`:
     `BUILD SUCCESSFUL in 599ms`, 4 tasks up-to-date.

---

## 2. Logic Chain

1. **Premise 1:** Spring Security filters evaluate URL request patterns from top to bottom against the incoming URI. If an incoming URI matches none of the preceding patterns, it falls into `.anyRequest().authenticated()`.
2. **Observation 1:** `SecurityConfig.java:58` specifies `.requestMatchers("/api/admin/**").hasRole("ADMIN")`. It does not specify `/api/v1/admin/**`.
3. **Observation 2:** `UserController.java:22` specifies `@RequestMapping({"/api/admin/users", "/api/v1/admin/users"})`.
4. **Deduction 1:** When a user requests `/api/v1/admin/users`, Spring Security bypasses the `/api/admin/**` rule and evaluates line 61 `.anyRequest().authenticated()`. Any valid JWT token (including regular `ROLE_CLIENT`) passes authentication.
5. **Observation 3:** `UserController` exposes `GET /api/v1/admin/users` (dumps all users), `GET /api/v1/admin/users/{id}` (reads any user profile), `PATCH /api/v1/admin/users/{id}` (modifies user role to `admin` or active flag), and `DELETE /api/v1/admin/users/{id}` (deletes any user).
6. **Deduction 2:** Any client user can manipulate `{id}` in the `/api/v1/admin/users` path to read, mutate, or delete arbitrary user profiles, or elevate their own role to `admin` (VULN-01: Critical IDOR and Privilege Escalation).
7. **Observation 4:** In `ReadingProgressService.java:26`, `getProgress` uses `principal.getId()`, and in line 43, `updateProgress` uses `principal.getId()`. In `SavedBookService.java:31-74`, all queries use `principal.getId()`.
8. **Deduction 3:** Normal user reading progress and saved books endpoints properly enforce row-level tenant boundary isolation based on the authenticated token principal. User A cannot view or mutate User B's saved books or reading progress through standard `/api/saved-books` or `/api/progress` routes.
9. **Observation 5:** `reading_progress` table and entity lack a unique constraint on `(user_id, book_id)`.
10. **Deduction 4:** Two simultaneous progress update requests will insert two rows for the same user and book. Subsequent calls to `findByUserIdAndBookId` throw `NonUniqueResultException` (HTTP 500), breaking the user's progress tracking (VULN-04).

---

## 3. Caveats

- **No Caveats:** The entire backend source tree (`backend/src/main/java`), all configuration files (`application*.yml`), Flyway migrations (`db/migration`), test files (`src/test/java`), and frontend API interactions (`frontend/src`) were fully inspected.
- The investigation was conducted in read-only mode in accordance with the explorer role constraints; no source files were modified.

---

## 4. Conclusion

- The Tanda backend demonstrates strong data isolation design on user-scoped library resources (`SavedBook` and `ReadingProgress` under `/api/saved-books` and `/api/progress`), where repository queries consistently enforce the authenticated principal ID.
- However, a **critical authorization boundary hole** exists due to an asymmetric route matcher in `SecurityConfig`: `/api/v1/admin/**` is unprotected from standard authenticated clients, allowing regular users to dump all accounts, read any profile, elevate their account to `admin`, and delete any user account via IDOR.
- In addition, minor but impactful data boundary and integrity issues were identified:
  - Public unauthenticated disclosure of archived books via `GET /api/books/{id}`.
  - Race condition leading to persistent HTTP 500 in reading progress due to missing database unique constraint.
  - Unauthenticated 401 rejection on `/api/v1/auth/login` and `/api/v1/auth/register`.
  - Unvalidated chapter references and unbounded metrics in reading progress.
- All SQL/JPQL queries are safely parameterized against injection.
- Complete documentation of findings and remediation blueprints has been written to:
  `.agents/teamwork_preview_explorer_survey_2/survey_data_isolation.md`.

---

## 5. Verification Method

### Test Commands to Run:
```bash
cd "/Users/usman/Desktop/tanda site/backend"
sh gradlew test
```

### Direct Verification Scenarios for Discovered Flaws:
1. **Verify VULN-01 (Missing `/api/v1/admin/**` Protection):**
   - In a test case or cURL, register a client user (`ROLE_CLIENT`).
   - Issue `GET /api/v1/admin/users` with the client's Bearer token.
   - *Expected before fix:* Returns HTTP 200 OK with full user list (Vulnerability Confirmed).
   - *Expected after fix:* Returns HTTP 403 Forbidden.
2. **Verify VULN-02 (Missing `/api/v1/auth/**` PermitAll):**
   - Issue `POST /api/v1/auth/login` without Authorization header.
   - *Expected before fix:* Returns HTTP 401 Unauthorized.
   - *Expected after fix:* Returns HTTP 200 OK with JWT token.
3. **Verify VULN-03 (Archived Book Exposure):**
   - Set `isArchived = true` on `test-book-1`.
   - Issue `GET /api/v1/books/test-book-1` without authentication.
   - *Expected before fix:* Returns HTTP 200 OK with book and audio chapter URLs.
   - *Expected after fix:* Returns HTTP 404 Not Found.
4. **Verify VULN-04 (Unique Constraint Race Condition):**
   - Check Flyway schema: `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='reading_progress'`.

### Invalidation Conditions:
- If `SecurityConfig` is modified to include `.requestMatchers("/api/admin/**", "/api/v1/admin/**").hasRole("ADMIN")` and `@EnableMethodSecurity`, VULN-01 will be resolved and tests checking 403 will pass.
