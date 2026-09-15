# Original User Request

## 2026-09-10T17:26:43Z

Perform a rigorous, end-to-end security, architecture, and functional audit of the Tanda project (Spring Boot backend + frontend). Verify all REST controllers, CRUD operations, business logic, authentication/authorization flows, and data boundary protections. Automatically patch discovered vulnerabilities and implement automated regression tests.

Working directory: /Users/usman/Desktop/tanda site
Integrity mode: development

## Requirements

### R1. Comprehensive Route & CRUD Endpoint Audit
- Discover and verify every REST API endpoint across all controllers (`AuthController`, `BookController`, `ReadingProgressController`, `SavedBookController`, `UserController`, etc.).
- Verify that all CRUD operations (Create, Read, Update, Delete) handle valid payloads, invalid input, edge cases, type errors, null values, and return standard HTTP status codes and error payloads.
- Verify frontend API integrations and error handling against backend contracts.

### R2. Access Control & RBAC Verification
- Verify Role-Based Access Control (RBAC) across all endpoints and service methods.
- Ensure protected endpoints strictly enforce required roles/authorities (e.g. `ROLE_ADMIN`, `ROLE_USER`, anonymous/public access).
- Verify JWT validation, token expiration, tampering resistance, and anonymous fallback behavior.

### R3. IDOR & Row-Level Data Isolation (Tenant / User Boundary Security)
- Test for Insecure Direct Object References (IDOR) across all user-scoped entities:
  - Reading progress records
  - Saved books / library items
  - User profiles and settings
  - Audio chapter access and upload/modify privileges
- Ensure users cannot view, edit, or delete other users' private data by guessing or manipulating entity IDs.
- Verify repository queries and service layer logic enforce user ownership checks at the data/query level.

### R4. Security Hardening & Vulnerability Remediation
- Audit and patch SQL/JPQL injection risks, CORS misconfigurations, CSRF posture, security headers, password hashing, and exception disclosures.
- Fix all identified vulnerabilities directly in the codebase following clean architecture and existing design patterns.

### R5. Automated Security & Regression Test Suite
- Write and run automated integration and unit tests covering all endpoints, permission matrices (admin vs user vs unauthenticated), and IDOR test cases.
- Ensure the full test suite (`./gradlew test` and frontend build) runs cleanly with 100% green status.

## Acceptance Criteria

### API & Functional Completeness
- [ ] 100% of REST controller routes and endpoints are cataloged and tested with valid and invalid inputs.
- [ ] All CRUD operations properly enforce validation constraints and return appropriate HTTP status codes (200/201/204/400/401/403/404/409).

### Authorization & RBAC
- [ ] Matrix test proving non-admin users cannot access admin-only endpoints.
- [ ] Matrix test proving unauthenticated requests cannot access protected resources.

### IDOR & Data Boundary Isolation
- [ ] Explicit test cases verifying User A cannot access or mutate User B's reading progress, saved books, or profile data via manipulated IDs.
- [ ] All database queries accessing user-owned resources filter by the authenticated principal's user ID.

### Fixes & Verification
- [ ] All discovered security flaws, bugs, or inconsistent contract issues are fixed.
- [ ] Automated tests pass with 100% success rate (`./gradlew test`).

## 2026-09-15T16:40:03Z

Complete the end-to-end development of the Tanda platform MVP (Spring Boot backend + React frontend), establishing a robust architecture, JWT refresh-token rotation, local media storage with audio streaming, modern frontend with TanStack Query and React Router, refined design system, and hardened security.

Working directory: /Users/usman/Desktop/tanda site
Integrity mode: development

## Requirements

### R1. Backend Auth & Session Hardening
- Create Flyway migration `V7__refresh_tokens.sql` with `id`, `user_id`, `token_hash`, `expires_at`, `revoked`, `user_agent`, `ip_address`.
- Implement `RefreshToken` entity, repository, and service supporting 15-minute access tokens, 30-day refresh tokens via HttpOnly cookies, token rotation on `/api/v1/auth/refresh`, and reuse detection (revoking all user sessions upon reuse of a revoked token).
- Harmonize API endpoints to `/api/v1/` prefix and clean up dual-prefix routes while keeping existing security rules and tests intact.

### R2. Frontend Architecture & API Infrastructure
- Transition from `createHashRouter` to `createBrowserRouter` with route-level lazy loading and `Suspense` fallbacks.
- Configure Vite proxy in `vite.config.ts` for `/api` and `/uploads` forwarding to `http://localhost:8080`.
- Implement `apiClient` in Axios with a Promise-based mutex queue for 401 refresh retries, silent auth initialization on app load, and typed API endpoints.
- Integrate `@tanstack/react-query` for all server-side state (books, users, progress, categories), keeping Zustand strictly for client-side UI state.

### R3. Design System & Core Pages
- Establish shared UI design system (`shared/ui/`): `Button`, `Input`, `Card`, `Badge`, `Skeleton`, `Modal`, `Toast`, `Avatar` with Tailwind CSS and `clsx`/`tailwind-merge`.
- Build complete `CatalogPage` with search, category filtering, book type filters, and infinite scrolling via `useInfiniteQuery`.
- Enhance `LandingPage`, `BookDetailPage`, `ProfilePage`, and `SettingsPage` with complete state handling (loading skeletons, error states, empty states).

### R4. Reader & Audio Player Synchronization
- Upgrade `AudioPlayerBar` to support variable playback rates (0.75x, 1x, 1.25x, 1.5x, 2x), seeking, and background Media Session API.
- Refine `ReaderPage` with customizable reader settings (font size, light/dark/sepia themes) and chapter navigation.
- Implement reliable reading and audio progress synchronization using `visibilitychange` and `fetch` with `keepalive: true` / `navigator.sendBeacon` alongside periodic 30s auto-save.

### R5. Admin CMS & Local Media Storage
- Implement server-side local storage in Spring Boot for book covers, audio files, and books (`uploads/` directory) with multipart file validation (MIME-type whitelist, file size limits, filename sanitization).
- Implement HTTP Byte-Range request handling (HTTP 206 Partial Content) for streaming audio chapter files.
- Build complete Admin CMS (Dashboard stats, Book creation/editing with file uploads and multi-chapter audio management, user management).

### R6. Security Hardening, Rate Limiting & Quality
- Configure Bucket4j rate limiting on auth and upload endpoints with proxy-aware IP extraction (`X-Forwarded-For` / `CF-Connecting-IP`).
- Apply standard security response headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- Standardize backend error responses across `GlobalExceptionHandler` and add SpringDoc OpenAPI/Swagger documentation.
- Maintain and expand automated test suites ensuring zero regressions.

## Acceptance Criteria

### Automated Testing & Compilation
- [ ] Backend compiles and passes all integration and unit tests cleanly (`./gradlew test`).
- [ ] Frontend builds cleanly without TypeScript or bundler errors (`npm run build`).

### Authentication & Authorization
- [ ] Refresh token rotation works with HttpOnly cookies; page reload (F5) preserves session seamlessly via silent refresh.
- [ ] Multiple simultaneous 401 responses trigger exactly one `/auth/refresh` request without dropping concurrent queries.

### Functionality & Media
- [ ] File uploads (covers, audio chapters) save to local storage and are servable via HTTP.
- [ ] Audio player streams chapters with seeking support (HTTP 206 Partial Content).
- [ ] Catalog search and filters query backend cleanly with proper skeleton states.
- [ ] Reading and audio progress persist reliably across page navigation and tab closing.
