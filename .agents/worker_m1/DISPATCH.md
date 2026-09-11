## 2026-09-10T17:42:47Z
You are the Implementation Worker for Milestone M1 (Core Security & Data Boundary Remediation).
Your working directory is: /Users/usman/Desktop/tanda site/.agents/worker_m1/
The project root is: /Users/usman/Desktop/tanda site
The authoritative user request is: /Users/usman/Desktop/tanda site/ORIGINAL_REQUEST.md (You MUST read this file first).
The master project plan is: /Users/usman/Desktop/tanda site/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context and Survey Artifacts to Consult:
- /Users/usman/Desktop/tanda site/.agents/teamwork_preview_spec_miner_survey_1/survey_backend.md
- /Users/usman/Desktop/tanda site/.agents/teamwork_preview_explorer_survey_2/survey_data_isolation.md
- /Users/usman/Desktop/tanda site/.agents/teamwork_preview_explorer_survey_3/survey_frontend_tests.md

Exclusive Write Ownership Files:
- backend/src/main/java/com/tanda/config/SecurityConfig.java
- backend/src/main/java/com/tanda/config/WebConfig.java
- backend/src/main/java/com/tanda/controller/UserController.java
- backend/src/main/java/com/tanda/exception/GlobalExceptionHandler.java
- backend/src/main/resources/db/migration/V4__fix_schema_constraints_and_lengths.sql
- backend/src/main/java/com/tanda/entity/Book.java
- backend/src/main/java/com/tanda/entity/AudioChapter.java
- backend/src/main/java/com/tanda/entity/ReadingProgress.java
- backend/src/main/java/com/tanda/dto/CreateBookRequestDto.java
- backend/src/main/java/com/tanda/dto/UpdateBookRequestDto.java
- backend/src/main/java/com/tanda/dto/ReadingProgressRequestDto.java
- backend/src/main/java/com/tanda/service/BookService.java
- backend/src/main/java/com/tanda/service/UserService.java

Scope & Tasks to Implement:
1. Security & RBAC Hardening:
   - In `SecurityConfig.java`:
     - Update admin matchers to cover BOTH `/api/admin/**` and `/api/v1/admin/**` with `.hasRole("ADMIN")`.
     - Update public auth matchers to permit BOTH `/api/auth/**` and `/api/v1/auth/**` for `login`, `register`, and `logout`.
     - Add `@EnableMethodSecurity` annotation to the configuration.
     - Fix CORS configuration: set explicit allowed origins (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`) instead of wildcard pattern when `allowCredentials(true)` is set. Keep consistency with `WebConfig.java`.
   - In `UserController.java`:
     - Add `@PreAuthorize("hasRole('ADMIN')")` at class level (or method level).
   - In `GlobalExceptionHandler.java`:
     - In `handleGenericException`, sanitize the message returned in the response body to `"An unexpected error occurred. Please contact support."` to avoid leaking database details or internal exceptions. Keep logging intact.

2. Schema, Entity & DTO Contracts:
   - Create Flyway migration `backend/src/main/resources/db/migration/V4__fix_schema_constraints_and_lengths.sql`:
     - Add unique constraint to `reading_progress (user_id, book_id)`:
       `ALTER TABLE reading_progress ADD CONSTRAINT uq_reading_progress_user_book UNIQUE (user_id, book_id);`
     - Alter columns to support Base64 data URLs without VARCHAR(1024) length limits:
       `ALTER TABLE books ALTER COLUMN cover_image TYPE TEXT;`
       `ALTER TABLE books ALTER COLUMN audio_url TYPE TEXT;`
       `ALTER TABLE audio_chapters ALTER COLUMN audio_url TYPE TEXT;`
   - In `Book.java` and `AudioChapter.java`:
     - Update `@Column` annotations for `coverImage` and `audioUrl`: remove `length = 1024`, use `columnDefinition = "TEXT"`.
   - In `ReadingProgress.java`:
     - Add `@Table(name = "reading_progress", uniqueConstraints = {@UniqueConstraint(name = "uq_reading_progress_user_book", columnNames = {"user_id", "book_id"})})`.
   - In `CreateBookRequestDto.java` and `UpdateBookRequestDto.java`:
     - Remove `@NotNull` from `pages`. Keep `@Min(value = 1, message = "Pages must be at least 1")` so when `pages` is null, it passes validation (supporting audiobooks without page counts).
   - In `ReadingProgressRequestDto.java`:
     - Add `@Min(value = 1, message = "Current page must be at least 1")` on `currentPage`.
     - Add `@Min(value = 0, message = "Current audio time must be non-negative")` on `currentAudioTime`.

3. Business Logic & Boundary Protections:
   - In `BookService.java`:
     - In `getBookById(String id)`: if `book.getIsArchived() == true`, check if the authenticated principal has `ROLE_ADMIN`. If unauthenticated or a regular client user, throw `ResourceNotFoundException("Book", "id", id)` to prevent archived book leakage.
   - In `UserService.java`:
     - In `deleteUser(String id)`: if target user has `role.equals("admin")`, verify that another active admin exists before allowing deletion; otherwise throw `BadRequestException("Cannot delete the last remaining admin")`.
     - In `updateUser`: if target user is an admin and the update would deactivate or demote them, ensure at least one other active admin remains.

4. Build and Test Verification:
   - Run `sh ./gradlew test` in `backend/` to verify that all existing tests compile and pass cleanly with the new schema, DTO, and security changes.
   - Run `npm run build` in `frontend/` to ensure frontend build remains green.

Deliverables:
- Write detailed completion report and handoff to:
  `/Users/usman/Desktop/tanda site/.agents/worker_m1/handoff.md`
- Send message to your orchestrator when done.
