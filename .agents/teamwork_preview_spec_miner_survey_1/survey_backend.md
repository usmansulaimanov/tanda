# Comprehensive Backend Route & Security Specification Survey

**Document Version:** 1.0  
**Project:** Tanda (Spring Boot 3.3.0 + PostgreSQL / H2)  
**Survey Date:** 2026-09-10  
**Surveyed By:** Backend Route & Security Specification Miner (`teamwork_preview_spec_miner_survey_1`)  
**Scope:** Complete read-only audit of all Spring Boot REST controllers, routes, endpoints, security configurations, JWT mechanics, access controls, data boundaries, and validation models.

---

## 1. Executive Summary & Architecture Overview

The Tanda backend is a monolithic Spring Boot 3.3.0 REST service written in Java 17. It manages digital books, Kazakh literature, audio chapters, user profiles, saved bookmarks, and synchronized reading/audio progress.

### 1.1 Tech Stack Components
- **Language & Runtime:** Java 17 (OpenJDK 17.0.20.1)
- **Framework:** Spring Boot 3.3.0 (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-boot-starter-security`)
- **Persistence:** Spring Data JPA / Hibernate 6 with Flyway 10 migration engine
- **Databases:** PostgreSQL (production / local configurable) with in-memory H2 (for tests and local fallback profile)
- **Security & Tokens:** Spring Security 6 with JJWT 0.12.5 (`jjwt-api`, `jjwt-impl`, `jjwt-jackson`)
- **Testing:** JUnit 5 (Platform 1.10.2), Spring Test (`MockMvc`), Spring Security Test

### 1.2 Architectural Topology & Dual Routing
All controllers implement dual-prefix routing: both legacy `/api/...` and versioned `/api/v1/...` route aliases are mapped at the `@RequestMapping` class level:
1. `AuthController` -> `@RequestMapping({"/api/auth", "/api/v1/auth"})`
2. `BookController` -> `@RequestMapping({"/api/books", "/api/v1/books"})`
3. `UserController` -> `@RequestMapping({"/api/admin/users", "/api/v1/admin/users"})`
4. `SavedBookController` -> `@RequestMapping({"/api/saved-books", "/api/v1/saved-books"})`
5. `ReadingProgressController` -> `@RequestMapping({"/api/progress", "/api/v1/progress"})`

**CRITICAL ARCHITECTURAL FINDING:** While controllers support both `/api/*` and `/api/v1/*`, the Spring Security configuration (`SecurityConfig.java`) was written inconsistently. Specific matchers for `/api/admin/**` do NOT match `/api/v1/admin/**`, and permitAll matchers for `/api/auth/**` do NOT match `/api/v1/auth/**`. This creates severe security discrepancies between route aliases.

---

## 2. Comprehensive REST Controller & Endpoint Catalog

Across the 5 controllers, there are **19 distinct logical REST operations** mapped to **38 active URL endpoints**.

```
========================================================================================================================
#  METHOD  BASE PATH                URL PATTERNS                         AUTH / RBAC          CONTROLLER METHOD
========================================================================================================================
1  POST    /api/auth/login          /api/auth/login                      permitAll            AuthController.login
           /api/v1/auth/login       /api/v1/auth/login                   AUTH REQUIRED (BUG!)
------------------------------------------------------------------------------------------------------------------------
2  POST    /api/auth/register       /api/auth/register                   permitAll            AuthController.register
           /api/v1/auth/register    /api/v1/auth/register                AUTH REQUIRED (BUG!)
------------------------------------------------------------------------------------------------------------------------
3  POST    /api/auth/logout         /api/auth/logout                     permitAll            AuthController.logout
           /api/v1/auth/logout      /api/v1/auth/logout                  AUTH REQUIRED (BUG!)
------------------------------------------------------------------------------------------------------------------------
4  GET     /api/auth/me             /api/auth/me, /api/v1/auth/me        Authenticated        AuthController.getCurrentUser
------------------------------------------------------------------------------------------------------------------------
5  GET     /api/books               /api/books, /api/v1/books            permitAll            BookController.getAllBooks
------------------------------------------------------------------------------------------------------------------------
6  GET     /api/books/{id}          /api/books/{id}, /api/v1/books/{id}  permitAll            BookController.getBookById
------------------------------------------------------------------------------------------------------------------------
7  POST    /api/books               /api/books, /api/v1/books            ROLE_ADMIN           BookController.createBook
------------------------------------------------------------------------------------------------------------------------
8  PUT     /api/books/{id}          /api/books/{id}, /api/v1/books/{id}  ROLE_ADMIN           BookController.updateBook
------------------------------------------------------------------------------------------------------------------------
9  PATCH   /api/books/{id}/archive  .../books/{id}/archive               ROLE_ADMIN           BookController.toggleArchive
------------------------------------------------------------------------------------------------------------------------
10 DELETE  /api/books/{id}          /api/books/{id}, /api/v1/books/{id}  ROLE_ADMIN           BookController.deleteBook
------------------------------------------------------------------------------------------------------------------------
11 GET     /api/admin/users         /api/admin/users                     ROLE_ADMIN           UserController.getAllUsers
           /api/v1/admin/users      /api/v1/admin/users                  ANY AUTH USER (BUG!)
------------------------------------------------------------------------------------------------------------------------
12 GET     /api/admin/users/{id}    /api/admin/users/{id}                ROLE_ADMIN           UserController.getUserById
           /api/v1/admin/users/{id} /api/v1/admin/users/{id}             ANY AUTH USER (BUG!)
------------------------------------------------------------------------------------------------------------------------
13 PATCH   /api/admin/users/{id}    /api/admin/users/{id}                ROLE_ADMIN           UserController.updateUser
           /api/v1/admin/users/{id} /api/v1/admin/users/{id}             ANY AUTH USER (BUG!)
------------------------------------------------------------------------------------------------------------------------
14 DELETE  /api/admin/users/{id}    /api/admin/users/{id}                ROLE_ADMIN           UserController.deleteUser
           /api/v1/admin/users/{id} /api/v1/admin/users/{id}             ANY AUTH USER (BUG!)
------------------------------------------------------------------------------------------------------------------------
15 GET     /api/saved-books         /api/saved-books, /api/v1/...        Authenticated        SavedBookController.getSavedBooks
------------------------------------------------------------------------------------------------------------------------
16 POST    /api/saved-books/{id}    /api/saved-books/{id}, /api/v1/...   Authenticated        SavedBookController.saveBook
------------------------------------------------------------------------------------------------------------------------
17 DELETE  /api/saved-books/{id}    /api/saved-books/{id}, /api/v1/...   Authenticated        SavedBookController.removeSavedBook
------------------------------------------------------------------------------------------------------------------------
18 GET     /api/progress/{bookId}   /api/progress/{id}, /api/v1/...      Authenticated        ReadingProgressController.getProgress
------------------------------------------------------------------------------------------------------------------------
19 PUT     /api/progress/{bookId}   /api/progress/{id}, /api/v1/...      Authenticated        ReadingProgressController.updateProgress
========================================================================================================================
```

---

### Detailed Endpoint Specifications

#### Endpoint 1: Login User
- **HTTP Method & Paths:** `POST /api/auth/login`, `POST /api/v1/auth/login`
- **Controller Method:** `AuthController.login(@Valid @RequestBody LoginRequestDto request)`
- **Request Payload (`LoginRequestDto`):**
  - `email` (String, required, `@NotBlank`, `@Email`)
  - `password` (String, required, `@NotBlank`)
- **Response Type (`AuthResponseDto`):**
  - `token` (String, JWT bearer string)
  - `user` (`UserResponseDto`: `id`, `idNumber`, `name`, `email`, `role`, `isActive`, `createdAt`)
- **Expected Status Codes:**
  - `200 OK`: Successful authentication
  - `400 BAD_REQUEST`: Missing email or password, invalid email format
  - `401 UNAUTHORIZED`: User not found, bad password, account inactive (`isActive == false`), or if calling `/api/v1/auth/login` due to SecurityConfig filter bug
- **Security Rule:**
  - Specified in SecurityConfig: `/api/auth/login` is `permitAll()`.
  - Missing in SecurityConfig: `/api/v1/auth/login` is NOT permitAll, causing immediate 401 for unauthenticated clients.

#### Endpoint 2: Register New Client User
- **HTTP Method & Paths:** `POST /api/auth/register`, `POST /api/v1/auth/register`
- **Controller Method:** `AuthController.register(@Valid @RequestBody RegisterRequestDto request)`
- **Request Payload (`RegisterRequestDto`):**
  - `name` (String, required, `@NotBlank`, `@Size(min = 2, max = 255)`)
  - `email` (String, required, `@NotBlank`, `@Email`)
  - `password` (String, required, `@NotBlank`, `@Size(min = 6)`)
- **Response Type (`AuthResponseDto`):**
  - Status `201 CREATED`
  - Body: `{ token, user }`
- **Expected Status Codes:**
  - `201 CREATED`: Successfully created client account
  - `400 BAD_REQUEST`: Validation failure or duplicate email (`IllegalArgumentException: "Бұл email жүйеде тіркелген"`)
  - `401 UNAUTHORIZED`: When accessed via `/api/v1/auth/register` due to missing permitAll rule
- **Security Rule:**
  - `/api/auth/register` is `permitAll()`. Always assigns `role = "client"` and auto-generates library card `idNumber` (e.g., `"001 001"`).

#### Endpoint 3: Logout User
- **HTTP Method & Paths:** `POST /api/auth/logout`, `POST /api/v1/auth/logout`
- **Controller Method:** `AuthController.logout()`
- **Request Payload:** None
- **Response Type:** `Map<String, String>` -> `{"message": "Сәтті шықтыңыз"}`
- **Expected Status Codes:**
  - `200 OK`
  - `401 UNAUTHORIZED`: If accessed via `/api/v1/auth/logout` without token
- **Security Rule:**
  - `/api/auth/logout` is `permitAll()`. Note: JWT is stateless; no server-side invalidation/blacklist is currently performed.

#### Endpoint 4: Get Current Authenticated User Profile
- **HTTP Method & Paths:** `GET /api/auth/me`, `GET /api/v1/auth/me`
- **Controller Method:** `AuthController.getCurrentUser(@AuthenticationPrincipal UserPrincipal principal)`
- **Request Payload:** None (Requires `Authorization: Bearer <token>`)
- **Response Type (`UserResponseDto`):**
  - `id` (String), `idNumber` (String), `name` (String), `email` (String), `role` (String), `isActive` (Boolean), `createdAt` (OffsetDateTime)
- **Expected Status Codes:**
  - `200 OK`: Profile of the authenticated principal
  - `401 UNAUTHORIZED`: If unauthenticated or token expired/invalid
  - `404 NOT_FOUND`: If authenticated email is not found in database

#### Endpoint 5: Catalog Books (Search, Filter, List)
- **HTTP Method & Paths:** `GET /api/books`, `GET /api/v1/books`
- **Controller Method:** `BookController.getAllBooks(...)`
- **Request Parameters (Query params):**
  - `category` (String, optional, e.g. "Классика", "Бизнес", "Барлығы")
  - `search` (String, optional, query string matched against title and author)
  - `includeArchived` (boolean, optional, default `false`)
- **Response Type:** `List<BookResponseDto>`
- **Expected Status Codes:**
  - `200 OK`: List of matching books
- **Security Rule:**
  - `permitAll()` for both `/api/books` and `/api/v1/books`.
  - **Security Gap:** Anonymous users can pass `?includeArchived=true` to retrieve hidden/archived books.

#### Endpoint 6: Get Book Details by ID
- **HTTP Method & Paths:** `GET /api/books/{id}`, `GET /api/v1/books/{id}`
- **Controller Method:** `BookController.getBookById(@PathVariable String id)`
- **Request Parameters:**
  - Path variable `id` (String)
- **Response Type (`BookDetailResponseDto` extends `BookResponseDto`):**
  - Base book fields + `audioChapters: List<AudioChapterDto>` (`id`, `bookId`, `title`, `audioUrl`, `duration`, `chapterOrder`)
- **Expected Status Codes:**
  - `200 OK`: Book with ordered audio chapters
  - `404 NOT_FOUND`: If `id` does not exist (`ResourceNotFoundException`)
- **Security Rule:** `permitAll()`.

#### Endpoint 7: Create Book
- **HTTP Method & Paths:** `POST /api/books`, `POST /api/v1/books`
- **Controller Method:** `BookController.createBook(@Valid @RequestBody CreateBookRequestDto request)`
- **Request Payload (`CreateBookRequestDto`):**
  - `id` (String, optional; generated if omitted)
  - `title` (String, `@NotBlank`)
  - `author` (String, `@NotBlank`)
  - `description` (String, optional)
  - `category` (String, `@NotBlank`)
  - `pages` (Integer, `@NotNull`, `@Min(1)`)
  - `hasAudio` (Boolean, optional, default false)
  - `audioNarrator` (String, optional)
  - `audioDuration` (String, optional)
  - `audioUrl` (String, optional)
  - `coverImage` (String, optional)
  - `isFree` (Boolean, optional, default true)
  - `isArchived` (Boolean, optional, default false)
  - `gradient` (String, optional)
  - `audioChapters` (List<AudioChapterDto>, optional)
- **Response Type (`BookResponseDto`):**
  - Status `201 CREATED`
- **Expected Status Codes:**
  - `201 CREATED`: Book created
  - `400 BAD_REQUEST`: Validation error on blank fields or non-positive pages; or if ID already exists
  - `401 UNAUTHORIZED`: Anonymous request
  - `403 FORBIDDEN`: Non-admin authenticated user
- **Security Rule:** `hasRole("ADMIN")`.

#### Endpoint 8: Update Book
- **HTTP Method & Paths:** `PUT /api/books/{id}`, `PUT /api/v1/books/{id}`
- **Controller Method:** `BookController.updateBook(@PathVariable String id, @Valid @RequestBody UpdateBookRequestDto request)`
- **Request Payload (`UpdateBookRequestDto`):**
  - Same fields and validation as `CreateBookRequestDto` (except `id`).
- **Response Type (`BookResponseDto`):** Status `200 OK`.
- **Expected Status Codes:**
  - `200 OK`: Updated book
  - `400 BAD_REQUEST`: Validation errors
  - `401 UNAUTHORIZED`: Missing credentials
  - `403 FORBIDDEN`: Non-admin authenticated user
  - `404 NOT_FOUND`: Book ID does not exist
- **Security Rule:** `hasRole("ADMIN")`.

#### Endpoint 9: Toggle Book Archive Status
- **HTTP Method & Paths:** `PATCH /api/books/{id}/archive`, `PATCH /api/v1/books/{id}/archive`
- **Controller Method:** `BookController.toggleArchive(@PathVariable String id, @RequestBody(required = false) Map<String, Boolean> body)`
- **Request Payload:** JSON object `{"isArchived": boolean}` (defaults to `true` if body or field missing)
- **Response Type (`BookResponseDto`):** Status `200 OK`.
- **Expected Status Codes:**
  - `200 OK`: Archive status changed
  - `401 UNAUTHORIZED`: Unauthenticated
  - `403 FORBIDDEN`: Non-admin authenticated user
  - `404 NOT_FOUND`: Book ID not found
- **Security Rule:** `hasRole("ADMIN")`.

#### Endpoint 10: Delete Book
- **HTTP Method & Paths:** `DELETE /api/books/{id}`, `DELETE /api/v1/books/{id}`
- **Controller Method:** `BookController.deleteBook(@PathVariable String id)`
- **Response Type:** Status `204 NO_CONTENT` (with empty body)
- **Expected Status Codes:**
  - `204 NO_CONTENT`: Book and all cascading chapters/progress/saved-books deleted
  - `401 UNAUTHORIZED`: Unauthenticated
  - `403 FORBIDDEN`: Non-admin user
  - `404 NOT_FOUND`: Book ID not found
- **Security Rule:** `hasRole("ADMIN")`.

#### Endpoint 11: List All Readers / Users (Admin)
- **HTTP Method & Paths:** `GET /api/admin/users`, `GET /api/v1/admin/users`
- **Controller Method:** `UserController.getAllUsers(@RequestParam(required = false) String role, @RequestParam(required = false) String search)`
- **Request Parameters:**
  - `role` (String, optional, e.g. "client", "admin", "all")
  - `search` (String, optional, searches name, email, or idNumber)
- **Response Type:** `List<UserListResponseDto>`
  - Fields: `id`, `idNumber`, `name`, `email`, `role`, `isActive`, `createdAt`, `savedBooksCount`
- **Expected Status Codes:**
  - `200 OK`: List of users
  - `401 UNAUTHORIZED`: Unauthenticated
  - `403 FORBIDDEN`: If called via `/api/admin/users` by non-admin
- **Security Rule & Critical Flaw:**
  - `/api/admin/users` enforces `hasRole("ADMIN")`.
  - **VULNERABILITY:** `/api/v1/admin/users` is NOT covered by `/api/admin/**` in SecurityConfig! It defaults to `authenticated()`, allowing ANY authenticated client to list all users!

#### Endpoint 12: Get User By ID (Admin)
- **HTTP Method & Paths:** `GET /api/admin/users/{id}`, `GET /api/v1/admin/users/{id}`
- **Controller Method:** `UserController.getUserById(@PathVariable String id)`
- **Response Type (`UserResponseDto`):** Status `200 OK`.
- **Expected Status Codes:**
  - `200 OK`: User details
  - `401 UNAUTHORIZED`: Unauthenticated
  - `403 FORBIDDEN`: If called via `/api/admin/users/{id}` by non-admin
  - `404 NOT_FOUND`: User ID does not exist
- **Security Rule & Critical Flaw:**
  - Same authorization bypass on `/api/v1/admin/users/{id}`.

#### Endpoint 13: Update User Details & Role (Admin)
- **HTTP Method & Paths:** `PATCH /api/admin/users/{id}`, `PATCH /api/v1/admin/users/{id}`
- **Controller Method:** `UserController.updateUser(@PathVariable String id, @RequestBody UpdateUserRequestDto request)`
- **Request Payload (`UpdateUserRequestDto`):**
  - `name` (String, optional)
  - `role` (String, optional; e.g. "admin" or "client")
  - `isActive` (Boolean, optional)
- **Response Type (`UserResponseDto`):** Status `200 OK`.
- **Expected Status Codes:**
  - `200 OK`: User updated
  - `401 UNAUTHORIZED`: Unauthenticated
  - `403 FORBIDDEN`: Non-admin (on `/api/admin/users/{id}`)
  - `404 NOT_FOUND`: User ID not found
  - `500 INTERNAL_SERVER_ERROR`: If `role` is set to value not in `('admin', 'client')` due to unhandled DB constraint violation
- **Security Rule & Critical Flaw:**
  - **PRIVILEGE ESCALATION:** On `/api/v1/admin/users/{id}`, any client user can change their own or another user's role to `"admin"`.

#### Endpoint 14: Delete User (Admin)
- **HTTP Method & Paths:** `DELETE /api/admin/users/{id}`, `DELETE /api/v1/admin/users/{id}`
- **Controller Method:** `UserController.deleteUser(@PathVariable String id)`
- **Response Type:** Status `204 NO_CONTENT`.
- **Expected Status Codes:**
  - `204 NO_CONTENT`: User deleted
  - `401 UNAUTHORIZED`: Unauthenticated
  - `403 FORBIDDEN`: Non-admin (on `/api/admin/users/{id}`)
  - `404 NOT_FOUND`: User ID not found
- **Security Rule & Critical Flaw:**
  - On `/api/v1/admin/users/{id}`, any client user can delete users, including the admin.

#### Endpoint 15: List Saved Books for Authenticated User
- **HTTP Method & Paths:** `GET /api/saved-books`, `GET /api/v1/saved-books`
- **Controller Method:** `SavedBookController.getSavedBooks(@AuthenticationPrincipal UserPrincipal principal)`
- **Response Type (`SavedBookResponseDto`):**
  - `bookIds: List<String>`
  - `books: List<BookResponseDto>`
- **Expected Status Codes:**
  - `200 OK`: List of saved book IDs and details
  - `401 UNAUTHORIZED`: Missing or invalid token
- **Security & IDOR Posture:**
  - Strictly filtered by `principal.getId()`. User cannot view other users' saved books.

#### Endpoint 16: Save Book (Bookmark)
- **HTTP Method & Paths:** `POST /api/saved-books/{bookId}`, `POST /api/v1/saved-books/{bookId}`
- **Controller Method:** `SavedBookController.saveBook(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String bookId)`
- **Response Type:** Status `201 CREATED` -> `{"bookId": bookId, "saved": true}`
- **Expected Status Codes:**
  - `201 CREATED`: Book saved (idempotent: if already saved, returns 201)
  - `401 UNAUTHORIZED`: Unauthenticated
  - `404 NOT_FOUND`: If `bookId` does not exist in `books` table
- **Security & IDOR Posture:**
  - Strictly associated with `principal.getId()`.

#### Endpoint 17: Remove Saved Book
- **HTTP Method & Paths:** `DELETE /api/saved-books/{bookId}`, `DELETE /api/v1/saved-books/{bookId}`
- **Controller Method:** `SavedBookController.removeSavedBook(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String bookId)`
- **Response Type:** Status `204 NO_CONTENT`
- **Expected Status Codes:**
  - `204 NO_CONTENT`: Removed from user's saved list (idempotent)
  - `401 UNAUTHORIZED`: Unauthenticated
- **Security & IDOR Posture:**
  - Deletes only where `user_id = principal.getId() AND book_id = bookId`.

#### Endpoint 18: Get Reading / Audio Progress
- **HTTP Method & Paths:** `GET /api/progress/{bookId}`, `GET /api/v1/progress/{bookId}`
- **Controller Method:** `ReadingProgressController.getProgress(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String bookId)`
- **Response Type (`ReadingProgressResponseDto`):**
  - `id`, `bookId`, `userId`, `currentPage`, `currentAudioChapterId`, `currentAudioTime`, `updatedAt`
- **Expected Status Codes:**
  - `200 OK`: Current progress; if no progress record exists yet, returns default `{ bookId, userId, currentPage: 1, currentAudioTime: 0 }`
  - `401 UNAUTHORIZED`: Unauthenticated
- **Security & IDOR Posture:**
  - Strictly filtered by `principal.getId()` and `bookId`. User cannot read another user's progress.

#### Endpoint 19: Update Reading / Audio Progress
- **HTTP Method & Paths:** `PUT /api/progress/{bookId}`, `PUT /api/v1/progress/{bookId}`
- **Controller Method:** `ReadingProgressController.updateProgress(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String bookId, @RequestBody ReadingProgressRequestDto request)`
- **Request Payload (`ReadingProgressRequestDto`):**
  - `currentPage` (Integer, optional)
  - `currentAudioChapterId` (String, optional)
  - `currentAudioTime` (Integer, optional)
- **Response Type (`ReadingProgressResponseDto`):** Status `200 OK`.
- **Expected Status Codes:**
  - `200 OK`: Progress record updated or created
  - `401 UNAUTHORIZED`: Unauthenticated
  - `404 NOT_FOUND`: If `bookId` does not exist when creating initial record
- **Security & IDOR Posture:**
  - Updates only the authenticated user's record (`principal.getId()`).
  - **Validation Gap:** No validation constraints on negative numbers or chapter existence.

---

## 3. Spring Security Architecture Analysis

### 3.1 Security Filter Chain Configuration (`SecurityConfig.java`)
The filter chain is built via `SecurityFilterChain`:
1. **CSRF:** Explicitly disabled (`csrf(AbstractHttpConfigurer::disable)`). Standard for Bearer token REST APIs.
2. **CORS:** Handled via `cors(cors -> cors.configurationSource(corsConfigurationSource()))`.
3. **Session Management:** Set to `STATELESS` (`SessionCreationPolicy.STATELESS`).
4. **Exception Handling:** Custom `HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)` returns 401 on authentication failures.
5. **Filter Order:** `JwtAuthFilter` is inserted before `UsernamePasswordAuthenticationFilter`.

### 3.2 Authentication & JWT Token Mechanics
- **Provider:** `JwtTokenProvider` using HMAC-SHA256 with key derived from `jwt.secret`.
- **Key Safety:** If `jwt.secret` is fewer than 32 characters (256 bits), `JwtTokenProvider.init()` zero-pads the byte array up to 32 bytes (`System.arraycopy(keyBytes, 0, padded, 0, Math.min(keyBytes.length, 32))`).
- **Token Claims:**
  - `sub`: user email
  - `userId`: UUID string
  - `idNumber`: formatted library card number
  - `name`: user display name
  - `role`: "admin" or "client"
  - `iat`: issued-at timestamp
  - `exp`: expiration timestamp (`iat + jwt.expiration`)
- **Default Secret & Expiration:**
  - Default secret: `"tanda-super-secret-jwt-key-minimum-256-bits-for-security-2026"` in `application.yml` and `JwtProperties.java`.
  - Default expiration: 7 days (`604800000L` ms).
- **Authentication Lifecycle in `JwtAuthFilter`:**
  - Looks for header `Authorization: Bearer <jwt>`.
  - If token present and `jwtTokenProvider.validateToken(jwt)` is true:
    - Extracts email via `jwtTokenProvider.getEmailFromToken(jwt)`.
    - Invokes `UserDetailsServiceImpl.loadUserByUsername(email)`.
    - Verifies `userDetails.isEnabled()` (`user.getIsActive() == true`).
    - Constructs `UsernamePasswordAuthenticationToken` with authorities (`ROLE_ADMIN` or `ROLE_CLIENT`).
    - Populates `SecurityContextHolder.getContext().setAuthentication(authentication)`.
  - If token missing, invalid, or expired:
    - Exception is caught and logged at ERROR level; context remains empty; request proceeds as anonymous.

### 3.3 Password Hashing Posture
- Configured via bean `PasswordEncoder passwordEncoder()` returning `new BCryptPasswordEncoder(10)`.
- Default salt rounds: 10.
- Stored hash format in DB: Standard modular crypt format `$2a$10$...`.
- Seed Admin Account:
  - Email: `admin@tanda.kz`
  - Seed Password: `admin123`
  - Seeded in `V2__add_users_and_saved_books.sql` and updated dynamically in `DataInitializer.java`.

### 3.4 CORS Dual-Configuration Hazard
The codebase contains **two competing and conflicting CORS configurations**:
1. **In `SecurityConfig.java`:**
   ```java
   config.setAllowedOriginPatterns(List.of("*"));
   config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
   config.setAllowedHeaders(List.of("*"));
   config.setAllowCredentials(true);
   config.setMaxAge(3600L);
   ```
   *Hazard:* Combining `allowedOriginPatterns("*")` with `allowCredentials(true)` dynamically echoes back any origin in the `Access-Control-Allow-Origin` header while setting `Access-Control-Allow-Credentials: true`. Any malicious website can initiate credentialed authenticated requests.
2. **In `WebConfig.java` (`WebMvcConfigurer`):**
   ```java
   registry.addMapping("/**")
           .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000")
           .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
           .allowedHeaders("*")
           .allowCredentials(true);
   ```
   *Inconsistency:* `WebConfig` omits `PATCH` method (breaking `PATCH /api/books/{id}/archive` and `PATCH /api/admin/users/{id}` from frontend if MVC CORS intercepted), and conflicts with the permissive `SecurityConfig` CORS bean.

### 3.5 Security Headers Posture
- Spring Security defaults are active, but no explicit header policy is configured in `SecurityConfig.java`:
  - Missing Content Security Policy (`Content-Security-Policy`).
  - Missing HTTP Strict Transport Security (`Strict-Transport-Security`).
  - Missing Referrer Policy and Permissions Policy.

---

## 4. Insecurity & Vulnerability Audit

### 4.1 [CRITICAL] Broken Access Control & Privilege Escalation via `/api/v1/admin/users`
- **Location:** `SecurityConfig.java` line 58 vs `UserController.java` line 22.
- **Vulnerability Mechanism:**
  - `SecurityConfig.java` declares:
    `.requestMatchers("/api/admin/**").hasRole("ADMIN")`
  - It does NOT include `/api/v1/admin/**`.
  - Later, `SecurityConfig.java` has `.anyRequest().authenticated()`.
  - `UserController` declares `@RequestMapping({"/api/admin/users", "/api/v1/admin/users"})`.
  - When an attacker authenticates as a normal client (`role: "client"`) and sends requests to `/api/v1/admin/users`:
    - `GET /api/v1/admin/users` -> Succeeds! Dumps all user records, emails, names, roles, and card numbers.
    - `GET /api/v1/admin/users/{id}` -> Succeeds! Reads any user's profile.
    - `PATCH /api/v1/admin/users/{id}` with body `{"role": "admin"}` -> Succeeds! Elevates the client's role to `admin`!
    - `DELETE /api/v1/admin/users/{id}` -> Succeeds! Can delete any user, including administrators!

### 4.2 [CRITICAL] Route Prefix Inconsistency Breaking Authentication on `/api/v1/auth/*`
- **Location:** `SecurityConfig.java` line 46 vs `AuthController.java` line 23.
- **Vulnerability Mechanism:**
  - `SecurityConfig.java` permits:
    `.requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout").permitAll()`
  - It omits `/api/v1/auth/login`, `/api/v1/auth/register`, and `/api/v1/auth/logout`.
  - Requests to `/api/v1/auth/login` and `/api/v1/auth/register` hit `.anyRequest().authenticated()`.
  - Anonymous users attempting to log in or sign up via the versioned API route `/api/v1/auth/login` receive an immediate `401 Unauthorized`.

### 4.3 [HIGH] Missing Input Validation Annotations & DB Constraint Crashes
1. **`UpdateUserRequestDto`:** Missing `@Valid` in `UserController.updateUser()`.
   - The DTO has no field constraints.
   - The `role` field is updated directly in `user.setRole(dto.getRole().trim().toLowerCase())`.
   - The database table `users` enforces `CHECK (role IN ('admin', 'client'))`.
   - If a client supplies any string other than "admin" or "client" (e.g. "root"), JPA attempts the update and PostgreSQL throws a `DataIntegrityViolationException`, which unhandled results in a 500 error leaking internal DB details.
2. **`ReadingProgressRequestDto`:** Missing `@Valid` and constraints in `ReadingProgressController.updateProgress()`.
   - `currentPage`: Can be passed as negative (`-999`) or absurdly large numbers (`999999999`).
   - `currentAudioTime`: Can be passed as negative (`-120`).
   - `currentAudioChapterId`: No validation checking if chapter ID exists or belongs to the specified `bookId`.
3. **`BookController.toggleArchive`:** Uses raw `Map<String, Boolean> body` without DTO or structured validation.

### 4.4 [MEDIUM] Schema vs DTO Contradiction on `pages` Field
- **Location:** `V3__alter_books_pages_nullable.sql` vs `CreateBookRequestDto.java` line 32-34 and `UpdateBookRequestDto.java` line 30-32.
- **Vulnerability Mechanism:**
  - V3 migration dropped `NOT NULL` on `books.pages` specifically to support audiobooks that have no printed pages.
  - However, both `CreateBookRequestDto` and `UpdateBookRequestDto` still declare:
    ```java
    @NotNull(message = "Pages count is required")
    @Min(value = 1, message = "Pages must be at least 1")
    private Integer pages;
    ```
  - Any request to create an audiobook with `pages: null` or `pages: 0` is rejected with `400 Bad Request`.

### 4.5 [MEDIUM] Information Disclosure in `GlobalExceptionHandler.java`
- **Location:** `GlobalExceptionHandler.java` lines 48-51.
  ```java
  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex, HttpServletRequest request) {
      return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", ex.getMessage(), request.getRequestURI());
  }
  ```
- **Vulnerability Mechanism:**
  - `ex.getMessage()` is sent to clients in 500 Internal Server Error responses.
  - This leaks SQL syntax errors, table names, constraint names, internal class names, and JVM environment details.
- **Missing Specific Exception Handlers:**
  - `HttpMessageNotReadableException` (malformed JSON) -> returns 500 instead of 400 Bad Request.
  - `MethodArgumentTypeMismatchException` (path/query type mismatches) -> returns 500 instead of 400.
  - `DataIntegrityViolationException` -> returns 500 instead of 409 Conflict or 400.
  - `HttpRequestMethodNotSupportedException` -> returns 500 instead of 405 Method Not Allowed.

### 4.6 [MEDIUM] Missing Foreign Key Cascade on `reading_progress`
- **Location:** `V1__init_books_schema.sql` line 31 and `V3__alter_books_pages_nullable.sql`.
- In V1, `reading_progress` was created with `user_id VARCHAR(64) NOT NULL` before `users` table existed in V2.
- In V3, the foreign key constraint `fk_reading_progress_user` was omitted.
- Result: When a user is deleted via `DELETE /api/admin/users/{id}`, their `reading_progress` records remain orphaned in the database.

### 4.7 [MEDIUM] Unauthenticated Querying of Archived Books
- **Location:** `BookController.java` lines 35-40 and `BookService.java` lines 29-41.
- `GET /api/books?includeArchived=true` accepts the `includeArchived` boolean without checking if the user is authenticated as `ROLE_ADMIN`.
- Unauthenticated users can enumerate all unpublished, draft, or archived books.

### 4.8 [LOW] Admin Self-Deactivation and Self-Deletion
- `UserService.deleteUser()` and `UserService.updateUser()` have no guard preventing the last admin user from deactivating or deleting their own account, leading to system lockout.

---

## 5. Specification Miner Standard Tables

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Auth | User Login | Authenticates credentials and issues signed JWT | `POST /api/auth/login` (`LoginRequestDto`: `email`, `password`) | `200 OK` (`AuthResponseDto`: `token`, `user`) | `400` on validation fail; `401` on wrong pass/inactive account | `AuthController.java`, `AuthService.java` |
| 2 | Auth | User Registration | Registers new client user and assigns ID number | `POST /api/auth/register` (`RegisterRequestDto`: `name`, `email`, `password`) | `201 CREATED` (`AuthResponseDto`: `token`, `user`) | `400` on validation fail or duplicate email | `AuthController.java`, `AuthService.java` |
| 3 | Auth | User Logout | Client-side token disposal endpoint | `POST /api/auth/logout` | `200 OK` (`{"message": "Сәтті шықтыңыз"}`) | `200` always on `/api/auth/logout`; `401` on `/api/v1/auth/logout` | `AuthController.java` |
| 4 | Auth | Current User Profile | Retrieves authenticated principal details | `GET /api/auth/me` with Bearer token | `200 OK` (`UserResponseDto`: `id`, `name`, `email`, `role`, etc.) | `401` if token missing or invalid; `404` if user missing in DB | `AuthController.java` |
| 5 | Catalog | List Books | Retrieves books with category, search, and archived filters | `GET /api/books` (`category`, `search`, `includeArchived`) | `200 OK` (`List<BookResponseDto>`) | Returns empty list if no matches | `BookController.java`, `BookService.java` |
| 6 | Catalog | Get Book Details | Retrieves book details including ordered audio chapters | `GET /api/books/{id}` (path variable `id`) | `200 OK` (`BookDetailResponseDto` with `audioChapters`) | `404 NOT_FOUND` if book not found | `BookController.java`, `BookService.java` |
| 7 | Catalog | Create Book | Admin endpoint to add a new book and chapters | `POST /api/books` (`CreateBookRequestDto`) | `201 CREATED` (`BookResponseDto`) | `400` on validation fail/duplicate ID; `401` unauthenticated; `403` non-admin | `BookController.java`, `SecurityConfig.java` |
| 8 | Catalog | Update Book | Admin endpoint to edit book details and chapters | `PUT /api/books/{id}` (`UpdateBookRequestDto`) | `200 OK` (`BookResponseDto`) | `400` on validation fail; `401` unauth; `403` non-admin; `404` not found | `BookController.java`, `SecurityConfig.java` |
| 9 | Catalog | Toggle Book Archive | Admin endpoint to archive or unarchive a book | `PATCH /api/books/{id}/archive` (`{"isArchived": bool}`) | `200 OK` (`BookResponseDto`) | `401` unauth; `403` non-admin; `404` not found | `BookController.java`, `SecurityConfig.java` |
| 10 | Catalog | Delete Book | Admin endpoint to delete a book and its chapters | `DELETE /api/books/{id}` (path variable `id`) | `204 NO_CONTENT` | `401` unauth; `403` non-admin; `404` not found | `BookController.java`, `SecurityConfig.java` |
| 11 | Users (Admin) | List All Users | Admin endpoint to list/search users with bookmark counts | `GET /api/admin/users` (`role`, `search`) | `200 OK` (`List<UserListResponseDto>`) | `401` unauthenticated; `403` non-admin on `/api/admin` (bypass on `/api/v1`) | `UserController.java`, `UserService.java` |
| 12 | Users (Admin) | Get User By ID | Admin endpoint to view a specific user's profile | `GET /api/admin/users/{id}` (path variable `id`) | `200 OK` (`UserResponseDto`) | `401` unauth; `403` non-admin on `/api/admin`; `404` not found | `UserController.java`, `UserService.java` |
| 13 | Users (Admin) | Update User | Admin endpoint to change user name, role, or active state | `PATCH /api/admin/users/{id}` (`UpdateUserRequestDto`) | `200 OK` (`UserResponseDto`) | `401` unauth; `403` non-admin on `/api/admin`; `404` not found; `500` bad role | `UserController.java`, `UserService.java` |
| 14 | Users (Admin) | Delete User | Admin endpoint to delete a user account | `DELETE /api/admin/users/{id}` (path variable `id`) | `204 NO_CONTENT` | `401` unauth; `403` non-admin on `/api/admin`; `404` not found | `UserController.java`, `UserService.java` |
| 15 | Saved Books | List Saved Books | Retrieves all book IDs and book objects saved by user | `GET /api/saved-books` with Bearer token | `200 OK` (`SavedBookResponseDto`: `bookIds`, `books`) | `401 UNAUTHORIZED` if unauthenticated | `SavedBookController.java` |
| 16 | Saved Books | Save Book | Adds book to user's saved library | `POST /api/saved-books/{bookId}` with Bearer token | `201 CREATED` (`{"bookId": id, "saved": true}`) | `401` unauthenticated; `404` if book does not exist | `SavedBookController.java` |
| 17 | Saved Books | Remove Saved Book | Removes book from user's saved library | `DELETE /api/saved-books/{bookId}` with Bearer token | `204 NO_CONTENT` | `401 UNAUTHORIZED` if unauthenticated | `SavedBookController.java` |
| 18 | Progress | Get Progress | Retrieves user's page and audio progress for a book | `GET /api/progress/{bookId}` with Bearer token | `200 OK` (`ReadingProgressResponseDto`) | `401 UNAUTHORIZED` if unauthenticated | `ReadingProgressController.java` |
| 19 | Progress | Update Progress | Creates or updates user's reading/audio progress | `PUT /api/progress/{bookId}` (`ReadingProgressRequestDto`) | `200 OK` (`ReadingProgressResponseDto`) | `401` unauth; `404` if book does not exist on initial insert | `ReadingProgressController.java` |

## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Admin RBAC | Client token sent to `GET /api/v1/admin/users` | **200 OK** (Critical Vulnerability: non-admin can access admin endpoint due to missing route rule in SecurityConfig). |
| 2 | Admin Privilege Escalation | Client token sent to `PATCH /api/v1/admin/users/{id}` with `{"role": "admin"}` | **200 OK** (Critical Vulnerability: non-admin can escalate their own account to admin). |
| 3 | Versioned Auth Routing | Anonymous request to `POST /api/v1/auth/login` | **401 Unauthorized** (Functional Bug: versioned auth path rejected because only `/api/auth/login` is in permitAll). |
| 4 | Versioned Auth Routing | Anonymous request to `POST /api/v1/auth/register` | **401 Unauthorized** (Functional Bug: versioned register path rejected). |
| 5 | Book Creation | Create audiobook with `pages: null` | **400 Bad Request** ("Pages count is required", contradicts V3 migration making pages nullable for audiobooks). |
| 6 | Book Creation | Duplicate ID in `CreateBookRequestDto` | **400 Bad Request** (`IllegalArgumentException: "Book with id '...' already exists"`). |
| 7 | User Update Role | `PATCH /api/admin/users/{id}` with `{"role": "superadmin"}` | **500 Internal Server Error** (PostgreSQL check constraint fails: `CHECK (role IN ('admin', 'client'))`, leaks SQL exception). |
| 8 | Reading Progress | `PUT /api/progress/{bookId}` with `currentPage: -50`, `currentAudioTime: -300` | **200 OK** (Negative progress values saved into DB without validation). |
| 9 | Reading Progress | `PUT /api/progress/{bookId}` with arbitrary string for `currentAudioChapterId` | **200 OK** (Non-existent chapter ID saved without validation). |
| 10 | Saved Books | `POST /api/saved-books/{bookId}` for an already saved book | **201 CREATED** (Idempotent: returns 201 without throwing unique constraint error). |
| 11 | Saved Books | `DELETE /api/saved-books/{bookId}` for an unsaved book | **204 NO_CONTENT** (Idempotent: quietly succeeds). |
| 12 | Saved Books IDOR | User A attempts to delete or view User B's saved books | **Protected** (Endpoints strictly bind to authenticated `principal.getId()`). |
| 13 | Reading Progress IDOR | User A attempts to view or update User B's progress | **Protected** (Endpoints strictly bind to authenticated `principal.getId()`). |
| 14 | Error Handling | Send malformed JSON body to `POST /api/auth/login` | **500 Internal Server Error** (Unhandled `HttpMessageNotReadableException` caught by generic `Exception.class` handler instead of 400). |
| 15 | Error Handling | Send `GET /api/books/999` with non-matching HTTP method `POST` | **500 Internal Server Error** (Unhandled `HttpRequestMethodNotSupportedException` returns 500 instead of 405). |
| 16 | Catalog Privacy | Anonymous user requests `GET /api/books?includeArchived=true` | **200 OK** (Returns archived books to unauthenticated clients; no admin check). |
| 17 | Token Expiration | Expired JWT Bearer token presented in `Authorization` header | **401 Unauthorized** (`JwtTokenProvider.validateToken()` returns false; anonymous fallback triggers entry point). |
| 18 | Token Tampering | Modified JWT signature presented in `Authorization` header | **401 Unauthorized** (HMAC-SHA256 signature verification fails). |
| 19 | CORS Origin Reflection | Request with `Origin: https://evil.com` and credentials | **200 OK** with `Access-Control-Allow-Origin: https://evil.com` and `Access-Control-Allow-Credentials: true` (High Security Risk). |
| 20 | User Deletion Integrity | Delete user who has existing reading progress | **204 NO_CONTENT**, but orphan rows remain in `reading_progress` table due to missing foreign key cascade in SQL schema. |

---

## 6. Actionable Remediation & Hardening Plan

To achieve 100% security posture and pass the Acceptance Criteria in `ORIGINAL_REQUEST.md`:

1. **Fix `SecurityConfig.java` Route Matchers:**
   - Update public endpoints to include both `/api/...` and `/api/v1/...`:
     ```java
     .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout",
                      "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/logout").permitAll()
     ```
   - Update admin matchers to include `/api/v1/admin/**`:
     ```java
     .requestMatchers("/api/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
     ```
   - Enable method security by adding `@EnableMethodSecurity` to `SecurityConfig.java` and adding `@PreAuthorize("hasRole('ADMIN')")` to `UserController` and administrative methods in `BookController`.
2. **Fix CORS Misconfiguration:**
   - Remove wildcard origin pattern in `SecurityConfig.java`. Explicitly declare trusted origins (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`, and production domains) and harmonize with `WebConfig.java`.
3. **Harmonize DTO Validation on Book `pages`:**
   - In `CreateBookRequestDto` and `UpdateBookRequestDto`, remove `@NotNull` on `pages` and make `@Min(1)` apply only when `pages != null` (or validate conditionally if `hasAudio == false`).
4. **Harden User & Reading Progress DTOs:**
   - Add `@Valid` to `UserController.updateUser()` and validate `role` against `@Pattern(regexp = "^(admin|client)$")`.
   - Add `@Valid` to `ReadingProgressController.updateProgress()` and add `@Min(1)` on `currentPage` and `@Min(0)` on `currentAudioTime`.
5. **Harden `GlobalExceptionHandler.java`:**
   - Sanitize 500 error messages (do not return `ex.getMessage()` directly).
   - Add handlers for `HttpMessageNotReadableException` (400), `MethodArgumentTypeMismatchException` (400), `DataIntegrityViolationException` (409/400), and `HttpRequestMethodNotSupportedException` (405).
6. **Enforce Admin Check on `includeArchived`:**
   - In `BookController.getAllBooks()`, only allow `includeArchived == true` if the authenticated user has `ROLE_ADMIN`.
7. **Add Database Migration for Foreign Key:**
   - Add a Flyway migration (`V4__add_reading_progress_user_fk.sql`) to link `reading_progress.user_id` with `users(id)` `ON DELETE CASCADE`.
