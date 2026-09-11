# Comprehensive Survey: Frontend Architecture & Test Infrastructure

**Date**: 2026-09-10  
**Project**: Tanda (Kazakh Digital Library & Audiobook Platform)  
**Surveyed By**: Frontend & Test Infrastructure Explorer  
**Working Directory**: `/Users/usman/Desktop/tanda site/.agents/teamwork_preview_explorer_survey_3/`  
**Integrity Mode**: Development / Read-Only Survey  

---

## Executive Summary

A comprehensive, end-to-end technical survey of the Tanda platform was conducted across the frontend (React 18 + Vite + TypeScript + Zustand) and backend test infrastructure (Spring Boot 3.3.0 + Gradle 9.7.1 + JUnit 5 + MockMvc).

### Key Findings
1. **Frontend Architecture**: Modern, clean single-page application built with React 18, Vite 6, TypeScript 5.6, Zustand 5, Tailwind CSS, and React Router DOM 6 using hash routing (`createHashRouter`). 
2. **API Integrations**: Fully mapped 17 API call patterns across 5 controllers (`AuthController`, `BookController`, `SavedBookController`, `ReadingProgressController`, `UserController`).
3. **Contract Mismatches & Bugs Discovered**:
   - **Nullable Pages Conflict**: The frontend models `Book.pages` as `number | null`, and `BookFormPage.tsx` passes `null` for audiobooks without page count. Database schema (`V3__alter_books_pages_nullable.sql`) dropped the `NOT NULL` constraint. However, backend DTOs (`CreateBookRequestDto` and `UpdateBookRequestDto`) still enforce `@NotNull @Min(1) private Integer pages;`. Submitting an audiobook without pages fails with `400 Bad Request`.
   - **Base64 Payload vs Database Column Limits**: Frontend `BookFormPage.tsx` converts uploaded images and audio files to base64 Data URLs (up to 5MB images and audio files), storing them in `coverImage` and `audioUrl`. But database columns and JPA entities define `VARCHAR(1024)`. Storing any uploaded image/audio causes SQL `value too long for type character varying(1024)` crashes.
   - **Critical RBAC Bypass via Route Prefix Discrepancy**: Controllers map both `/api/...` and `/api/v1/...` (e.g. `UserController` maps `{"/api/admin/users", "/api/v1/admin/users"}`). However, `SecurityConfig.java` explicitly authorizes `/api/admin/**` with `.hasRole("ADMIN")`, but completely omits `/api/v1/admin/**`. Consequently, requests to `/api/v1/admin/**` fall through to `.anyRequest().authenticated()`, allowing ANY authenticated non-admin client user to list, update, or delete users.
   - **Missing Method Security**: `SecurityConfig` lacks `@EnableMethodSecurity`, and `UserController` lacks method-level `@PreAuthorize` annotations.
   - **Public Auth Route Gap**: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` are permitted in `SecurityConfig`, but `/api/v1/auth/**` is omitted, causing 401 errors for `/api/v1/auth/login`.
   - **CORS Misconfiguration**: `config.setAllowedOriginPatterns(List.of("*"))` paired with `config.setAllowCredentials(true)` violates security best practices and browser CORS specifications.
   - **Missing Frontend Route Guards**: Routes like `#/admin`, `#/admin/readers`, and `#/admin/books/new` have no client-side route protection; any unauthenticated visitor can view the admin interface layout.
4. **Test Infrastructure Baseline**:
   - **Backend**: Gradle 9.7.1, Java 17, Spring Boot Test 3.3.0. Baseline run: `sh ./gradlew test --rerun-tasks` passes **15 of 15 tests (100% green)** in 5 seconds. Direct `./gradlew` execution on macOS requires shell execution (`sh ./gradlew`).
   - **Frontend**: Zero automated tests exist (no Vitest/Jest configuration, no test scripts in `package.json`). `npm run build` succeeds cleanly (`tsc && vite build` finishes in 1.33s).
5. **Coverage Gaps (R1-R5)**:
   - `UserController` has **0% test coverage** (0 tests exist).
   - **RBAC Matrix tests** are completely absent (no tests verify non-admin 403 on admin routes, or unauthenticated 401 on protected routes).
   - **IDOR isolation tests** are completely absent (no test verifies User A cannot access or mutate User B's saved books, reading progress, or user account).

---

## 1. Frontend Architecture & API Integration

### 1.1 Technology Stack & Build Tooling
- **Build System**: Vite 6.0.1 (`vite.config.ts`, `index.source.html` -> `dist`)
- **Language**: TypeScript 5.6.3 (`tsconfig.json`, `tsconfig.node.json`)
- **UI Library**: React 18.3.1, React DOM 18.3.1
- **Routing**: React Router DOM 6.28.0 (configured as `createHashRouter` in `src/app/routes.tsx`)
- **State Management**: Zustand 5.0.1 (modular store slices in `src/store/`)
- **HTTP Client**: Axios 1.20.0 (centralized client with interceptors in `src/lib/api.ts`)
- **Styling**: Tailwind CSS 3.4.16, PostCSS 8.4.49, custom design tokens in `src/index.css`
- **Icons**: Lucide React 0.475.0

### 1.2 Component & Page Topology

```
src/
├── main.tsx                         # Bootstrap, migration runner, session restorer
├── app/
│   └── routes.tsx                   # Hash router definition (Layout + child routes)
├── components/
│   ├── layout/
│   │   ├── Layout.tsx               # Shell: Header, Outlet, Footer, AudioPlayerBar, Toast, AppSidebarDrawer
│   │   ├── Header.tsx               # Navigation, global book search autocomplete, auth modal, profile menu
│   │   ├── Footer.tsx               # Platform links and copyright
│   │   └── AppSidebarDrawer.tsx     # Mobile / sliding navigation drawer
│   ├── player/
│   │   └── AudioPlayerBar.tsx       # Bottom docked player (play/pause, chapter nav, scrub, volume, speed)
│   └── ui/                          # Reusable primitives (Badge, BookCard, Button, Input, Modal, Toast)
├── features/
│   ├── landing/LandingPage.tsx      # Hero, platform highlights, catalog preview (admin redirects to dashboard)
│   ├── catalog/CatalogPage.tsx      # Full catalog browsing, genre tabs, search filter
│   ├── book/BookDetailPage.tsx      # Book details, cover, meta, chapter list, bookmarking, read/listen CTAs
│   ├── reader/ReaderPage.tsx        # E-book reading experience (font size, light/sepia/dark themes)
│   ├── profile/ProfilePage.tsx      # Reader profile card, "Saved Books" (Кейін оқимын) collection
│   └── admin/
│       ├── AdminDashboard.tsx       # Book inventory table, active/archived tabs, quick archive/delete
│       ├── BookFormPage.tsx         # Create / Edit book form, cover upload, audio/chapters manager
│       └── ReadersPage.tsx          # Reader user directory, search, delete reader
├── store/                           # Zustand stores (Auth, Book, SavedBooks, AudioPlayer, Toast, Sidebar)
├── lib/api.ts                       # Axios instance, request/response interceptors
├── types/index.ts                   # TypeScript interfaces (Book, AudioChapter, User, Category)
└── utils/                           # migration.ts, security.ts, youtube.ts
```

### 1.3 Routing Matrix & Access Guards

| Path | Component | Guard / Protection Status | Notes |
|---|---|---|---|
| `#/` | `LandingPage` | Conditional view | If `role === 'admin'`, renders `<AdminDashboard />`. Readers see landing page. |
| `#/catalog` | `CatalogPage` | Public | Browsable by any user. |
| `#/book/:id` | `BookDetailPage` | Public / Role Check | Archived books hidden unless `role === 'admin'`. |
| `#/read/:id` | `ReaderPage` | Soft Guard | Fetches progress if authenticated. Shows error if archived and non-admin. |
| `#/profile` | `ProfilePage` | Client-side redirect | If admin, redirects to `#/admin`. If unauthenticated, displays login CTA card. |
| `#/admin` | `AdminDashboard` | **NO GUARD** | Rendered directly if visited. No authentication check or redirect. |
| `#/admin/readers` | `ReadersPage` | **NO GUARD** | Rendered directly. API call to `/api/admin/users` handles rejection. |
| `#/admin/books/new` | `BookFormPage` | **NO GUARD** | Rendered directly. Saving relies on backend RBAC. |
| `#/admin/books/:id/edit` | `BookFormPage` | **NO GUARD** | Rendered directly. Saving relies on backend RBAC. |

### 1.4 State Management Architecture (Zustand Stores)

1. **`useAuthStore` (`src/store/useAuthStore.ts`)**:
   - State: `user: User | null`, `role: 'admin' | 'client'`, `isAuthenticated: boolean`, `isLoading: boolean`.
   - Actions: `login(email, password)`, `register(name, email, password)`, `logout()`, `restoreSession()`, `loginAsAdmin()`, `loginAsClient()`.
   - Token storage: `localStorage.setItem('tanda_token', token)`.

2. **`useBookStore` (`src/store/useBookStore.ts`)**:
   - State: `books: Book[]`, `isLoading: boolean`, `isSyncing: boolean`, `searchQuery: string`, `selectedCategory: string`, `formatFilter`, `freeFilter`.
   - Actions: `fetchBooks(params)`, `fetchFromBackend()`, `fetchBookById(id)`, `addBook(newBook, customId)`, `updateBook(id, updates)`, `deleteBook(id)`, `toggleArchive(id)`.
   - Automatically invokes `fetchBooks()` on window initialization.

3. **`useSavedBooksStore` (`src/store/useSavedBooksStore.ts`)**:
   - State: `savedBookIds: string[]`, `isLoading: boolean`.
   - Actions: `fetchSavedBooks()`, `toggleSavedBook(bookId)` (optimistic update with rollback), `isBookSaved(bookId)`, `addSavedBook(bookId)`, `removeSavedBook(bookId)`.
   - Subscribes to `useAuthStore`: fetches on login, resets to `[]` on logout.

4. **`useAudioPlayerStore` (`src/store/useAudioPlayerStore.ts`)**:
   - Persisted to `localStorage` under `tanda_audio_player_state_v1`.
   - State: `currentBook`, `currentChapter`, `chapterIndex`, `isPlaying`, `progress`, `duration`, `playbackRate`, `volume`.
   - Background Sync: `debouncedSyncProgress(bookId, chapterId, timeSec)` sends `PUT /api/progress/${bookId}` every 3 seconds of playback.

5. **`useToastStore` (`src/store/useToastStore.ts`)**:
   - Ephemeral notification state: `toasts: ToastItem[]`, `showToast(message, type, duration)`.

6. **`useSidebarStore` (`src/store/useSidebarStore.ts`)**:
   - Mobile navigation state: `isOpen: boolean`, `toggleSidebar()`, `closeSidebar()`.

### 1.5 API Call Catalog

| Method | Frontend Endpoint | Invoking Location | Request Payload / Params | Expected Response | Auth Required |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | `useAuthStore.login` | `{ email, password }` | `{ token, user: UserResponseDto }` | Public |
| `POST` | `/api/auth/register` | `useAuthStore.register` | `{ name, email, password }` | `{ token, user: UserResponseDto }` | Public |
| `POST` | `/api/auth/logout` | `useAuthStore.logout` | None | `{ message: string }` | Public |
| `GET` | `/api/auth/me` | `useAuthStore.restoreSession` | None | `UserResponseDto` | Bearer Token |
| `GET` | `/api/books` | `useBookStore.fetchBooks` | `params: { category, search, includeArchived }` | `List<BookResponseDto>` | Public |
| `GET` | `/api/books/{id}` | `useBookStore.fetchBookById`, `ReaderPage` | Path param `id` | `BookDetailResponseDto` | Public |
| `POST` | `/api/books` | `useBookStore.addBook` | `CreateBookRequestDto` | `BookResponseDto` | Admin (ROLE_ADMIN) |
| `PUT` | `/api/books/{id}` | `useBookStore.updateBook` | `UpdateBookRequestDto` | `BookResponseDto` | Admin (ROLE_ADMIN) |
| `PATCH`| `/api/books/{id}/archive` | `useBookStore.toggleArchive` | `{ isArchived: boolean }` | `BookResponseDto` | Admin (ROLE_ADMIN) |
| `DELETE`| `/api/books/{id}` | `useBookStore.deleteBook` | Path param `id` | 204 No Content | Admin (ROLE_ADMIN) |
| `GET` | `/api/saved-books` | `useSavedBooksStore.fetchSavedBooks` | None | `{ bookIds: string[], books: BookResponseDto[] }` | Bearer Token |
| `POST` | `/api/saved-books/{bookId}` | `useSavedBooksStore.toggleSavedBook` | Path param `bookId` | `{ bookId, saved: true }` | Bearer Token |
| `DELETE`| `/api/saved-books/{bookId}` | `useSavedBooksStore.toggleSavedBook` | Path param `bookId` | 204 No Content | Bearer Token |
| `GET` | `/api/progress/{bookId}` | `ReaderPage` | Path param `bookId` | `ReadingProgressResponseDto` | Bearer Token |
| `PUT` | `/api/progress/{bookId}` | `useAudioPlayerStore.debouncedSyncProgress` | `{ currentAudioChapterId, currentAudioTime }` | `ReadingProgressResponseDto` | Bearer Token |
| `GET` | `/api/admin/users` | `ReadersPage.fetchReaders` | `params: { role: 'client' }` | `List<UserListResponseDto>` | Admin (ROLE_ADMIN) |
| `DELETE`| `/api/admin/users/{id}` | `ReadersPage.confirmDelete` | Path param `id` | 204 No Content | Admin (ROLE_ADMIN) |

---

## 2. Frontend Assumptions vs Backend Contracts Discrepancies

The survey uncovered several severe discrepancies between what the frontend expects and what the backend implements:

### Contract Discrepancy Matrix

| # | Discrepancy Area | Frontend Code / Assumption | Backend Code / Implementation | Impact & Severity |
|---|---|---|---|---|
| **1** | **Nullable Book Pages** | `BookFormPage.tsx:196`<br>`validPages = isNaN(pagesNum) \|\| pagesNum <= 0 ? (hasAudio ? null : 100) : pagesNum;`<br>`types/index.ts:13`: `pages: number \| null;` | `CreateBookRequestDto.java:32`<br>`@NotNull(message = "Pages count is required")`<br>`@Min(value = 1)`<br>`UpdateBookRequestDto.java:30` | **HIGH**: Audiobooks submitted without a page count fail with HTTP 400 Bad Request. Despite Flyway `V3__alter_books_pages_nullable.sql` making the column nullable, backend DTO validation was not updated. |
| **2** | **Base64 Cover & Audio Upload vs Column Length** | `BookFormPage.tsx:86, 129, 159`<br>`FileReader.readAsDataURL()` converts cover image (up to 5MB) and audio files into base64 Data URLs | `V1__init_books_schema.sql:11-12, 23`<br>`cover_image VARCHAR(1024)`<br>`audio_url VARCHAR(1024)`<br>`Book.java:59, 62` (`length = 1024`) | **HIGH**: Uploading any cover image or audio file from disk exceeds 1,024 characters and triggers an uncaught SQL DataException / HTTP 500 error in production. |
| **3** | **SecurityConfig Route Prefix Discrepancy (RBAC Bypass)** | Frontend calls `/api/admin/users`. Controllers also declare `/api/v1/admin/users`. | `SecurityConfig.java:58`<br>`.requestMatchers("/api/admin/**").hasRole("ADMIN")`<br>`UserController.java:22`<br>`@RequestMapping({"/api/admin/users", "/api/v1/admin/users"})` | **CRITICAL**: The path `/api/v1/admin/**` is NOT matched by `/api/admin/**`! Requests to `/api/v1/admin/users` fall through to `.anyRequest().authenticated()`, allowing ANY regular authenticated reader (`ROLE_USER`) to view, modify, or delete any user! |
| **4** | **Public Auth `/api/v1` Prefix Blocked** | Backend controllers declare `{"/api/auth", "/api/v1/auth"}` | `SecurityConfig.java:46`<br>`.requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout").permitAll()` | **MEDIUM**: Any client or test attempting to authenticate via `/api/v1/auth/login` is rejected with 401 Unauthorized because it hits `.anyRequest().authenticated()`. |
| **5** | **CORS Configuration Flaw** | Frontend runs on localhost:5173 or other host during development | `SecurityConfig.java:71, 74`<br>`config.setAllowedOriginPatterns(List.of("*"));`<br>`config.setAllowCredentials(true);` | **MEDIUM**: In modern browsers, combining wildcard origin patterns with credentials enabled can cause subtle CORS failures or security leakage. |
| **6** | **Reading Page Turn Progress Not Synchronized** | `ReaderPage.tsx:29` reads progress on mount, but has no mechanism or handler to update page reading progress when pages are turned. | `ReadingProgressController.java:37`<br>`PUT /api/progress/{bookId}` with `currentPage` | **LOW / FUNCTIONAL**: Reading progress for text books is never updated from the reader interface (only audio progress updates via `useAudioPlayerStore`). |
| **7** | **Client-side Route Protection** | Routes `/admin`, `/admin/readers`, `/admin/books/new`, `/admin/books/:id/edit` are defined without authentication guards. | N/A (Frontend navigation) | **LOW / UX**: Unauthenticated visitors who enter `#/admin` see the admin UI outline before individual API calls fail. |

---

## 3. Test Infrastructure & Existing Test Suite

### 3.1 Build & Test Tooling Configuration

#### Backend Build Tooling
- **Build Tool**: Gradle 9.7.1
- **JVM Target**: Java 17
- **Framework**: Spring Boot 3.3.0
- **Test Dependencies** (`backend/build.gradle`):
  - `org.springframework.boot:spring-boot-starter-test` (includes JUnit Jupiter 5, Mockito, AssertJ, JsonPath)
  - `org.springframework.security:spring-security-test` (includes `@WithMockUser`, Security MockMvc helpers)
  - `org.junit.platform:junit-platform-launcher`
- **Database in Tests**: H2 in-memory (`jdbc:h2:mem:tanda_test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL`)
- **Schema Management in Tests**: Flyway enabled, executing all 3 migrations (`V1`, `V2`, `V3`) against H2.

#### Frontend Build Tooling
- **Build Tool**: Vite 6.0.1
- **Type Checker**: TypeScript 5.6.3 (`tsc --noEmit` via build script)
- **Test Framework**: **NONE**. There is no `test` script in `frontend/package.json`, and no test framework (Vitest, Jest, Cypress, Playwright) is installed.

### 3.2 Baseline Test Execution Results

#### Backend Baseline (`sh ./gradlew test --rerun-tasks`)
- **Execution Command**: `sh ./gradlew test --rerun-tasks --info`
- **Total Tests Executed**: **15**
- **Passed**: **15**
- **Failed**: **0**
- **Skipped**: **0**
- **Duration**: 5.1 seconds
- **Status**: **100% GREEN**

*Note on Execution*: Directly executing `./gradlew test` in macOS zsh returns exit code 127 `operation not permitted: ./gradlew` due to macOS extended security attributes / gatekeeper restrictions on downloaded executable scripts. Running via the POSIX shell `sh ./gradlew test` bypasses this barrier cleanly.

#### Detailed Inventory of Existing Backend Tests

| Test Class | Method / Display Name | Category | Route Tested | Assertion Highlights |
|---|---|---|---|---|
| `TandaApplicationTests` | `contextLoads()` | Smoke | N/A | Verifies Spring application context boots up successfully. |
| `AuthControllerIntegrationTest` | `testRegisterSuccess`<br>"POST /api/auth/register creates new user and returns token" | Functional | `POST /api/auth/register` | Asserts 201 Created, token not null, user email, role = "client", idNumber not null. |
| `AuthControllerIntegrationTest` | `testLoginAdminSuccess`<br>"POST /api/auth/login logs in admin and returns token" | Functional | `POST /api/auth/login`<br>`GET /api/auth/me` | Asserts 200 OK, returns token, calls `/api/auth/me` with Bearer token, verifies admin role. |
| `AuthControllerIntegrationTest` | `testLoginWrongPassword`<br>"POST /api/auth/login with wrong password returns 401" | Security | `POST /api/auth/login` | Asserts 401 Unauthorized on invalid credentials. |
| `BookControllerIntegrationTest` | `testGetAllBooks`<br>"GET /api/v1/books returns 200 OK and book list" | Functional | `GET /api/v1/books` | Asserts 200 OK, list size >= 1. |
| `BookControllerIntegrationTest` | `testGetBooksByCategory`<br>"GET /api/v1/books with category filter returns matching books" | Functional | `GET /api/v1/books?category=Классика` | Asserts 200 OK, category = "Классика". |
| `BookControllerIntegrationTest` | `testGetBooksBySearch`<br>"GET /api/v1/books with search query returns matching books" | Functional | `GET /api/v1/books?search=Тест кітап` | Asserts 200 OK, title = "Тест кітап". |
| `BookControllerIntegrationTest` | `testGetBookByIdSuccess`<br>"GET /api/v1/books/{id} returns 200 OK for existing book with details" | Functional | `GET /api/v1/books/test-book-1` | Asserts 200 OK, matches title, author, category, chapters not null. |
| `BookControllerIntegrationTest` | `testGetBookByIdNotFound`<br>"GET /api/v1/books/{id} returns 404 NOT_FOUND for non-existing book" | Error Handling | `GET /api/v1/books/non-existing-book-id-999` | Asserts 404 Not Found, error payload structure. |
| `BookControllerIntegrationTest` | `testCreateBookSuccess`<br>"POST /api/v1/books creates a new book and returns 201 CREATED" | Functional | `POST /api/v1/books` | With `@WithMockUser(roles = "ADMIN")`, asserts 201 Created. |
| `BookControllerIntegrationTest` | `testCreateBookValidationFailure`<br>"POST /api/v1/books returns 400 BAD_REQUEST when validation fails" | Validation | `POST /api/v1/books` | With empty title and pages = 0, asserts 400 Bad Request. |
| `BookControllerIntegrationTest` | `testUpdateBookSuccess`<br>"PUT /api/v1/books/{id} updates book and returns 200 OK" | Functional | `PUT /api/v1/books/{id}` | With `@WithMockUser(roles = "ADMIN")`, asserts 200 OK, updated fields. |
| `BookControllerIntegrationTest` | `testDeleteBookSuccess`<br>"DELETE /api/v1/books/{id} removes book and returns 204 NO_CONTENT" | Functional | `DELETE /api/v1/books/{id}` | With `@WithMockUser(roles = "ADMIN")`, asserts 204 No Content, repository verifies deletion. |
| `SavedBookAndProgressIntegrationTest` | `testSavedBooksFlow`<br>"Saved books flow: Save, Get, and Delete" | Functional | `POST/GET/DELETE /api/saved-books/{id}` | Tests complete lifecycle as admin user. |
| `SavedBookAndProgressIntegrationTest` | `testReadingProgressFlow`<br>"Reading progress flow: Update and Get" | Functional | `PUT/GET /api/progress/{bookId}` | Tests updating and retrieving reading progress as admin user. |

#### Frontend Baseline (`npm run build`)
- **Execution Command**: `npm run build`
- **Underlying Scripts**: `tsc && vite build && cp dist/index.source.html dist/index.html && cp dist/index.source.html ./index.html && cp dist/index.source.html ./404.html && rm -rf ./assets && cp -r dist/assets ./assets`
- **Output**:
  - `dist/index.source.html` (0.86 kB)
  - `dist/assets/index-BLnunXcW.css` (42.81 kB)
  - `dist/assets/index.source-C9S-mbuG.js` (385.69 kB)
- **Status**: **PASS (0 errors, 1.33s)**

---

## 4. Test Coverage Gap Analysis (Requirements R1 - R5)

Comparing the authoritative requirements from `ORIGINAL_REQUEST.md` against the existing test suite reveals critical coverage deficits across all 5 requirement areas:

### 4.1 R1: Comprehensive Route & CRUD Endpoint Audit
- **Deficit 1 — UserController Completely Untested**:
  - `GET /api/admin/users` (with role and search parameters)
  - `GET /api/admin/users/{id}`
  - `PATCH /api/admin/users/{id}` (name, role, isActive updates)
  - `DELETE /api/admin/users/{id}`
  - *Status*: **0 tests exist**.
- **Deficit 2 — Dual Prefix Route Coverage**:
  - Existing tests in `BookControllerIntegrationTest` strictly test `/api/v1/books`. The frontend calls `/api/books`. Both prefixes need explicit test coverage.
- **Deficit 3 — PATCH /api/books/{id}/archive Untested**:
  - The book archiving endpoint (`PATCH /api/books/{id}/archive` and `/api/v1/books/{id}/archive`) is completely untested.
- **Deficit 4 — Validation Edge Cases**:
  - Register with invalid email (e.g. `invalid-email`, missing `@`).
  - Register with short password (< 6 characters).
  - Register with duplicate email (must return 400 with proper error message).
  - Audiobooks with `pages = null` (currently broken, needs test once patched).
  - Update or Delete non-existent book (assert 404).

### 4.2 R2: Access Control & RBAC Matrix Verification
The existing tests only verify that an admin *can* perform operations. There is **not a single test** proving that unauthorized or under-privileged users are blocked:

| Endpoint | Target Access | Unauthenticated Test (401) | Client User Test (403) | Admin Test (200/201/204) |
|---|---|:---:|:---:|:---:|
| `POST /api/books` & `/api/v1/books` | `ROLE_ADMIN` | **MISSING** | **MISSING** | Tested (`testCreateBookSuccess`) |
| `PUT /api/books/{id}` & `/api/v1/books/{id}` | `ROLE_ADMIN` | **MISSING** | **MISSING** | Tested (`testUpdateBookSuccess`) |
| `PATCH /api/books/{id}/archive` | `ROLE_ADMIN` | **MISSING** | **MISSING** | **MISSING** |
| `DELETE /api/books/{id}` & `/api/v1/books/{id}` | `ROLE_ADMIN` | **MISSING** | **MISSING** | Tested (`testDeleteBookSuccess`) |
| `GET /api/admin/users` | `ROLE_ADMIN` | **MISSING** | **MISSING** | **MISSING** |
| `GET /api/v1/admin/users` | `ROLE_ADMIN` | **MISSING** | **MISSING (FAILS/VULNERABLE)** | **MISSING** |
| `PATCH /api/admin/users/{id}` | `ROLE_ADMIN` | **MISSING** | **MISSING** | **MISSING** |
| `DELETE /api/admin/users/{id}` | `ROLE_ADMIN` | **MISSING** | **MISSING** | **MISSING** |
| `GET /api/auth/me` | Authenticated | **MISSING** | **MISSING** | Tested (Admin only) |
| `GET /api/saved-books` | Authenticated | **MISSING** | **MISSING** | Tested (Admin only) |
| `GET/PUT /api/progress/{id}` | Authenticated | **MISSING** | **MISSING** | Tested (Admin only) |

### 4.3 R3: IDOR & Row-Level Data Isolation (Tenant / User Boundary Security)
In `SavedBookAndProgressIntegrationTest`, all tests are executed solely with the `adminToken`. There are **zero tests** verifying isolation between two distinct client users:
- **Missing Test 1 (Saved Books Cross-User Read Isolation)**:
  - User A saves Book X.
  - User B fetches `/api/saved-books`.
  - Assert User B's response contains **zero** of User A's saved books.
- **Missing Test 2 (Saved Books Cross-User Delete Isolation)**:
  - User A saves Book X.
  - User B issues `DELETE /api/saved-books/{bookXId}`.
  - Assert User A's saved book remains untouched in User A's collection.
- **Missing Test 3 (Reading Progress Cross-User Read Isolation)**:
  - User A reads Book X to page 77, audio time 450s.
  - User B queries `GET /api/progress/{bookXId}`.
  - Assert User B receives default progress (page 1, audio time 0), NOT User A's progress.
- **Missing Test 4 (Reading Progress Cross-User Mutate Isolation)**:
  - User B updates progress on Book X to page 10.
  - Assert User A's progress on Book X remains page 77.
- **Missing Test 5 (User Profile & Directory Isolation)**:
  - User A attempts to view or update User B's profile via `/api/admin/users/{userBId}` or `/api/v1/admin/users/{userBId}`.
  - Assert 403 Forbidden is returned.

### 4.4 R4: Security Hardening & Vulnerability Remediation
- **Token Tampering / Forgery**:
  - No tests test sending an expired JWT, a JWT signed with an invalid key, a malformed JWT string, or an empty `Bearer` header.
- **Deactivated User Token Handling**:
  - `User.isActive = false` should invalidate active tokens during `JwtAuthFilter` processing. Currently no tests verify that deactivating a user immediately blocks their requests.
- **SQL / JPQL Injection Resistance**:
  - In `BookRepository.searchBooks` and `UserRepository.searchUsers`, verify that special SQL wildcard and quote characters (e.g. `test' OR '1'='1`, `%`, `_`) do not cause syntax errors or leak unauthorized records.

### 4.5 R5: Automated Regression & Verification Suite
- The project needs dedicated, cleanly separated integration test classes:
  1. `UserAdminIntegrationTest.java`: Complete CRUD coverage of `UserController`.
  2. `SecurityRbacMatrixIntegrationTest.java`: Matrix testing of all routes across `[Anonymous, Client (ROLE_USER), Admin (ROLE_ADMIN)]`.
  3. `IdorIsolationIntegrationTest.java`: Multi-tenant isolation tests for Saved Books, Reading Progress, and Profiles.
  4. Expanded `AuthControllerIntegrationTest.java` and `BookControllerIntegrationTest.java`: Boundary validation, archive toggling, and prefix parity (`/api` vs `/api/v1`).

---

## 5. Summary & Actionable Recommendations

1. **Fix Backend DTO Validations**:
   - In `CreateBookRequestDto` and `UpdateBookRequestDto`, remove `@NotNull` from `pages` and ensure `@Min(1)` applies only when `pages != null`, or use a custom class-level validation ensuring `pages` is required only if `hasAudio` is false.
2. **Fix Database Column Limits / Base64 Storage**:
   - Create a Flyway migration `V4__alter_books_and_chapters_urls_text.sql` to change `cover_image`, `audio_url`, and `audio_chapters.audio_url` from `VARCHAR(1024)` to `TEXT` (or `VARCHAR(65535)`), and update `@Column` lengths in `Book.java` and `AudioChapter.java`.
3. **Fix Spring Security Configuration**:
   - In `SecurityConfig.java`, fix matcher patterns to protect both `/api/admin/**` and `/api/v1/admin/**` with `hasRole("ADMIN")`.
   - Permit both `/api/auth/**` and `/api/v1/auth/**` for login, register, and logout.
   - Add `@EnableMethodSecurity` to `SecurityConfig` and add `@PreAuthorize("hasRole('ADMIN')")` to `UserController`.
   - Adjust CORS configuration to restrict allowed origin patterns cleanly.
4. **Implement Missing Regression & Security Test Suites**:
   - Create `UserAdminIntegrationTest` (full CRUD for `UserController`).
   - Create `SecurityRbacMatrixIntegrationTest` (comprehensive 401/403/200 matrix for all endpoints).
   - Create `IdorIsolationIntegrationTest` (two-user boundary tests for Saved Books, Progress, and Users).
5. **Verify Clean Build**:
   - Run `sh ./gradlew test` to ensure 100% test success across all new and existing suites.
   - Run `npm run build` in frontend to ensure zero type errors or bundling regressions.
