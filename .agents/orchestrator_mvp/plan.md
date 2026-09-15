# Plan: Tanda Platform MVP End-to-End Orchestration

## Objective
Deliver full end-to-end implementation of the Tanda platform MVP satisfying all R1-R6 requirements, with 100% passing tests, clean builds, secure session rotation, local media storage with byte-range streaming, modern React/TanStack frontend, and full verification.

## Phases
### Phase 0: Survey & Gap Analysis
- Dispatch 3 parallel Explorers:
  1. Backend Explorer (`teamwork_preview_explorer_survey_be`): inspect current backend controllers, entities, migrations (V1-V6), auth filter, security config, rate limiting, upload handling.
  2. Frontend Explorer (`teamwork_preview_explorer_survey_fe`): inspect current routing, apiClient, auth context/store, reader page, audio player, admin pages, shared UI components.
  3. Spec Miner (`teamwork_preview_spec_miner_survey`): parse R1-R6 requirements in ORIGINAL_REQUEST.md (2026-09-15T16:40:03Z), map exact delta/gaps between current state and requirements.

### Phase 1: Milestone Decomposition & Interface Contracts
- Synthesize survey findings.
- Update `PROJECT.md` with Feature Inventory, Milestones, and Interface Contracts.
- Milestones planned:
  - M1: Backend Auth & Session Hardening (V7 Flyway migration, RefreshToken, 15m/30d tokens, HttpOnly cookie, rotation, reuse detection, /api/v1 harmonization).
  - M2: Admin CMS Backend, Local Storage & HTTP 206 Streaming (uploads directory, multipart validation, range request streaming, admin endpoints, Bucket4j rate limiting, OpenAPI).
  - M3: Frontend Architecture, API Client & TanStack Query (createBrowserRouter, lazy routes, Vite proxy, Axios mutex queue for 401 refresh, TanStack Query integration).
  - M4: Design System & Core Pages (shared/ui/ components, CatalogPage with infinite query, Landing, BookDetail, Profile, Settings).
  - M5: Reader & Audio Player Synchronization (AudioPlayerBar variable playback/seeking/MediaSession, ReaderPage custom themes/fonts, keepalive/visibilitychange sync).
  - M6: Admin CMS Frontend (Dashboard, book creation/editing with multi-chapter audio & file uploads, user management).
  - M7: E2E Verification, Security Hardening & Regression Suite (All backend & frontend tests green, zero regressions).

### Phase 2: Execution via Specialist Agents
- Each milestone runs standard iteration loop:
  Explorer -> Worker -> 2 Reviewers + 2 Challengers + Forensic Auditor -> Gate Check.

### Phase 3: Final Acceptance & Victory Audit
- Verify `./gradlew test` passes 100%.
- Verify `npm run build` succeeds cleanly.
- Verify all acceptance criteria.
- Report victory to parent.
