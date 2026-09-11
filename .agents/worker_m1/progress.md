# M1 Implementation Worker Progress

**Last visited**: 2026-09-10T17:52:00Z
**Status**: Completed all Milestone M1 tasks and verified with test and build runners

## Roadmap
- [x] 1. Inspect all target files and understand their current implementation
- [x] 2. Implement Security & RBAC Hardening:
  - [x] Update `SecurityConfig.java` (dual-prefix admin matchers `/api/admin/**` and `/api/v1/admin/**` with `.hasRole("ADMIN")`, auth matchers permitAll for `/api/auth/**` and `/api/v1/auth/**`, `@EnableMethodSecurity`, CORS explicit origins `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`)
  - [x] Update `WebConfig.java` (added PATCH and HEAD to allowed CORS methods for parity)
  - [x] Update `UserController.java` (added `@PreAuthorize("hasRole('ADMIN')")` at class level)
  - [x] Update `GlobalExceptionHandler.java` (sanitized generic exception response body to `"An unexpected error occurred. Please contact support."`, added SLF4J error logging, added `BadRequestException` handler)
- [x] 3. Implement Schema, Entity & DTO Contracts:
  - [x] Create Flyway migration `V4__fix_schema_constraints_and_lengths.sql` (unique constraint on reading_progress `(user_id, book_id)`, alter columns `books.cover_image`, `books.audio_url`, `audio_chapters.audio_url` to `TEXT`)
  - [x] Update `Book.java` and `AudioChapter.java` (`columnDefinition = "TEXT"`, removed `length = 1024`)
  - [x] Update `ReadingProgress.java` (added unique constraint `uq_reading_progress_user_book` on `(user_id, book_id)`)
  - [x] Update `CreateBookRequestDto.java` & `UpdateBookRequestDto.java` (removed `@NotNull` from `pages`, retained `@Min(1)`)
  - [x] Update `ReadingProgressRequestDto.java` (added `@Min(1)` on `currentPage`, `@Min(0)` on `currentAudioTime`)
- [x] 4. Implement Business Logic & Boundary Protections:
  - [x] Update `BookService.java` (`getBookById` now verifies `ROLE_ADMIN` if `isArchived == true`, throwing `ResourceNotFoundException("Book", "id", id)` for non-admin/unauthenticated callers)
  - [x] Update `UserService.java` (added protection against deleting or deactivating/demoting the last active administrator, throwing `BadRequestException`)
  - [x] Created `BadRequestException.java`
- [x] 5. Build and Test Verification:
  - [x] Run `sh ./gradlew test --rerun-tasks` (100% pass, 15/15 tests green, Flyway V4 and Hibernate schema validation succeeded)
  - [x] Run `npm run build` in `frontend/` (TypeScript compilation and Vite build succeeded with 0 errors)
- [x] 6. Self-Critique and Handoff:
  - [x] Document completion in `BRIEFING.md`
  - [x] Produce comprehensive `handoff.md`
  - [x] Send completion message to parent orchestrator
