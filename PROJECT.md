# Project: Tanda Platform MVP End-to-End Implementation

## Architecture
- **Backend**: Spring Boot 3.3.0, Java 17, Spring Security 6 (JWT stateless authentication with HttpOnly refresh token cookies), Spring Data JPA, Hibernate, Flyway migrations (V1–V7), H2 (test) / PostgreSQL (prod).
  - Storage: Local media storage under `./uploads/{covers,audio,books}` with MIME validation and filename sanitization.
  - Streaming: HTTP 206 Partial Content byte-range audio streaming.
  - Security: Bucket4j rate limiting (auth, upload, general tiers), proxy IP extraction (`CF-Connecting-IP`, `X-Forwarded-For`), security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP), GlobalExceptionHandler.
  - Documentation: SpringDoc OpenAPI 3.0 / Swagger UI with JWT Bearer scheme.
- **Frontend**: React 18, Vite 6, TypeScript 5.6, Tailwind CSS, clsx, tailwind-merge.
  - Routing: `createBrowserRouter` in `routes.tsx` with lazy loading, `Suspense` fallbacks, and `ProtectedRoute` guards (auth & admin).
  - Reverse Proxy: `vite.config.ts` proxying `/api` and `/uploads` to `http://localhost:8080`.
  - API Client: Axios with Promise-based mutex queue for 401 refresh retries and silent refresh.
  - Server State: `@tanstack/react-query` v5 for caching, invalidation, and infinite scrolling.
  - Client UI State: Zustand v5 strictly scoped to local UI (audio player playback, toast notifications, responsive sidebar, auth session cache).
  - Design System: `shared/ui/` (`Button`, `Input`, `Card`, `Badge`, `Avatar`, `Skeleton`, `Modal`, `Toast`).

## Feature Inventory
| # | Feature | Description | Milestone | Status | Source |
|---|---------|-------------|-----------|--------|--------|
| 1 | V7 Flyway Schema & RefreshToken Entity | `refresh_tokens` table, entity, repository, and service with SHA-256 token hashing | M1 | DONE | R1 |
| 2 | 15-Minute Access Token Expiration | Configure JWT access token expiration to 15 minutes (900,000 ms) in `JwtProperties` & `application.yml` | M1 | IN_PROGRESS | R1 |
| 3 | 30-Day HttpOnly Refresh Cookie | HttpOnly cookie with 30-day lifetime, Lax SameSite, Path=/, secure handling | M1 | IN_PROGRESS | R1 |
| 4 | Token Rotation & Reuse Detection | Rotate refresh token on `/api/v1/auth/refresh`; revoke all user sessions upon reuse of revoked token | M1 | DONE | R1 |
| 5 | API Route Harmonization | Harmonize all endpoints to `/api/v1/` prefix with security and test parity | M1 | IN_PROGRESS | R1 |
| 6 | Local Media Storage Service | Local storage under `uploads/` with multipart validation (MIME whitelist, size limits, filename sanitization) | M2 | DONE | R5 |
| 7 | Path Traversal Sanitization for Audio Stream | Sanitize `fileName` in `MediaUploadService.getAudioResourceRegion` against directory traversal (`..`) | M2 | PLANNED | R5 |
| 8 | HTTP 206 Partial Content Audio Streaming | Stream audio files in 1MB chunks with byte-range header parsing (`Content-Range`, `Accept-Ranges: bytes`) | M2 | DONE | R5 |
| 9 | Admin Dashboard Stats Endpoint | `GET /api/v1/admin/stats` returning counts for books, audiobooks, users, and progress | M2 | PLANNED | R5 |
| 10 | Bucket4j Rate Limiting | Rate limiting for auth (20/min), uploads (30/min), and general endpoints (300/min) with proxy IP extraction | M2 | IN_PROGRESS | R6 |
| 11 | Security Response Headers | Enable `contentTypeOptions` (`nosniff`), CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy | M2 | IN_PROGRESS | R6 |
| 12 | Multipart Size Limit Exception Handling | Catch `MaxUploadSizeExceededException` in `GlobalExceptionHandler` returning HTTP 413 | M2 | PLANNED | R6 |
| 13 | SpringDoc OpenAPI Configuration | OpenAPI 3.0 configuration with JWT Bearer scheme at `/swagger-ui/index.html` and `/v3/api-docs` | M2 | DONE | R6 |
| 14 | Media & Security Backend Test Suite | Integration tests for uploads, audio range streaming, rate limiting 429, and admin stats | M2 | PLANNED | R5, R6 |
| 15 | Browser Router & Route-Level Lazy Loading | `createBrowserRouter` with `Suspense` and `PageLoader` fallbacks | M3 | DONE | R2 |
| 16 | Route Authentication & RBAC Guards | `ProtectedRoute` component protecting user and admin routes (`/admin/**`) | M3 | PLANNED | R2 |
| 17 | Axios Mutex Refresh Queue | Promise-based mutex queue handling concurrent 401s with exactly one refresh call and replay | M3 | IN_PROGRESS | R2 |
| 18 | TanStack Query Server State Integration | Unified React Query queries and mutations for books, progress, saved books, and admin data | M3 | IN_PROGRESS | R2 |
| 19 | Shared Design System (`shared/ui/`) | Reusable components (`Button`, `Input`, `Card`, `Badge`, `Avatar`, `Skeleton`, `Modal`, `Toast`) | M4 | IN_PROGRESS | R3 |
| 20 | Catalog Page with Search & Infinite Scroll | Search, category chips, format filters, and infinite query book grid with skeleton states | M4 | IN_PROGRESS | R3 |
| 21 | Core Pages State Handling | Skeleton, error with retry, empty, and data states for Landing, BookDetail, Profile, Settings | M4 | IN_PROGRESS | R3 |
| 22 | AudioPlayerBar Playback & Seeking | Playback rates (0.75x–2.0x), +/-10s step seeking, time slider | M5 | IN_PROGRESS | R4 |
| 23 | Media Session API Integration | Native background media controls, lock screen metadata, and action handlers | M5 | IN_PROGRESS | R4 |
| 24 | ReaderPage Customization & Chapter Nav | Font size adjustments (13–26px), themes (light/sepia/dark), chapter navigation | M5 | IN_PROGRESS | R4 |
| 25 | Reliable Progress Synchronization | Auto-save (30s), `visibilitychange`, and `pagehide` with `keepalive: true` / `navigator.sendBeacon` | M5 | IN_PROGRESS | R4 |
| 26 | Admin Dashboard Frontend | KPI stats cards querying `/api/v1/admin/stats` with loading skeletons | M6 | PLANNED | R5 |
| 27 | Admin Book & Multi-Chapter Audio CMS | Book creation/editing with cover upload, PDF/EPUB upload, and multi-chapter audio uploads | M6 | IN_PROGRESS | R5 |
| 28 | Admin User Management CMS | User list, search, role change, status toggle, delete with last-admin guard | M6 | IN_PROGRESS | R5 |
| 29 | Full Regression & Acceptance Verification | Complete verification of `./gradlew test`, `npm run build`, and end-to-end acceptance criteria | M7 | PLANNED | Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Auth & Session Hardening | 15m access token expiration, HttpOnly cookie security, route prefix harmonization, token rotation & reuse detection verification | none | IN_PROGRESS |
| M2 | Backend Admin, Media Storage, HTTP 206 Streaming & Security | Path traversal fix in streaming, Admin stats endpoint, Bucket4j upload bucket, CSP & security headers, MaxUploadSize handler, backend tests | M1 | PLANNED |
| M3 | Frontend Architecture, API Client & State Management | ProtectedRoute guards, Axios 401 mutex queue hardening, TanStack Query integration, Vite proxy verification | M1 | PLANNED |
| M4 | Design System & Core Pages | Complete `shared/ui/` (`Modal`, `Toast`), `CatalogPage` infinite query & filters, state handling across Landing, BookDetail, Profile, Settings | M3 | PLANNED |
| M5 | Reader & Audio Player Synchronization | `AudioPlayerBar` rates/seeking/MediaSession, `ReaderPage` themes/font sizes, reliable sync via `visibilitychange`/`pagehide` (`keepalive: true`) | M3, M4 | PLANNED |
| M6 | Admin CMS Frontend | Admin dashboard stats, book creation/editing with file uploads and multi-chapter audio, user management | M2, M3, M4 | PLANNED |
| M7 | Full Regression & Acceptance Verification | Complete `./gradlew test` (100% green), `npm run build` (clean), verify all R1–R6 acceptance criteria | M1–M6 | PLANNED |

## Interface Contracts

### 1. Auth & Refresh Token Contracts
- `POST /api/v1/auth/login`: `{ email, password }` -> `AuthResponseDto { token, type, user }` + `Set-Cookie: refreshToken=...; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`.
- `POST /api/v1/auth/refresh`: Cookie or body `{ refreshToken }` -> `AuthResponseDto` + new rotated `refreshToken` cookie.
- Reuse detection: Replay of revoked token revokes all user sessions and returns `HTTP 401 Unauthorized`.
- Access token validity: 15 minutes (`900,000` ms). Refresh token validity: 30 days.

### 2. Media Upload & Streaming Contracts
- `POST /api/v1/admin/upload`: Multipart `file`, `category` ("covers", "audio", "books") -> `MediaUploadResponseDto { key, url, fileName, contentType, size }`.
- `GET /api/v1/media/stream/audio/{fileName}`: Header `Range: bytes=start-end` -> `HTTP 206 Partial Content`, `Accept-Ranges: bytes`, `Content-Range: bytes start-end/total`.
- Filename sanitization: reject any path containing `..`.

### 3. Admin Dashboard Stats Contract
- `GET /api/v1/admin/stats`: Requires `ROLE_ADMIN` -> `AdminStatsDto { totalBooks, totalAudiobooks, totalUsers, activeReaders }`.

### 4. Progress Sync Contract
- `PUT /api/v1/progress/{bookId}`: Body `{ currentPage, currentAudioChapterId, currentAudioTime }` -> `ReadingProgressDto`.
- Triggers: 30s interval, `visibilitychange` (`hidden`), `pagehide` / `beforeunload` via `fetch(keepalive: true)` / `navigator.sendBeacon`.

### 5. Axios Mutex Refresh Queue Contract
- Concurrent 401s: First request sets `isRefreshing = true` and calls `/api/v1/auth/refresh`. Concurrent requests are enqueued in `failedQueue`.
- On success: new token attached to headers and all queued requests replayed.
- On failure: `failedQueue` rejected, auth token cleared.

## Code Layout
- Backend:
  - Auth: `backend/src/main/java/com/tanda/controller/AuthController.java`, `service/AuthService.java`, `service/RefreshTokenService.java`, `entity/RefreshToken.java`, `repository/RefreshTokenRepository.java`, `security/JwtTokenProvider.java`, `config/JwtProperties.java`, `config/SecurityConfig.java`.
  - Media & Streaming: `controller/MediaController.java`, `service/MediaUploadService.java`.
  - Admin & Books: `controller/BookController.java`, `service/BookService.java`, `controller/UserController.java`, `service/UserService.java`, `controller/AdminStatsController.java`.
  - Security & Errors: `security/RateLimitingFilter.java`, `exception/GlobalExceptionHandler.java`, `config/OpenApiConfig.java`.
  - Migrations: `backend/src/main/resources/db/migration/V1__init_books_schema.sql` through `V7__refresh_tokens.sql`.
  - Tests: `backend/src/test/java/com/tanda/`.
- Frontend:
  - Router & Providers: `frontend/src/routes.tsx`, `frontend/src/providers.tsx`, `frontend/src/components/ProtectedRoute.tsx`.
  - API Client: `frontend/src/shared/api/client.ts`, `auth.api.ts`, `books.api.ts`, `media.api.ts`, `progress.api.ts`, `admin.api.ts`.
  - Design System: `frontend/src/shared/ui/` (`Button`, `Input`, `Card`, `Badge`, `Avatar`, `Skeleton`, `Modal`, `Toast`).
  - Core Pages: `features/catalog/CatalogPage.tsx`, `features/landing/LandingPage.tsx`, `features/books/BookDetailPage.tsx`, `features/profile/ProfilePage.tsx`, `features/settings/SettingsPage.tsx`.
  - Reader & Player: `features/reader/ReaderPage.tsx`, `features/audio/AudioPlayerBar.tsx`, `store/useAudioPlayerStore.ts`.
  - Admin CMS: `features/admin/AdminDashboard.tsx`, `features/admin/BookFormPage.tsx`, `features/admin/ReadersPage.tsx`.
