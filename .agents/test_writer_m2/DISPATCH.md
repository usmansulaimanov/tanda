## 2026-09-10T18:23:10Z

You are the Test Writer for Milestone M2 (Automated Security & Regression Test Suite).
Your working directory is: /Users/usman/Desktop/tanda site/.agents/test_writer_m2/
The project root is: /Users/usman/Desktop/tanda site
The authoritative user request is: /Users/usman/Desktop/tanda site/ORIGINAL_REQUEST.md (You MUST read this file first).
The master project plan is: /Users/usman/Desktop/tanda site/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context:
Milestone M1 is complete and verified (SecurityConfig dual-prefix matchers, method security, Flyway V4 unique constraint, TEXT columns, nullable pages, archived book protection, and last admin guard).
Milestone M2 requires building comprehensive, robust automated integration test suites fulfilling Requirements R1-R5 and all Acceptance Criteria:

Tasks to Implement:
1. `backend/src/test/java/com/tanda/controller/UserAdminIntegrationTest.java`:
   - Comprehensive CRUD and search integration tests for `UserController` across both `/api/admin/users` and `/api/v1/admin/users`:
     - `GET /api/admin/users` & `/api/v1/admin/users` (list all readers, search by name/email, filter by role)
     - `GET /api/admin/users/{id}` & `/api/v1/admin/users/{id}` (fetch user by ID, 404 for non-existent)
     - `PATCH /api/admin/users/{id}` & `/api/v1/admin/users/{id}` (update user name, role, isActive flag)
     - `DELETE /api/admin/users/{id}` & `/api/v1/admin/users/{id}` (delete user returns 204 No Content, 404 for missing user, 400 for deleting sole admin)
   - Ensure clean database setup/teardown in `@BeforeEach`.

2. `backend/src/test/java/com/tanda/security/SecurityRbacMatrixIntegrationTest.java`:
   - Full RBAC matrix test suite covering all route families under both `/api` and `/api/v1` prefixes:
     - Unauthenticated (Anonymous):
       - Public endpoints (GET /api/books, GET /api/v1/books, POST /api/auth/login, POST /api/v1/auth/login, POST /api/auth/register, POST /api/v1/auth/register) succeed (200/201/400).
       - Protected user endpoints (GET /api/auth/me, /api/saved-books, /api/progress) return HTTP 401 Unauthorized.
       - Admin-only endpoints (POST/PUT/PATCH/DELETE /api/books, GET/PATCH/DELETE /api/admin/users, /api/v1/admin/users) return HTTP 401 Unauthorized.
     - Authenticated Client (`ROLE_CLIENT`):
       - Protected user endpoints (GET /me, /saved-books, /progress) succeed (200/201/204).
       - Admin-only endpoints (POST/PUT/PATCH/DELETE /api/books, GET/PATCH/DELETE /api/admin/users and /api/v1/admin/users) strictly return HTTP 403 Forbidden.
     - Authenticated Admin (`ROLE_ADMIN`):
       - All endpoints succeed with appropriate status codes (200/201/204).

3. `backend/src/test/java/com/tanda/security/IdorIsolationIntegrationTest.java`:
   - Multi-tenant / two-user boundary isolation tests between User A (`userA@tanda.kz`) and User B (`userB@tanda.kz`):
     - Saved Books Isolation: User A saves a book; User B lists saved books -> receives 0 saved books. User B tries to DELETE `/api/saved-books/{bookId}` -> User A's bookmark remains intact.
     - Reading Progress Isolation: User A reads Book 1 to page 50, audio 300s. User B queries `/api/progress/{bookId}` -> receives default (page 1, audio 0). User B updates progress to page 5, audio 20s -> User A's progress remains page 50, audio 300s.
     - Profile Isolation: User A attempts to view, patch, or delete User B's profile via `/api/admin/users/{userBId}` or `/api/v1/admin/users/{userBId}` -> strictly rejected with 403 Forbidden.

4. Test Suite Stabilization:
   - In `backend/src/test/java/com/tanda/Challenger2M1EmpiricalVerificationTest.java`:
     - Add `@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)` so admin deletion tests do not pollute the shared Spring context for other suites.

5. Verification:
   - Run `sh ./gradlew clean test` in `backend/` and confirm 100% of all tests pass with zero failures.
   - Run `npm run build` in `frontend/` and confirm clean build.

Deliverables:
- Write completion report to `/Users/usman/Desktop/tanda site/.agents/test_writer_m2/handoff.md`.
- Send message to your orchestrator when done.
