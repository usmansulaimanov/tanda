# Project: Tanda Security, Architecture & Functional Audit

## Architecture
- **Backend**: Spring Boot 3.3.0, Java 17, Spring Security 6 (JWT stateless authentication), Spring Data JPA, Hibernate, Flyway migrations, H2 (test) / PostgreSQL (prod).
- **Frontend**: React 18, Vite 6, TypeScript 5.6, Zustand 5, Tailwind CSS, React Router DOM 6 (hash routing).
- **Security Architecture**: JWT token Bearer authentication via `JwtAuthFilter`. Dual prefix route mappings (`/api/...` and `/api/v1/...`). Role-based access control (`ROLE_ADMIN`, `ROLE_CLIENT`).
- **Data Isolation**: Row-level principal filtering in user-scoped repositories (`SavedBook`, `ReadingProgress`).

## Feature Inventory
| # | Feature | Description | Milestone | Status | Source |
|---|---------|-------------|-----------|--------|--------|
| 1 | RBAC Matcher Harmonization | Fix `SecurityConfig` to protect both `/api/admin/**` and `/api/v1/admin/**` with `hasRole('ADMIN')` | M1 | DONE | Survey |
| 2 | Auth Route PermitAll Parity | Ensure both `/api/auth/**` and `/api/v1/auth/**` (`login`, `register`, `logout`) are public | M1 | DONE | Survey |
| 3 | Method Security Enablement | Enable `@EnableMethodSecurity` and add `@PreAuthorize("hasRole('ADMIN')")` to `UserController` | M1 | DONE | Survey |
| 4 | CORS Hardening | Restrict allowed origins and eliminate wildcard origin patterns paired with credentials | M1 | DONE | Survey |
| 5 | Exception Disclosure Shielding | Sanitize 500 error responses in `GlobalExceptionHandler` to prevent internal leakage | M1 | DONE | Survey |
| 6 | Reading Progress Unique Constraint | Add database unique constraint `UNIQUE(user_id, book_id)` via Flyway V4 to prevent race conditions | M1 | DONE | Survey |
| 7 | Base64 Upload Schema Capacity | Alter `cover_image`, `audio_url`, and `audio_chapters.audio_url` to `TEXT` in DB and JPA entities | M1 | DONE | Survey |
| 8 | Nullable Pages DTO Contract | Allow `pages = null` in `CreateBookRequestDto` and `UpdateBookRequestDto` for audiobooks | M1 | DONE | Survey |
| 9 | Reading Progress DTO Validation | Add validation annotations (`@Min(1)` on page, `@Min(0)` on audio time) and `@Valid` on controller | M1 | DONE | Survey |
| 10 | Archived Book Access Protection | Restrict `getBookById` and `getBooks` in `BookService` so archived books are only visible to `ROLE_ADMIN` | M1 | DONE | Survey |
| 11 | Admin Deletion Guard | Prevent deletion or deactivation of the last remaining admin in `UserService` | M1 | DONE | Survey |
| 12 | User Admin CRUD Test Suite | Comprehensive unit/integration tests for all `UserController` endpoints (`UserAdminIntegrationTest`) | M2 | DONE | Survey / R1 |
| 13 | RBAC Matrix Test Suite | Matrix tests verifying 401 (unauthenticated), 403 (non-admin), and 200/201/204 (admin) across all routes (`SecurityRbacMatrixIntegrationTest`) | M2 | DONE | Survey / R2 |
| 14 | IDOR Cross-User Isolation Suite | Multi-tenant boundary tests proving User A cannot read/mutate User B's progress, saved books, or profile (`IdorIsolationIntegrationTest`) | M2 | DONE | Survey / R3 |
| 15 | Validation & Error Regression Suite | Verify validation constraints (email, password, pages, negative numbers) and contract parity | M2 | DONE | Survey / R4, R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Security & Data Boundary Remediation | Fix `SecurityConfig`, `WebConfig`, `GlobalExceptionHandler`, `UserController`, Flyway V4 migration, JPA entities (`Book`, `AudioChapter`, `ReadingProgress`), DTOs, and Service boundaries (`BookService`, `UserService`) | none | DONE |
| M2 | Automated Security & Regression Test Suite | Implement comprehensive test suites (`UserAdminIntegrationTest`, `SecurityRbacMatrixIntegrationTest`, `IdorIsolationIntegrationTest`, validation tests) ensuring 100% green build on `./gradlew test` and clean frontend build | M1 | DONE |
| M3 | Final Adversarial Coverage Hardening (Tier 5) | White-box adversarial challenge testing, gap analysis, and final audit sign-off | M2 | DONE |


## Interface Contracts
### SecurityConfig ↔ Controllers
- `/api/auth/login`, `/api/v1/auth/login`, `/api/auth/register`, `/api/v1/auth/register`, `/api/auth/logout`, `/api/v1/auth/logout`: `permitAll()`
- `GET /api/books/**`, `GET /api/v1/books/**`: `permitAll()` (excluding archived books for non-admin)
- `/api/admin/**`, `/api/v1/admin/**`: `hasRole('ADMIN')`
- All other endpoints: `authenticated()`

### DTOs ↔ Entity Layer
- `CreateBookRequestDto` & `UpdateBookRequestDto`: `pages` is optional (`Integer`, `@Min(1)` if provided).
- `Book` & `AudioChapter`: `coverImage` and `audioUrl` stored as `TEXT` to support Data URLs.
- `ReadingProgress`: `(userId, bookId)` guaranteed unique at both entity and database schema layers.

## Code Layout
- Backend Source: `backend/src/main/java/com/tanda/`
  - Config: `config/SecurityConfig.java`, `config/WebConfig.java`
  - Controllers: `controller/AuthController.java`, `controller/BookController.java`, `controller/ReadingProgressController.java`, `controller/SavedBookController.java`, `controller/UserController.java`
  - DTOs: `dto/CreateBookRequestDto.java`, `dto/UpdateBookRequestDto.java`, `dto/ReadingProgressRequestDto.java`, `dto/UpdateUserRequestDto.java`
  - Entities: `entity/Book.java`, `entity/AudioChapter.java`, `entity/ReadingProgress.java`, `entity/User.java`
  - Repositories: `repository/BookRepository.java`, `repository/ReadingProgressRepository.java`, `repository/SavedBookRepository.java`, `repository/UserRepository.java`
  - Services: `service/BookService.java`, `service/ReadingProgressService.java`, `service/SavedBookService.java`, `service/UserService.java`
  - Migrations: `backend/src/main/resources/db/migration/`
- Backend Tests: `backend/src/test/java/com/tanda/`
  - Existing: `controller/AuthControllerIntegrationTest.java`, `controller/BookControllerIntegrationTest.java`, `controller/SavedBookAndProgressIntegrationTest.java`, `TandaApplicationTests.java`
  - Verification (M1): `Challenger1M1SecurityVerificationTest.java`, `Challenger2M1EmpiricalVerificationTest.java`, `Challenger1M1Iter2EmpiricalVerificationTest.java`
  - Security & IDOR Suites (M2): `controller/UserAdminIntegrationTest.java`, `security/SecurityRbacMatrixIntegrationTest.java`, `security/IdorIsolationIntegrationTest.java`
  - Adversarial White-Box Hardening (M3): `ChallengerTier5AdversarialVerificationTest.java`

- Frontend Source: `frontend/src/`
  - Config & API: `lib/api.ts`
  - Stores: `store/useAuthStore.ts`, `store/useBookStore.ts`, `store/useSavedBooksStore.ts`, `store/useAudioPlayerStore.ts`
  - Admin & Pages: `features/admin/BookFormPage.tsx`, `features/admin/ReadersPage.tsx`, `features/reader/ReaderPage.tsx`
