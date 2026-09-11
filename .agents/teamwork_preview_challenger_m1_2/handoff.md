# Milestone M1 Challenger 2 Verification & Handoff Report

**Agent Archetype**: Empirical Challenger  
**Milestone**: M1 (Core Security & Data Boundary Remediation)  
**Date**: 2026-09-10  
**Target Repository**: Tanda (Spring Boot 3.3.0 + React 18 / Vite 6)  
**Working Directory**: `/Users/usman/Desktop/tanda site/.agents/teamwork_preview_challenger_m1_2/`  
**Verdict**: **APPROVE** (Milestone M1 Data Boundary & Domain Logic Remediations)

---

## 1. Observation

Direct examination of implementation files and independent execution of empirical test suites yielded the following verbatim observations:

1. **Audiobook Creation with Null Pages (Task 1)**:
   - In `backend/src/main/java/com/tanda/dto/CreateBookRequestDto.java` lines 32–33 and `UpdateBookRequestDto.java` lines 30–31:
     ```java
     @Min(value = 1, message = "Pages must be at least 1")
     private Integer pages;
     ```
     `@NotNull` was removed while preserving `@Min(1)`. By Jakarta Bean Validation specification, `@Min` evaluates `null` as valid.
   - In `backend/src/main/resources/db/migration/V3__alter_books_pages_nullable.sql` line 2:
     ```sql
     ALTER TABLE books ALTER COLUMN pages DROP NOT NULL;
     ```
   - In `backend/src/main/java/com/tanda/entity/Book.java` lines 46–47:
     ```java
     @Column(name = "pages")
     private Integer pages;
     ```
   - Verified via `Challenger2M1EmpiricalVerificationTest`:
     * `Task 1.1: CreateBookRequestDto with pages = null passes Jakarta validation` -> PASSED (0 violations).
     * `Task 1.2: CreateBookRequestDto with pages < 1 fails validation with @Min violation` -> PASSED (1 violation, "Pages must be at least 1").
     * `Task 1.3: UpdateBookRequestDto with pages = null passes validation` -> PASSED (0 violations).
     * `Task 1.4: POST /api/v1/books with pages = null creates audiobook and returns 201 with null pages` -> PASSED (HTTP 201 Created, `pages` is null in entity and JSON).

2. **Archived Book Access Protection via `getBookById` (Task 2)**:
   - In `backend/src/main/java/com/tanda/service/BookService.java` lines 50–57:
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
   - In `backend/src/main/java/com/tanda/exception/GlobalExceptionHandler.java` lines 23–26:
     `ResourceNotFoundException` is mapped to HTTP 404 NOT_FOUND.
   - Verified via `Challenger2M1EmpiricalVerificationTest`:
     * `Task 2.1: Direct service call: Unauthenticated caller gets ResourceNotFoundException` -> PASSED.
     * `Task 2.2: Direct service call: CLIENT role gets ResourceNotFoundException` -> PASSED.
     * `Task 2.3: Direct service call: ADMIN role succeeds and retrieves archived book` -> PASSED.
     * `Task 2.4: HTTP GET /api/v1/books/{id}: Unauthenticated request returns 404 ResourceNotFound` -> PASSED (status 404).
     * `Task 2.5: HTTP GET /api/v1/books/{id}: Client request returns 404 ResourceNotFound` -> PASSED (status 404).
     * `Task 2.6: HTTP GET /api/v1/books/{id}: Admin request returns 200 OK` -> PASSED (status 200).
     * `Task 2.7: HTTP GET /api/books/{id} (unversioned): Unauthenticated request returns 404` -> PASSED (status 404).

3. **Sole Active Admin Deletion & Deactivation Guard in `UserService` (Task 3)**:
   - In `backend/src/main/java/com/tanda/service/UserService.java` lines 58–65 (`updateUser`):
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
   - In `backend/src/main/java/com/tanda/service/UserService.java` lines 90–97 (`deleteUser`):
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
   - In `backend/src/main/java/com/tanda/exception/GlobalExceptionHandler.java` lines 37–40:
     `BadRequestException` is mapped to HTTP 400 BAD_REQUEST.
   - Verified via `Challenger2M1EmpiricalVerificationTest`:
     * `Task 3.1: Attempting to delete sole active admin throws BadRequestException` -> PASSED ("Cannot delete the last remaining admin").
     * `Task 3.2: Attempting to deactivate sole active admin (isActive=false) throws BadRequestException` -> PASSED ("Cannot deactivate or demote the last remaining admin").
     * `Task 3.3: Attempting to demote sole active admin (role=client) throws BadRequestException` -> PASSED ("Cannot deactivate or demote the last remaining admin").
     * `Task 3.4: When two active admins exist, deleting one succeeds, but deleting the last fails` -> PASSED.
     * `Task 3.5: Inactive second admin does NOT satisfy the active admin requirement` -> PASSED.

4. **Flyway V4 Migration & Unique Constraint on `reading_progress` (Task 4)**:
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
   - Verified via `Challenger2M1EmpiricalVerificationTest`:
     * `Task 4.0: Flyway schema history records V4 migration as successful` -> PASSED (version 4, description contains "schema constraints and lengths", `success = true`).
     * `Task 4.1: Database information schema contains UNIQUE constraint uq_reading_progress_user_book` -> PASSED.
     * `Task 4.2: Database enforces uniqueness: duplicate (user_id, book_id) insert throws DataIntegrityViolationException` -> PASSED.
     * `Task 4.3: Flyway V4 altered cover_image, audio_url and chapter audio_url to TEXT allowing > 1024 chars` -> PASSED (successfully stored 2048+ character Base64 Data URLs without varchar truncation).

5. **Defect Found: Test Coupling in Pre-existing `SavedBookAndProgressIntegrationTest`**:
   - Running `sh ./gradlew test --tests "com.tanda.controller.SavedBookAndProgressIntegrationTest"` alone fails with:
     ```
     SavedBookAndProgressIntegrationTest > Saved books flow: Save, Get, and Delete FAILED
         java.lang.AssertionError: Status expected:<201> but was:<404>
     SavedBookAndProgressIntegrationTest > Reading progress flow: Update and Get FAILED
         java.lang.AssertionError: Status expected:<200> but was:<404>
     ```
   - Observation: In `SavedBookAndProgressIntegrationTest.java`, line 59 calls `/api/saved-books/test-book-1` and line 85 calls `/api/progress/test-book-1`. However, `setUp()` never persists `test-book-1`. The test only passes if `BookControllerIntegrationTest.java` ran previously in the same test process.

---

## 2. Logic Chain

1. **DTO Contract & Persistence for Audiobooks**:
   - `CreateBookRequestDto` and `UpdateBookRequestDto` previously had `@NotNull` on `pages`.
   - Removing `@NotNull` while preserving `@Min(1)` allows audiobooks (which don't have page counts) to supply `pages = null` without failing bean validation.
   - Preserving `@Min(1)` ensures that invalid positive integers (`0` or negative numbers) are still rejected with HTTP 400.
   - Flyway V3 makes `pages` nullable in the PostgreSQL/H2 table, and `Book.java` defines `Integer pages` without `nullable = false`. Therefore, end-to-end creation of audiobooks with `pages = null` succeeds at both DTO and DB levels.

2. **Defense-in-Depth for Archived Books**:
   - `BookController.java` maps `GET /api/books/{id}` and `GET /api/v1/books/{id}` as public endpoints (`permitAll()`) in `SecurityConfig`.
   - To prevent unauthorized enumeration of archived books, `BookService.getBookById` checks if `book.getIsArchived()` is true.
   - If true, it verifies if the caller holds `ROLE_ADMIN`.
   - Unauthenticated visitors and clients with `ROLE_CLIENT` receive `ResourceNotFoundException("Book", "id", id)`, which `GlobalExceptionHandler` translates to HTTP 404 NOT_FOUND.
   - Returning 404 instead of 403 Forbidden is a security design decision preventing resource enumeration. Only administrators holding `ROLE_ADMIN` receive HTTP 200 OK.

3. **Sole Active Admin Guard**:
   - If an administrator deletes or deactivates themselves or another admin, the system must not be left without any active administrators.
   - `UserService.deleteUser` and `updateUser` query `userRepository.findByRole("admin")` and filter for other administrators whose `isActive` is `true`.
   - If `otherActiveAdminCount < 1`, the action is rejected with `BadRequestException`, returning HTTP 400 with a localized message.
   - Non-admin client deletion/updates bypass this check.
   - Inactive administrators do not count toward the active admin threshold, preventing dormant accounts from bypassing the safety check.

4. **Schema Durability & Race Condition Prevention**:
   - Without a database-level unique constraint on `(user_id, book_id)` in `reading_progress`, rapid concurrent updates from multiple clients or network retries could create duplicate progress rows for the same book.
   - Flyway V4 creates constraint `uq_reading_progress_user_book`.
   - Hibernate entity `ReadingProgress` defines matching unique constraint `uq_reading_progress_user_book`, satisfying `ddl-auto: validate`.
   - Direct JDBC concurrent insertions prove the database engine enforces this constraint by throwing `DataIntegrityViolationException`.
   - Altering `cover_image` and `audio_url` to `TEXT` resolves Base64 Data URL truncation errors.

---

## 3. Caveats

- **Pre-existing Test Coupling**: As noted in Observation #5, `SavedBookAndProgressIntegrationTest` lacks fixture independence and relies on `BookControllerIntegrationTest` having created `test-book-1`. This does not affect production code, but should be addressed in Milestone M2's test suite overhaul.
- **Client Route Navigation**: Frontend client route navigation to `#/admin` does not perform client-side role guards; however, backend API endpoints strictly reject non-admin requests with HTTP 403 / 401.

---

## 4. Conclusion

All four target areas assigned to Challenger 2 have been empirically verified with 100% green execution across 20 dedicated challenge tests in `backend/src/test/java/com/tanda/Challenger2M1EmpiricalVerificationTest.java`:
1. Audiobook creation with `pages = null` passes DTO validation and persists cleanly.
2. Archived books accessed via `getBookById` return HTTP 404 ResourceNotFoundException for anonymous and client users, while allowing admin access.
3. Attempting to delete, deactivate, or demote the sole active admin in `UserService` throws `BadRequestException`.
4. Flyway V4 migration creates the unique constraint on `reading_progress` and TEXT column capacities.

### Verdict: **APPROVE**

---

## 5. Verification Method

To independently reproduce the empirical challenge verification:

1. **Run Challenger 2 Dedicated Verification Test Suite**:
   ```bash
   cd "/Users/usman/Desktop/tanda site/backend"
   sh ./gradlew test --tests "com.tanda.Challenger2M1EmpiricalVerificationTest"
   ```
   *Expected Result*: `BUILD SUCCESSFUL in 4s`, 20 tests completed, 0 failed, 0 skipped.

2. **Inspect Generated Test Report XML**:
   ```bash
   cat "/Users/usman/Desktop/tanda site/backend/build/test-results/test/TEST-com.tanda.Challenger2M1EmpiricalVerificationTest.xml" | grep "testsuite"
   ```
   *Expected Result*: `<testsuite name="com.tanda.Challenger2M1EmpiricalVerificationTest" tests="20" skipped="0" failures="0" errors="0" ...>`

3. **Verify Frontend Build**:
   ```bash
   cd "/Users/usman/Desktop/tanda site/frontend"
   npm run build
   ```
   *Expected Result*: `built in ~1.4s`, 0 errors.

4. **Verify Database Constraint in Schema History**:
   Inspect `V4__fix_schema_constraints_and_lengths.sql`:
   ```bash
   cat "/Users/usman/Desktop/tanda site/backend/src/main/resources/db/migration/V4__fix_schema_constraints_and_lengths.sql"
   ```
