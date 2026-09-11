# Handoff Report — Backend Route & Security Specification Survey

**Agent:** `teamwork_preview_spec_miner_survey_1`  
**Role:** Backend Route & Security Specification Miner  
**Date:** 2026-09-10  
**Artifact:** `survey_backend.md`  

---

## 1. Observation

### 1.1 Controllers and Endpoints Discovered
Direct code inspection of the backend repository reveals exactly 5 controllers, 1 advice handler, and 19 logical REST operations (38 URL routes due to dual `/api/...` and `/api/v1/...` mappings):
- `AuthController.java` (`/api/auth`, `/api/v1/auth`) — 4 endpoints:
  - `POST /login` (`AuthController.java:29-32`)
  - `POST /register` (`AuthController.java:34-37`)
  - `POST /logout` (`AuthController.java:39-42`)
  - `GET /me` (`AuthController.java:44-50`)
- `BookController.java` (`/api/books`, `/api/v1/books`) — 6 endpoints:
  - `GET /` (`BookController.java:34-41`)
  - `GET /{id}` (`BookController.java:43-47`)
  - `POST /` (`BookController.java:49-53`)
  - `PUT /{id}` (`BookController.java:55-61`)
  - `PATCH /{id}/archive` (`BookController.java:63-73`)
  - `DELETE /{id}` (`BookController.java:75-80`)
- `UserController.java` (`/api/admin/users`, `/api/v1/admin/users`) — 4 endpoints:
  - `GET /` (`UserController.java:28-34`)
  - `GET /{id}` (`UserController.java:36-39`)
  - `PATCH /{id}` (`UserController.java:41-47`)
  - `DELETE /{id}` (`UserController.java:49-53`)
- `SavedBookController.java` (`/api/saved-books`, `/api/v1/saved-books`) — 3 endpoints:
  - `GET /` (`SavedBookController.java:26-32`)
  - `POST /{bookId}` (`SavedBookController.java:34-47`)
  - `DELETE /{bookId}` (`SavedBookController.java:49-59`)
- `ReadingProgressController.java` (`/api/progress`, `/api/v1/progress`) — 2 endpoints:
  - `GET /{bookId}` (`ReadingProgressController.java:25-34`)
  - `PUT /{bookId}` (`ReadingProgressController.java:36-46`)

### 1.2 Verbatim Inconsistencies & Flaws

#### A. Broken Access Control on `/api/v1/admin/**`
In `backend/src/main/java/com/tanda/config/SecurityConfig.java` lines 42-63:
```java
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout").permitAll()
                
                // Authenticated user endpoints
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/saved-books", "/api/saved-books/**").authenticated()
                .requestMatchers("/api/progress", "/api/progress/**").authenticated()

                // Admin-only endpoints
                .requestMatchers(HttpMethod.POST, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/books", "/api/books/**", "/api/v1/books", "/api/v1/books/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // All other requests require authentication
                .anyRequest().authenticated()
            )
```
In `backend/src/main/java/com/tanda/controller/UserController.java` lines 21-24:
```java
@RestController
@RequestMapping({"/api/admin/users", "/api/v1/admin/users"})
@RequiredArgsConstructor
public class UserController {
```

#### B. Broken Login on `/api/v1/auth/**`
`SecurityConfig.java` line 46 only allows `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`.
It does NOT permit `/api/v1/auth/login` or `/api/v1/auth/register`. These fall through to `.anyRequest().authenticated()`, rejecting unauthenticated users.

#### C. Conflicting CORS Settings
`SecurityConfig.java` lines 71-75:
```java
config.setAllowedOriginPatterns(List.of("*"));
config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
config.setAllowedHeaders(List.of("*"));
config.setAllowCredentials(true);
```
`WebConfig.java` lines 10-17:
```java
registry.addMapping("/**")
        .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000")
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true);
```

#### D. Schema vs DTO Validation Contradiction on `pages`
`backend/src/main/resources/db/migration/V3__alter_books_pages_nullable.sql` line 2:
```sql
ALTER TABLE books ALTER COLUMN pages DROP NOT NULL;
```
`backend/src/main/java/com/tanda/dto/CreateBookRequestDto.java` lines 32-34:
```java
    @NotNull(message = "Pages count is required")
    @Min(value = 1, message = "Pages must be at least 1")
    private Integer pages;
```

#### E. Information Disclosure in Global Exception Handler
`backend/src/main/java/com/tanda/exception/GlobalExceptionHandler.java` lines 48-51:
```java
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", ex.getMessage(), request.getRequestURI());
    }
```

#### F. Current Test Execution Status
Command: `sh gradlew test --rerun-tasks`
Output: `BUILD SUCCESSFUL in 6s`
Result: 4 test classes exist (`TandaApplicationTests`, `AuthControllerIntegrationTest`, `BookControllerIntegrationTest`, `SavedBookAndProgressIntegrationTest`).
Notice: `UserController` has **0 test coverage**.

---

## 2. Logic Chain

1. **Step 1 (Route Mapping vs Security Matching):** Observation 1.1 and Observation 1.2(A) show that `UserController` maps `/api/v1/admin/users`. However, `SecurityConfig` only matches `/api/admin/**` for `hasRole("ADMIN")`.
2. **Step 2 (Privilege Escalation):** Because `/api/v1/admin/users` does not match `/api/admin/**`, Spring Security evaluates `.anyRequest().authenticated()`. Any authenticated user with role `client` can access `UserController` endpoints via `/api/v1/admin/users`, including `PATCH /api/v1/admin/users/{id}` (to escalate privileges to admin) and `DELETE /api/v1/admin/users/{id}` (to delete admin users).
3. **Step 3 (Authentication Failure on Versioned Routes):** Observation 1.2(B) shows that `SecurityConfig` permits only `/api/auth/login` and `/api/auth/register`, but `AuthController` also accepts `/api/v1/auth/login` and `/api/v1/auth/register`. Because the versioned paths are omitted from permitAll, unauthenticated requests trigger 401 Unauthorized.
4. **Step 4 (CORS Origin Reflection):** Observation 1.2(C) shows `setAllowedOriginPatterns(List.of("*"))` combined with `setAllowCredentials(true)` in `SecurityConfig`. This reflects any origin while enabling credential transmission, violating OWASP secure configuration standards.
5. **Step 5 (Validation Gaps):** Observation 1.2(D) demonstrates that while the database schema permits null pages for audiobooks, `CreateBookRequestDto` and `UpdateBookRequestDto` reject requests with `pages == null`. Additionally, `ReadingProgressRequestDto` and `UpdateUserRequestDto` lack input validation annotations.
6. **Step 6 (Exception Leaks):** Observation 1.2(E) demonstrates that internal database or system exceptions expose their raw messages (`ex.getMessage()`) to clients in 500 error bodies.

---

## 3. Caveats

- The current frontend client uses `/api/...` routes for most operations (e.g. `api.post('/api/auth/login')`, `api.get('/api/books')`, `api.get('/api/admin/users')`), which is why the system works in the frontend UI while the latent `/api/v1/...` security vulnerabilities exist at the HTTP API layer.
- This survey was performed in read-only mode. No modifications were made to Java source files, migrations, or tests during this task.
- Automated tests pass because existing test suites only exercise `/api/auth` and `/api/v1/books`, completely omitting `/api/v1/admin/users` and `/api/v1/auth/login`.

---

## 4. Conclusion

1. **Endpoint Catalog Completeness:** 100% of all 5 controllers, 19 REST operations, and 38 URL routes are cataloged and documented in `survey_backend.md`.
2. **Critical Vulnerabilities Identified:**
   - Critical RBAC bypass on `/api/v1/admin/users` allowing client-to-admin privilege escalation.
   - Authentication barrier on `/api/v1/auth/login` and `/api/v1/auth/register`.
   - Wildcard CORS reflection with credentials enabled.
   - Unhandled error disclosure and missing validation annotations.
3. **Actionable Deliverables:** Complete survey results, feature tables, edge case tables, and remediation steps are written to `/Users/usman/Desktop/tanda site/.agents/teamwork_preview_spec_miner_survey_1/survey_backend.md`.

---

## 5. Verification Method

1. **Inspect Survey Document:**
   - Path: `/Users/usman/Desktop/tanda site/.agents/teamwork_preview_spec_miner_survey_1/survey_backend.md`
   - Check sections: Controller Catalog (Section 2), Spring Security Analysis (Section 3), Insecurity Audit (Section 4), Discovered Features Table & Edge Cases Table (Section 5), Remediation Plan (Section 6).
2. **Verify Existing Tests:**
   - Run in `backend/`: `sh gradlew test`
3. **Verify Vulnerability Repro Concept:**
   - Calling `POST /api/v1/auth/login` without credentials results in `401 Unauthorized` instead of `400 Bad Request`.
   - A mock user with `ROLE_CLIENT` accessing `/api/v1/admin/users` succeeds with `200 OK` instead of being denied with `403 Forbidden`.
