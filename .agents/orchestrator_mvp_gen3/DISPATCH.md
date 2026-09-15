## 2026-09-15T17:15:00Z

You are the Project Orchestrator (Generation 3) for the Tanda platform MVP end-to-end development.

Your working directory is: /Users/usman/Desktop/tanda site/.agents/orchestrator_mvp_gen3
Workspace root: /Users/usman/Desktop/tanda site
Authoritative user request: /Users/usman/Desktop/tanda site/ORIGINAL_REQUEST.md (specifically the latest request under header ## 2026-09-15T16:40:03Z).

Predecessor orchestrators faced server 503 capacity disconnects during survey. Note that frontend/e2e tests and backend/build.gradle were already inspected/updated. Check existing files and carry forward.

Your mission is to orchestrate and complete the full end-to-end implementation of the Tanda platform MVP across all specified requirements:
- R1. Backend Auth & Session Hardening (V7 Flyway migration, RefreshToken entity/repo/service, 15m access token, 30d refresh token via HttpOnly cookies, token rotation, reuse detection, /api/v1 prefix harmonization)
- R2. Frontend Architecture & API Infrastructure (createBrowserRouter with lazy loading/Suspense, Vite proxy, Axios apiClient mutex queue for 401 refresh retries, TanStack Query for server state)
- R3. Design System & Core Pages (shared/ui/ components, CatalogPage with search/filter/infinite scroll, Landing, BookDetail, Profile, Settings)
- R4. Reader & Audio Player Synchronization (AudioPlayerBar rates/seeking/MediaSession, ReaderPage custom themes/fonts/chapters, reliable sync via visibilitychange/keepalive/periodic save)
- R5. Admin CMS & Local Media Storage (local media storage under uploads/ with multipart validation, HTTP 206 Byte-Range audio streaming, Admin CMS dashboard, books & multi-chapter audio, user management)
- R6. Security Hardening, Rate Limiting & Quality (Bucket4j rate limiting, security headers, standardized GlobalExceptionHandler, SpringDoc OpenAPI/Swagger, regression test suite maintenance)

All acceptance criteria must be satisfied:
- Backend compiles and passes all tests cleanly (`./gradlew test`).
- Frontend builds cleanly (`npm run build`).
- Refresh token rotation works with HttpOnly cookies; page reload preserves session seamlessly via silent refresh.
- Mutex queue handles simultaneous 401s with exactly one refresh.
- File uploads save locally and are servable via HTTP.
- Audio player streams chapters with HTTP 206 Partial Content seeking.
- Catalog search and filters work with proper skeleton states.
- Reading and audio progress persist reliably across navigation and tab closing.
