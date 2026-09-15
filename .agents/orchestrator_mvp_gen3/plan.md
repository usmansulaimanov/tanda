# Plan: Tanda Platform MVP End-to-End Orchestration (Gen 3)

## Objective
Deliver the complete end-to-end implementation of the Tanda platform MVP satisfying all R1-R6 requirements, with 100% passing tests, clean builds, secure session rotation, local media storage with byte-range streaming, modern React/TanStack frontend, and full verification.

## Architecture & Milestones Overview
- **Phase 0: Targeted Survey & Spec Mapping**
  - Dispatch Explorer for Backend Architecture (Auth, Storage, Streaming, Security)
  - Dispatch Explorer for Frontend Architecture (Routing, API Client, TanStack Query, Pages)
  - Dispatch Spec Miner for Detailed Contract Definitions
- **Phase 1: Milestone Finalization & Interface Contracts**
  - Update `PROJECT.md` with complete Feature Inventory, Milestones, and Interface Contracts.
- **Phase 2: Milestone Execution**
  - **M1: Backend Auth & Session Hardening (R1)**
    - Flyway `V7__refresh_tokens.sql`
    - RefreshToken entity, repository, service (15m access, 30d refresh, HttpOnly cookies, rotation, reuse detection)
    - `/api/v1` route harmonization
  - **M2: Backend Admin, Media Storage & HTTP 206 Streaming (R5, R6 Backend)**
    - Local media storage under `uploads/` with multipart validation (MIME whitelist, size limits, filename sanitization)
    - HTTP 206 Partial Content byte-range streaming controller for audio chapters
    - Admin endpoints for books, multi-chapter audio, user management
    - Bucket4j rate limiting, security headers, standardized GlobalExceptionHandler, SpringDoc OpenAPI
  - **M3: Frontend Architecture, API Client & State Management (R2)**
    - Transition to `createBrowserRouter` with lazy loading / Suspense
    - Vite proxy for `/api` and `/uploads` -> `http://localhost:8080`
    - Axios `apiClient` with Promise-based mutex queue for 401 refresh retries
    - TanStack Query integration for server state
  - **M4: Design System & Core Pages (R3)**
    - Design system in `shared/ui/` (`Button`, `Input`, `Card`, `Badge`, `Skeleton`, `Modal`, `Toast`, `Avatar`)
    - `CatalogPage` with search, category filtering, book type filters, infinite scrolling
    - `LandingPage`, `BookDetailPage`, `ProfilePage`, `SettingsPage` with complete state handling
  - **M5: Reader & Audio Player Synchronization (R4)**
    - `AudioPlayerBar` variable rates, seeking, MediaSession API
    - `ReaderPage` custom settings (font size, themes) and chapter navigation
    - Sync via `visibilitychange`, `keepalive: true` / `sendBeacon`, and 30s auto-save
  - **M6: Admin CMS Frontend (R5 Frontend)**
    - Dashboard stats, book creation/editing with file uploads and multi-chapter audio management, user management
  - **M7: Final Verification & Security Hardening (Regression & Integration)**
    - Full test suite passes: `./gradlew test` (100% green), `npm run build` (clean)
    - Acceptance criteria verification: refresh token rotation, mutex queue, local media uploads & 206 streaming, sync persistence

## Iteration Loop per Milestone
Explorer -> Worker -> 2 Reviewers + 2 Challengers + Forensic Auditor -> Gate Check
Pass criteria: All tests green, all Reviewers APPROVE, all Challengers confirm, Auditor CLEAN.
