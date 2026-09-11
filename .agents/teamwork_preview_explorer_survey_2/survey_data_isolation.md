# Comprehensive Security Survey: IDOR & Data Boundary Isolation

**Project:** Tanda E-Library (Spring Boot Backend + React Frontend)  
**Survey Focus:** Insecure Direct Object References (IDOR), Broken Object Level Authorization (BOLA), Tenant/User Boundary Protections, CRUD Data Filtering, and Query Security  
**Inspector:** IDOR & Data Boundary Explorer  
**Date:** 2026-09-10  
**Status:** Audit Completed — High-Priority Remediation Required  

---

## Executive Summary

A comprehensive, code-level security and data isolation audit was conducted across the entire Tanda backend architecture (`backend/src/main/java/com/tanda/`), encompassing all domain entities, Spring Data repositories, business service methods, REST controllers, Spring Security configurations, Flyway database migrations, and frontend client interactions.

The investigation revealed that while certain user-centric features (specifically, `SavedBook` and `ReadingProgress` under standard routes) properly bind user operations to the authenticated JWT principal (`UserPrincipal.getId()`), **critical data boundary and authorization flaws exist elsewhere in the backend**:
1. **Critical Privilege Escalation & Full IDOR on User Profiles:** The admin user management controller (`UserController`) maps `/api/v1/admin/users/**`, but `SecurityConfig` only restricts `/api/admin/**` to `ROLE_ADMIN`. Because `/api/v1/admin/**` is not covered by any specific matcher, it falls through to `.anyRequest().authenticated()`. As a result, **any authenticated standard client (`ROLE_CLIENT`) can access all administrative user CRUD operations**, enabling full database user dump, reading any user's profile, updating any user's role to `admin` (arbitrary vertical privilege escalation), and deleting any user account.
2. **Authentication Route Inconsistency:** In `SecurityConfig`, public access is granted to `/api/auth/login` and `/api/auth/register`, but the `/api/v1/auth/**` variants are excluded from `.permitAll()`, causing unauthenticated v1 requests to be rejected with HTTP 401.
3. **Data Boundary Leak on Archived Books:** `GET /api/books/{id}` permits public access and does not filter out archived books (`isArchived == true`), leaking private unlisted book contents, narrator details, audio URLs, and chapter structures to unauthorized callers.
4. **Data Integrity & Concurrency Race Condition in Reading Progress:** The `reading_progress` table lacks a database-level unique constraint on `(user_id, book_id)`. Concurrent progress sync requests can create duplicate rows, leading to permanent HTTP 500 errors via `NonUniqueResultException` when querying user progress.

### Vulnerability Severity Breakdown
| Severity | Count | Primary Impact |
| :--- | :---: | :--- |
| **Critical** | 1 | Complete vertical privilege escalation to admin, full user database dump, arbitrary user deletion |
| **High** | 1 | Route mismatch resulting in unauthenticated request rejections on `/api/v1/auth/**` |
| **Medium** | 2 | Archived book & asset information disclosure; DoS via duplicate reading progress records |
| **Low** | 4 | Cross-entity chapter referencing, unvalidated progress metrics, orphaned database records, sole admin lockout |

---

## 1. User-Scoped Entities, Repositories, and Service Layer Audit

### 1.1 Reading Progress Records
- **Entity (`ReadingProgress.java`):**
  - Identifier: String `id` (`rp-UUID`)
  - Association: `@ManyToOne Book book` (Foreign key `book_id`, `ON DELETE CASCADE`)
  - User identity: String `userId` (`length = 64, nullable = false`)
  - Progress metrics: `currentPage` (int), `currentAudioChapterId` (String), `currentAudioTime` (int), `updatedAt` (timestamp)
- **Repository (`ReadingProgressRepository.java`):**
  - Derived method: `Optional<ReadingProgress> findByUserIdAndBookId(String userId, String bookId)`
  - Query generation: Spring Data JPA automatically compiles to `SELECT rp FROM ReadingProgress rp WHERE rp.userId = ?1 AND rp.book.id = ?2`.
- **Service Layer (`ReadingProgressService.java`):**
  - `getProgress(String userId, String bookId)`: Queries strictly with `(userId, bookId)`. If not found, returns fallback DTO (`currentPage: 1, currentAudioTime: 0`) without exposing whether other users have read the book.
  - `updateProgress(String userId, String bookId, ReadingProgressRequestDto dto)`: Searches by `(userId, bookId)`. If null, creates new record stamped with `userId`. If present, updates `currentPage`, `currentAudioChapterId`, `currentAudioTime`, and `updatedAt`.
- **Controller (`ReadingProgressController.java`):**
  - Routes: `GET /api/progress/{bookId}`, `PUT /api/progress/{bookId}` (and `/api/v1/progress/{bookId}`)
  - Identity source: `@AuthenticationPrincipal UserPrincipal principal`
  - Both endpoints extract `principal.getId()` and pass it directly to the service.
- **Evaluation:**
  - Standard path variables do not expose user IDs. A user cannot view or mutate another user's progress by manipulating URL path variables.
  - **Weakness 1:** `dto.getCurrentAudioChapterId()` is not verified against `book.getAudioChapters()`. A user can link an audio chapter ID from another book or a fake ID.
  - **Weakness 2:** `reading_progress` table lacks a `UNIQUE (user_id, book_id)` constraint. Concurrent updates create duplicate entries, corrupting the single-result expectation of `findByUserIdAndBookId`.
  - **Weakness 3:** No foreign key from `reading_progress.user_id` to `users.id`. Deleting a user leaves orphaned progress records in the database.

### 1.2 Saved Books / Library Items
- **Entity (`SavedBook.java`):**
  - Identifier: String `id` (`sb-UUID`)
  - Associations: `@ManyToOne User user` (`user_id`, `ON DELETE CASCADE`), `@ManyToOne Book book` (`book_id`, `ON DELETE CASCADE`)
  - Constraint: `@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "book_id"}))`
- **Repository (`SavedBookRepository.java`):**
  - `findByUserIdOrderBySavedAtDesc(String userId)`
  - `findByUserIdAndBookId(String userId, String bookId)`
  - `existsByUserIdAndBookId(String userId, String bookId)`
  - `deleteByUserIdAndBookId(String userId, String bookId)`
  - `@Query("SELECT s.book.id FROM SavedBook s WHERE s.user.id = :userId") List<String> findBookIdsByUserId(@Param("userId") String userId)`
- **Service Layer (`SavedBookService.java`):**
  - `getSavedBooks(String userId)`: Scoped strictly to `userId`.
  - `saveBook(String userId, String bookId)`: Scoped strictly to `userId`.
  - `removeSavedBook(String userId, String bookId)`: Deletes strictly where `user_id = userId AND book_id = bookId`.
- **Controller (`SavedBookController.java`):**
  - Routes: `GET /api/saved-books`, `POST /api/saved-books/{bookId}`, `DELETE /api/saved-books/{bookId}` (and `/api/v1/saved-books/**`)
  - Identity source: `@AuthenticationPrincipal UserPrincipal principal`
- **Evaluation:**
  - Robust row-level tenant boundary. All repository queries filter by `principal.getId()`. User A cannot view, add, or delete User B's saved books.
  - **Minor Issue:** Archived books can still be saved if a user directly hits `POST /api/saved-books/{bookId}`, because `saveBook` only checks `bookRepository.findById` without verifying `book.getIsArchived()`.

### 1.3 User Profiles and Account Settings
- **Entity (`User.java`):**
  - Fields: `id`, `idNumber`, `name`, `email`, `passwordHash`, `role` (`admin` | `client`), `isActive`, `createdAt`
- **Repository (`UserRepository.java`):**
  - `findByEmail(String email)`
  - `searchUsers(@Param("role") String role, @Param("search") String search)`
- **Service Layer (`UserService.java` & `AuthService.java`):**
  - `AuthService.getMe(String email)`: Resolves user by principal email from token. Safe.
  - `UserService.getUserById(String id)`: Fetches user by raw ID. Does NOT check whether requester is admin or matches the target user.
  - `UserService.updateUser(String id, UpdateUserRequestDto dto)`: Mutates `name`, `role`, and `isActive` by raw ID. Does NOT check requester identity or role.
  - `UserService.deleteUser(String id)`: Deletes user by raw ID. Does NOT check requester identity or role.
- **Controller (`UserController.java`):**
  - Routes: `@RequestMapping({"/api/admin/users", "/api/v1/admin/users"})`
  - Methods:
    - `GET /api/admin/users` & `GET /api/v1/admin/users`
    - `GET /api/admin/users/{id}` & `GET /api/v1/admin/users/{id}`
    - `PATCH /api/admin/users/{id}` & `GET /api/v1/admin/users/{id}`
    - `DELETE /api/admin/users/{id}` & `DELETE /api/v1/admin/users/{id}`
- **Evaluation:**
  - **CRITICAL IDOR & BOLA VULNERABILITY:** While `/api/admin/**` is protected by `hasRole("ADMIN")` in `SecurityConfig.java:58`, `/api/v1/admin/**` is **NOT** included in the admin pattern.
  - Because `UserController` declares `@RequestMapping({"/api/admin/users", "/api/v1/admin/users"})`, any regular client authenticated with `ROLE_CLIENT` can invoke `/api/v1/admin/users/**`.
  - There are NO `@PreAuthorize` annotations on `UserController` methods, and `@EnableMethodSecurity` is disabled in `SecurityConfig`.
  - A regular client can read, update, or delete ANY user account, including changing their own role to `admin`.

### 1.4 Audio Chapters & Book Content
- **Entity (`AudioChapter.java` & `Book.java`):**
  - `AudioChapter`: `id`, `book` (ManyToOne, foreign key `book_id`), `title`, `audioUrl`, `duration`, `chapterOrder`
  - `Book`: `id`, `title`, `author`, `category`, `pages`, `hasAudio`, `audioNarrator`, `audioDuration`, `audioUrl`, `coverImage`, `isFree`, `isArchived`, `audioChapters` (OneToMany, `CascadeType.ALL`, `orphanRemoval = true`)
- **Repository (`AudioChapterRepository.java` & `BookRepository.java`):**
  - `AudioChapterRepository`: Exists with `findByBookIdOrderByChapterOrderAsc`, but is not directly used in the service layer.
  - `BookRepository`: Exposes `searchBooks(@Param("category") String category, @Param("search") String search, @Param("includeArchived") boolean includeArchived)`.
- **Controller & Service (`BookController.java`, `BookService.java`):**
  - `GET /api/books`: Public. Correctly defaults `includeArchived = false`.
  - `GET /api/books/{id}`: Public. Calls `bookRepository.findById(id)` and returns `BookDetailResponseDto` containing all `audioChapters` and URLs. **Fails to verify `isArchived == false` for non-admin/unauthenticated callers.**
  - `POST /api/books`, `PUT /api/books/{id}`, `PATCH /api/books/{id}/archive`, `DELETE /api/books/{id}`: Restricted to `ROLE_ADMIN` in `SecurityConfig` for both `/api/books` and `/api/v1/books`.

---

## 2. CRUD Operation Matrix: Ownership & Tenant Boundary Verification

| Controller | HTTP Method | Path Pattern | Required Authority | Principal Scoped? | Path/Body ID Manipulation? | Query Filters by User ID? | Service Ownership Check? | Vulnerability / Exposure |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `AuthController` | POST | `/api/auth/login` | Anonymous | N/A | No | No (by email) | Validates BCrypt hash & active | None |
| `AuthController` | POST | `/api/v1/auth/login` | Anonymous | N/A | No | No (by email) | Validates BCrypt hash & active | **401 Unauth** (Missing PermitAll) |
| `AuthController` | POST | `/api/auth/register` | Anonymous | N/A | No | Checks email exists | Enforces `role='client'` | None |
| `AuthController` | POST | `/api/v1/auth/register` | Anonymous | N/A | No | Checks email exists | Enforces `role='client'` | **401 Unauth** (Missing PermitAll) |
| `AuthController` | GET | `/api/auth/me` | Authenticated | Yes (`email`) | No | Yes (by principal email) | Returns authenticated user | None |
| `AuthController` | GET | `/api/v1/auth/me` | Authenticated | Yes (`email`) | No | Yes (by principal email) | Returns authenticated user | None |
| `ReadingProgress` | GET | `/api/progress/{bookId}` | Authenticated | Yes (`id`) | No (bookId only) | Yes (`findByUserIdAndBookId`) | Scoped to caller | None |
| `ReadingProgress` | PUT | `/api/progress/{bookId}` | Authenticated | Yes (`id`) | No (bookId only) | Yes (`findByUserIdAndBookId`) | Stamped with caller ID | Unchecked chapter ID & range |
| `SavedBook` | GET | `/api/saved-books` | Authenticated | Yes (`id`) | No | Yes (`findByUserId...`) | Scoped to caller | None |
| `SavedBook` | POST | `/api/saved-books/{bookId}` | Authenticated | Yes (`id`) | No (bookId only) | Yes (`existsByUserIdAndBookId`) | Stamped with caller ID | Can save archived book |
| `SavedBook` | DELETE | `/api/saved-books/{bookId}` | Authenticated | Yes (`id`) | No (bookId only) | Yes (`deleteByUserIdAndBookId`) | Scoped to caller | None |
| `Book` | GET | `/api/books` | Public | No | No | N/A | Excludes archived | None |
| `Book` | GET | `/api/books/{id}` | Public | No | Yes (`{id}`) | No (finds by book ID) | None | **Info Leak** on archived books |
| `Book` | POST | `/api/books` | ROLE_ADMIN | No | Custom ID allowed | N/A | None (Admin only) | None |
| `Book` | PUT | `/api/books/{id}` | ROLE_ADMIN | No | Target `{id}` | N/A | None (Admin only) | None |
| `Book` | PATCH | `/api/books/{id}/archive` | ROLE_ADMIN | No | Target `{id}` | N/A | None (Admin only) | None |
| `Book` | DELETE | `/api/books/{id}` | ROLE_ADMIN | No | Target `{id}` | N/A | None (Admin only) | None |
| `User` | GET | `/api/admin/users` | ROLE_ADMIN | No | No | Admin-only query | Admin only | None |
| `User` | GET | `/api/v1/admin/users` | Authenticated | No | No | Returns all users | **None** | **CRITICAL IDOR/Data Dump** |
| `User` | GET | `/api/admin/users/{id}` | ROLE_ADMIN | No | Target `{id}` | Finds by ID | Admin only | None |
| `User` | GET | `/api/v1/admin/users/{id}` | Authenticated | No | Target `{id}` | Finds by ID | **None** | **CRITICAL IDOR Read** |
| `User` | PATCH | `/api/admin/users/{id}` | ROLE_ADMIN | No | Target `{id}` | Finds by ID | Can alter any user | Admin only |
| `User` | PATCH | `/api/v1/admin/users/{id}` | Authenticated | No | Target `{id}` | Finds by ID | **None** | **CRITICAL Privilege Escalation** |
| `User` | DELETE | `/api/admin/users/{id}` | ROLE_ADMIN | No | Target `{id}` | Deletes by ID | Can delete any user | Admin only |
| `User` | DELETE | `/api/v1/admin/users/{id}` | Authenticated | No | Target `{id}` | Deletes by ID | **None** | **CRITICAL IDOR Deletion** |

---

## 3. SQL / JPQL Injection & Parameter Handling Audit

All repository interfaces and queries were analyzed for injection risks and unvalidated dynamic query construction:

1. **`BookRepository.searchBooks`:**
   ```java
   @Query("SELECT b FROM Book b WHERE " +
          "(:includeArchived = true OR b.isArchived = false) AND " +
          "(:category IS NULL OR :category = '' OR :category = 'Барлығы' OR LOWER(b.category) = LOWER(:category)) AND " +
          "(:search IS NULL OR :search = '' OR " +
          " LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
          " LOWER(b.author) LIKE LOWER(CONCAT('%', :search, '%'))) " +
          "ORDER BY b.createdAt DESC")
   List<Book> searchBooks(@Param("category") String category,
                          @Param("search") String search,
                          @Param("includeArchived") boolean includeArchived);
   ```
   - **Parameter Binding:** Uses named parameters (`:category`, `:search`, `:includeArchived`) bound via `@Param`.
   - **Injection Risk:** Safe. The query is parsed and parameterized by Hibernate. No raw SQL concatenation.
   - **Wildcard Handling:** The user search term is concatenated with `%...%`. Unescaped `%` or `_` in the search string will function as wildcards in SQL LIKE queries, but cannot alter the AST or execute arbitrary SQL commands.

2. **`UserRepository.searchUsers`:**
   ```java
   @Query("SELECT u FROM User u WHERE (:role IS NULL OR u.role = :role) AND " +
          "(:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.idNumber) LIKE LOWER(CONCAT('%', :search, '%'))) " +
          "ORDER BY u.createdAt DESC")
   List<User> searchUsers(@Param("role") String role, @Param("search") String search);
   ```
   - **Parameter Binding:** Uses named parameters bound via `@Param`.
   - **Injection Risk:** Safe from SQL injection.

3. **`SavedBookRepository.findBookIdsByUserId`:**
   ```java
   @Query("SELECT s.book.id FROM SavedBook s WHERE s.user.id = :userId")
   List<String> findBookIdsByUserId(@Param("userId") String userId);
   ```
   - **Parameter Binding:** Strongly typed named parameter `:userId`.
   - **Injection Risk:** Completely safe.

4. **Dynamic Query Frameworks:**
   - No instances of `EntityManager.createNativeQuery()`, `EntityManager.createQuery()` with dynamic strings, `JdbcTemplate`, or raw `Statement` were found anywhere in the codebase.
   - All persistence queries rely on Spring Data JPA derived queries and static JPQL `@Query` annotations with parameter substitution.

---

## 4. In-Depth Vulnerability Enumeration

### [VULN-01] [CRITICAL] Missing Authorization on `/api/v1/admin/**` Route Prefix (IDOR + Vertical Privilege Escalation to Admin)
- **Vulnerability Type:** Broken Object Level Authorization (CWE-639) / Broken Function Level Authorization (CWE-285)
- **CVSS v3.1 Score:** **9.8 (Critical)** — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H`
- **Location:**
  - `backend/src/main/java/com/tanda/config/SecurityConfig.java:58`
  - `backend/src/main/java/com/tanda/controller/UserController.java:22`
- **Root Cause Analysis:**
  In `UserController.java`, the controller is mapped to two route prefixes:
  ```java
  @RestController
  @RequestMapping({"/api/admin/users", "/api/v1/admin/users"})
  public class UserController { ... }
  ```
  However, in `SecurityConfig.java`, lines 54-58 configure the admin access rules:
  ```java
  .requestMatchers(HttpMethod.POST, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
  .requestMatchers(HttpMethod.PUT, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
  .requestMatchers(HttpMethod.PATCH, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
  .requestMatchers(HttpMethod.DELETE, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
  .requestMatchers("/api/admin/**").hasRole("ADMIN")
  ```
  While `BookController` routes explicitly list both `/api/books` and `/api/v1/books`, the admin route configuration **only matches `/api/admin/**`**.
  Because `/api/v1/admin/**` does not match `/api/admin/**`, Spring Security evaluates it against line 61:
  ```java
  .anyRequest().authenticated()
  ```
  Consequently, any client with a valid token (e.g. `ROLE_CLIENT`) passes authentication and gains unrestricted access to all endpoints under `/api/v1/admin/users`.
- **Proof of Concept / Exploitation Scenario:**
  1. Attacker registers as a regular client via `POST /api/auth/register` and receives a JWT token with `role: "client"`.
  2. Attacker sends `GET /api/v1/admin/users` with `Authorization: Bearer <client_token>`.
     - *Result:* HTTP 200 OK. Returns full list of all users, email addresses, real names, user IDs, and registration metadata across the system.
  3. Attacker sends `PATCH /api/v1/admin/users/{attacker-user-id}`:
     ```json
     {
       "role": "admin"
     }
     ```
     - *Result:* HTTP 200 OK. Attacker's account role is updated in the database to `"admin"`.
  4. Attacker can also delete any target user: `DELETE /api/v1/admin/users/admin-1`.
     - *Result:* HTTP 204 No Content. Primary administrator account is deleted.
- **Remediation:**
  1. In `SecurityConfig.java`, update the admin matcher to include `/api/v1/admin/**`:
     ```java
     .requestMatchers("/api/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
     ```
  2. In `SecurityConfig.java`, enable method security by adding `@EnableMethodSecurity`:
     ```java
     @Configuration
     @EnableWebSecurity
     @EnableMethodSecurity
     public class SecurityConfig { ... }
     ```
  3. In `UserController.java`, annotate the class with `@PreAuthorize("hasRole('ADMIN')")` as defense-in-depth:
     ```java
     @RestController
     @RequestMapping({"/api/admin/users", "/api/v1/admin/users"})
     @PreAuthorize("hasRole('ADMIN')")
     @RequiredArgsConstructor
     public class UserController { ... }
     ```

---

### [VULN-02] [HIGH] Missing PermitAll on `/api/v1/auth/login` and `/api/v1/auth/register` (Authentication Inconsistency)
- **Vulnerability Type:** Missing Authorization Rule / Functional Breakage (CWE-285)
- **CVSS v3.1 Score:** **7.5 (High)** — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`
- **Location:**
  - `backend/src/main/java/com/tanda/config/SecurityConfig.java:46`
  - `backend/src/main/java/com/tanda/controller/AuthController.java:23`
- **Root Cause Analysis:**
  `AuthController` maps `@RequestMapping({"/api/auth", "/api/v1/auth"})`.
  However, `SecurityConfig.java:46` only permits:
  ```java
  .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout").permitAll()
  ```
  Any request sent to `/api/v1/auth/login` or `/api/v1/auth/register` without an `Authorization` header is blocked by `.anyRequest().authenticated()` with HTTP 401 Unauthorized.
- **Remediation:**
  Update `SecurityConfig.java` to permit both `/api/auth/**` and `/api/v1/auth/**` public authentication endpoints:
  ```java
  .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout",
                   "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/logout").permitAll()
  ```

---

### [VULN-03] [MEDIUM] Direct Object Reference & Data Leak of Archived Books and Audio Assets (`GET /api/books/{id}`)
- **Vulnerability Type:** Insecure Direct Object Reference (CWE-639) / Information Exposure (CWE-200)
- **CVSS v3.1 Score:** **6.5 (Medium)** — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N`
- **Location:**
  - `backend/src/main/java/com/tanda/controller/BookController.java:44-47`
  - `backend/src/main/java/com/tanda/service/BookService.java:44-48`
- **Root Cause Analysis:**
  While the book listing endpoint (`GET /api/books`) filters out archived books when `includeArchived == false`, `getBookById(String id)` performs a raw lookup:
  ```java
  Book book = bookRepository.findById(id)
          .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
  return toDetailResponseDto(book);
  ```
  `GET /api/books/{id}` is public. If an administrator archives a book to withdraw or hide it from the catalog, unauthenticated callers or regular clients who know or guess the ID can still access the complete book record, description, narrator, and full audio URLs.
  The frontend was forced to implement client-side filtering (`ReaderPage.tsx:39: if (!book || (book.isArchived && role !== 'admin'))`), leaving the backend API unprotected.
- **Remediation:**
  In `BookService.getBookById`, check if the book is archived. If archived, allow access only if the authenticated user possesses `ROLE_ADMIN`:
  ```java
  public BookDetailResponseDto getBookById(String id, Authentication authentication) {
      Book book = bookRepository.findById(id)
              .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
      boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
              .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
      if (Boolean.TRUE.equals(book.getIsArchived()) && !isAdmin) {
          throw new ResourceNotFoundException("Book", "id", id);
      }
      return toDetailResponseDto(book);
  }
  ```

---

### [VULN-04] [MEDIUM] Lack of Unique Constraint on `reading_progress (user_id, book_id)` Causing Race Condition Denial of Service
- **Vulnerability Type:** Race Condition (CWE-362) / Concurrent Execution without Protection (CWE-820)
- **CVSS v3.1 Score:** **5.3 (Medium)** — `CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:L/A:H`
- **Location:**
  - `backend/src/main/resources/db/migration/V1__init_books_schema.sql:28-40`
  - `backend/src/main/java/com/tanda/entity/ReadingProgress.java:21`
  - `backend/src/main/java/com/tanda/service/ReadingProgressService.java:43-59`
- **Root Cause Analysis:**
  In `V1__init_books_schema.sql`, the table is defined with only a non-unique index:
  ```sql
  CREATE INDEX idx_reading_progress_user_book ON reading_progress(user_id, book_id);
  ```
  In contrast, `saved_books` has a unique constraint `UNIQUE (user_id, book_id)`.
  When a user opens an audio player and a reader simultaneously, or rapidly triggers progress sync:
  - Request 1 checks `findByUserIdAndBookId(userId, bookId)` -> returns empty.
  - Request 2 checks `findByUserIdAndBookId(userId, bookId)` -> returns empty.
  - Both requests build and insert a new `ReadingProgress` record.
  - Subsequently, when the user requests `GET /api/progress/{bookId}`, Spring Data's `findByUserIdAndBookId` encounters two matching rows and throws `IncorrectResultSizeDataAccessException` / `NonUniqueResultException`.
  - The API responds with HTTP 500, rendering reading and listening progress broken for that user indefinitely.
- **Remediation:**
  1. Add a database migration (e.g. `V4__add_unique_constraint_to_reading_progress.sql`) to clean any existing duplicates and enforce:
     ```sql
     ALTER TABLE reading_progress ADD CONSTRAINT uq_reading_progress_user_book UNIQUE (user_id, book_id);
     ```
  2. Update `ReadingProgress.java` annotation:
     ```java
     @Table(
         name = "reading_progress",
         uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "book_id"})
     )
     ```

---

### [VULN-05] [LOW] Unvalidated Audio Chapter Reference in Reading Progress (`currentAudioChapterId` cross-reference injection)
- **Vulnerability Type:** Improper Input Validation (CWE-20)
- **CVSS v3.1 Score:** **4.3 (Low)** — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N`
- **Location:**
  - `backend/src/main/java/com/tanda/service/ReadingProgressService.java:63-65`
- **Root Cause Analysis:**
  In `ReadingProgressService.updateProgress`:
  ```java
  if (dto.getCurrentAudioChapterId() != null) {
      progress.setCurrentAudioChapterId(dto.getCurrentAudioChapterId());
  }
  ```
  The service does not verify that `dto.getCurrentAudioChapterId()` corresponds to an active chapter in the target `bookId`. An attacker can submit an arbitrary string or a chapter ID belonging to another book.
- **Remediation:**
  If `dto.getCurrentAudioChapterId()` is provided, verify it against the book's `audioChapters`:
  ```java
  if (dto.getCurrentAudioChapterId() != null && !dto.getCurrentAudioChapterId().isBlank()) {
      boolean chapterExists = book.getAudioChapters().stream()
              .anyMatch(ch -> ch.getId().equals(dto.getCurrentAudioChapterId().trim()));
      if (!chapterExists) {
          throw new IllegalArgumentException("Аудио тарау бұл кітапқа тиесілі емес: " + dto.getCurrentAudioChapterId());
      }
      progress.setCurrentAudioChapterId(dto.getCurrentAudioChapterId().trim());
  }
  ```

---

### [VULN-06] [LOW] Missing Input Range Validation on Reading Progress Metrics (`currentPage`, `currentAudioTime`)
- **Vulnerability Type:** Improper Input Validation (CWE-20)
- **CVSS v3.1 Score:** **3.5 (Low)** — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N`
- **Location:**
  - `backend/src/main/java/com/tanda/dto/progress/ReadingProgressRequestDto.java`
- **Root Cause Analysis:**
  `ReadingProgressRequestDto` does not annotate `currentPage` with `@Min(1)` or `@NotNull`. A client can submit negative page values (`-100`) or audio time values (`-3600`). Additionally, `currentPage` can exceed the book's total page count.
- **Remediation:**
  Add Jakarta Bean Validation constraints to `ReadingProgressRequestDto`:
  ```java
  @Min(value = 1, message = "Бет нөмірі кем дегенде 1 болуы керек")
  private Integer currentPage;

  @Min(value = 0, message = "Аудио уақыты теріс болмауы керек")
  private Integer currentAudioTime;
  ```
  In `ReadingProgressController`, annotate `@Valid @RequestBody ReadingProgressRequestDto request`.
  In `ReadingProgressService`, clamp or validate `currentPage <= book.getPages()`.

---

### [VULN-07] [LOW] Missing Foreign Key Constraint on `reading_progress.user_id` Causing Orphaned Records
- **Vulnerability Type:** Data Integrity Issue (CWE-459)
- **CVSS v3.1 Score:** **3.1 (Low)** — `CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:L/A:N`
- **Location:**
  - `backend/src/main/resources/db/migration/V1__init_books_schema.sql:31`
- **Root Cause Analysis:**
  Because the `reading_progress` table was created in Flyway migration `V1` before the `users` table was introduced in `V2`, `reading_progress.user_id` is defined as a bare `VARCHAR(64)`. When a user account is deleted, the user's reading progress records remain orphaned in the database.
- **Remediation:**
  In a new Flyway migration script, attach a foreign key constraint with cascade deletion:
  ```sql
  ALTER TABLE reading_progress
  ADD CONSTRAINT fk_reading_progress_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  ```

---

### [VULN-08] [LOW] Unrestricted Self-De-escalation / Sole Administrator Deletion in `UserService`
- **Vulnerability Type:** Uncontrolled Administrative State Mutation (CWE-269)
- **CVSS v3.1 Score:** **3.1 (Low)** — `CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:N/A:L`
- **Location:**
  - `backend/src/main/java/com/tanda/service/UserService.java:50-73`
- **Root Cause Analysis:**
  Neither `updateUser` nor `deleteUser` verifies whether the target user is the sole remaining administrator in the system. An administrator (or attacker exploiting VULN-01) can delete or demote all admins, permanently locking out administrative access.
- **Remediation:**
  Prevent demoting or deleting the last remaining active administrator:
  ```java
  if ("client".equalsIgnoreCase(dto.getRole()) && "admin".equalsIgnoreCase(user.getRole())) {
      if (userRepository.countByRole("admin") <= 1) {
          throw new IllegalArgumentException("Жүйедегі жалғыз әкімшіні өзгертуге болмайды");
      }
  }
  ```

---

## 5. Actionable Remediation Plan & Implementation Blueprint

### Step 1: Security Configuration Hardening (`SecurityConfig.java`)
1. Add `/api/v1/admin/**` to `.hasRole("ADMIN")`.
2. Add `/api/v1/auth/login`, `/api/v1/auth/register`, and `/api/v1/auth/logout` to `.permitAll()`.
3. Add `@EnableMethodSecurity` to `SecurityConfig`.
4. Ensure `/api/v1/saved-books/**` and `/api/v1/progress/**` are explicitly listed alongside their unversioned counterparts.

### Step 2: Controller & Service Ownership Checks
1. **`UserController.java`:** Annotate class with `@PreAuthorize("hasRole('ADMIN')")`.
2. **`BookService.java`:** In `getBookById`, reject requests for archived books unless caller has `ROLE_ADMIN`.
3. **`ReadingProgressService.java`:** Validate that `currentAudioChapterId` belongs to `bookId`, and validate bounds for `currentPage`.
4. **`ReadingProgressController.java`:** Add `@Valid` to `@RequestBody ReadingProgressRequestDto`.

### Step 3: Database Integrity Migration
Create Flyway migration `V4__enforce_reading_progress_integrity.sql`:
```sql
-- Remove any duplicate reading progress records keeping the latest updated
DELETE FROM reading_progress a USING reading_progress b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.book_id = b.book_id;

-- Add unique constraint to prevent race condition duplicates
ALTER TABLE reading_progress
ADD CONSTRAINT uq_reading_progress_user_book UNIQUE (user_id, book_id);

-- Add foreign key constraint to cascade delete when a user is removed
ALTER TABLE reading_progress
ADD CONSTRAINT fk_reading_progress_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

## 6. Proposed Automated Verification & Regression Suite

To ensure complete verification under `./gradlew test` without regressions, the following test cases must be implemented in a dedicated test class: `IdorAndDataIsolationIntegrationTest.java`:

1. **Test RBAC on `/api/v1/admin/users`:**
   - Client token calling `GET /api/v1/admin/users` must receive **HTTP 403 Forbidden**.
   - Client token calling `PATCH /api/v1/admin/users/{id}` must receive **HTTP 403 Forbidden**.
   - Client token calling `DELETE /api/v1/admin/users/{id}` must receive **HTTP 403 Forbidden**.
   - Admin token calling the above must receive **HTTP 200/204**.
2. **Test IDOR Isolation on Saved Books:**
   - User A saves Book 1 (`POST /api/saved-books/book-1`).
   - User B requests saved books (`GET /api/saved-books`) -> returns 0 books.
   - User B attempts to delete Book 1 (`DELETE /api/saved-books/book-1`) -> does NOT affect User A's saved books.
3. **Test IDOR Isolation on Reading Progress:**
   - User A updates reading progress for Book 1 to page 45 (`PUT /api/progress/book-1`).
   - User B requests reading progress for Book 1 (`GET /api/progress/book-1`) -> returns default progress (page 1, time 0), NOT User A's progress.
4. **Test Archived Book Data Boundary:**
   - Admin archives a book (`PATCH /api/books/{id}/archive` with `isArchived = true`).
   - Anonymous / Client caller requests `GET /api/books/{id}` -> returns **HTTP 404 Not Found**.
   - Admin caller requests `GET /api/books/{id}` -> returns **HTTP 200 OK**.
5. **Test Versioned Auth Routes:**
   - Unauthenticated caller requests `POST /api/v1/auth/login` -> returns **HTTP 200 OK** (not 401).
   - Unauthenticated caller requests `POST /api/v1/auth/register` -> returns **HTTP 201 Created** (not 401).
