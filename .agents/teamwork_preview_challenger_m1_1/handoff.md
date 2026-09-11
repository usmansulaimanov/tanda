# Milestone M1 Adversarial Challenge & Empirical Verification Report

**Agent**: Challenger 1 (Milestone M1)  
**Roles**: Critic, Specialist (`security-auditor`)  
**Target Repository**: Tanda (Spring Boot 3.3.0 + React 18 / Vite 6)  
**Date**: 2026-09-10  
**Explicit Verdict**: **APPROVE**  

---

## 1. Observation

A dedicated empirical verification test suite was developed and executed directly against the Spring Boot backend: `backend/src/test/java/com/tanda/Challenger1M1SecurityVerificationTest.java`. Across 31 automated test cases spanning 4 nested test suites, the following empirical observations were recorded:

### 1.1 RBAC Enforcement on `/api/v1/admin/users` (Task 1)
- In `backend/src/main/java/com/tanda/config/SecurityConfig.java` line 61:
  ```java
  .requestMatchers("/api/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
  ```
- Executing HTTP requests with an authenticated principal holding authority `ROLE_CLIENT` (derived from `user.role = "client"` via `UserPrincipal.create()`):
  - `GET /api/v1/admin/users` -> HTTP 403 Forbidden.
  - `GET /api/admin/users` (unversioned) -> HTTP 403 Forbidden.
  - `GET /api/v1/admin/users/{id}` -> HTTP 403 Forbidden.
  - `PATCH /api/v1/admin/users/{id}` -> HTTP 403 Forbidden.
  - `DELETE /api/v1/admin/users/{id}` -> HTTP 403 Forbidden.
  - `POST /api/v1/books` -> HTTP 403 Forbidden.
- In contrast, unauthenticated requests to `/api/v1/admin/users` return HTTP 401 Unauthorized via `HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)` configured in `SecurityConfig.java` line 42.
- In contrast, authenticated requests with `ROLE_ADMIN` (`adminToken`) to both `/api/v1/admin/users` and `/api/admin/users` return HTTP 200 OK.

### 1.2 Public Route Parity for Unauthenticated `/api/v1/auth/login` and `/register` (Task 2)
- In `backend/src/main/java/com/tanda/config/SecurityConfig.java` lines 48-49:
  ```java
  .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout",
                   "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/logout").permitAll()
  ```
- Executing unauthenticated requests to `/api/v1/auth/login` and `/api/v1/auth/register`:
  - `POST /api/v1/auth/login` with empty body `{}` -> HTTP 400 Bad Request (`MethodArgumentNotValidException` handled by `GlobalExceptionHandler`), proving the request successfully reached the controller layer without 401 rejection from the filter chain.
  - `POST /api/auth/login` (unversioned) with empty body `{}` -> HTTP 400 Bad Request.
  - `POST /api/v1/auth/login` with invalid email format `{"email": "not-an-email", "password": "pass"}` -> HTTP 400 Bad Request.
  - `POST /api/v1/auth/login` with non-existent user credentials -> HTTP 401 Unauthorized originating from `AuthService.login()` line 33 (`BadCredentialsException`), NOT from the servlet filter chain.
  - `POST /api/v1/auth/register` with empty body `{}` -> HTTP 400 Bad Request.
  - `POST /api/v1/auth/register` with valid registration payload -> HTTP 201 Created with JWT token and client user details.
  - `POST /api/v1/auth/logout` unauthenticated -> HTTP 200 OK.
- In contrast, unauthenticated requests to protected endpoints such as `GET /api/v1/auth/me` return HTTP 401 Unauthorized immediately.

### 1.3 Method Security on `UserController` (Task 3)
- In `backend/src/main/java/com/tanda/config/SecurityConfig.java` line 29: `@EnableMethodSecurity`.
- In `backend/src/main/java/com/tanda/controller/UserController.java` line 23: `@PreAuthorize("hasRole('ADMIN')")`.
- Spring CGLIB proxy (`com.tanda.controller.UserController$$SpringCGLIB$$0`) wraps the `UserController` bean at runtime.
- Direct invocation of `userController.getAllUsers(null, null)`:
  - When invoked with `ROLE_CLIENT` in `SecurityContextHolder`: intercepted by `AuthorizationManagerBeforeMethodInterceptor` and rejected with `org.springframework.security.access.AccessDeniedException`.
  - When invoked with empty/unauthenticated `SecurityContext`: intercepted and rejected with `org.springframework.security.authentication.AuthenticationCredentialsNotFoundException: An Authentication object was not found in the SecurityContext`.
  - When invoked with `ROLE_ADMIN` in `SecurityContextHolder`: executes successfully and returns HTTP 200 with user list.
- Direct invocation of `userController.getUserById(id)`, `updateUser(id, dto)`, and `deleteUser(id)` with `ROLE_CLIENT`: each throws `AccessDeniedException`.
- Tests annotated with `@WithMockUser(roles = "CLIENT")` on `userController.getUserById()` fail with `AccessDeniedException`.
- Tests annotated with `@WithMockUser(roles = "ADMIN")` on `userController.getUserById()` succeed with HTTP 200 OK.

### 1.4 Adversarial Edge Cases (Task 4)
- Tampered JWT token (`Bearer <token>tampered`) on `/api/v1/admin/users`: HTTP 401 Unauthorized.
- Unsupported authorization scheme (`Basic ...`) on `/api/v1/admin/users`: HTTP 401 Unauthorized.
- Arbitrary non-admin role (`ROLE_MODERATOR`): rejected with `AccessDeniedException` / HTTP 403 Forbidden.
- CORS preflight `OPTIONS /api/v1/admin/users`:
  - `Origin: http://localhost:5173` -> returns HTTP 200 with `Access-Control-Allow-Origin: http://localhost:5173` and `Access-Control-Allow-Credentials: true`.
  - Untrusted origin `Origin: http://evil.com` -> does NOT return `Access-Control-Allow-Origin`.

### 1.5 Build & Test Infrastructure Finding
- When executing `./gradlew test` under Gradle 9.7.1, the default Gradle HTML report generator encounters an `UncheckedIOException: java.io.EOFException` inside `GenericHtmlTestReportGenerator.generate()` / `SerializableTestResultStore.hasResults()` while attempting to read binary test event results on macOS.
- Disabling the HTML test report via Gradle test task configuration (`reports.html.required = false`) resolves the issue entirely, allowing JUnit 5 test suites (`Challenger1M1SecurityVerificationTest`, `Challenger2M1EmpiricalVerificationTest`, `AuthControllerIntegrationTest`, `BookControllerIntegrationTest`, `SavedBookAndProgressIntegrationTest`) to complete with **BUILD SUCCESSFUL**.
- Frontend production build (`npm run build`) completed cleanly with 0 TypeScript/Vite errors in 1.38s.

---

## 2. Logic Chain

1. **RBAC URL Matching (Observation 1.1)**:
   Adding both `/api/admin/**` and `/api/v1/admin/**` to `.hasRole("ADMIN")` in `SecurityConfig.java` line 61 closes the bypass vulnerability where versioned admin paths previously fell through to `.anyRequest().authenticated()`. Because `UserPrincipal` assigns `ROLE_CLIENT` to client users, `hasRole("ADMIN")` evaluates to false for non-admins, resulting in HTTP 403 Forbidden.

2. **Public Auth Route Parity (Observation 1.2)**:
   Adding `/api/v1/auth/login`, `/api/v1/auth/register`, and `/api/v1/auth/logout` to `.permitAll()` in `SecurityConfig.java` lines 48-49 aligns both unversioned and versioned routes. Because requests reach the controller layer without authentication, invalid payloads fail Jakarta Bean Validation (`@Valid`) and return HTTP 400 Bad Request, confirming that the filter chain permits anonymous access as intended.

3. **Defense-in-Depth Method Security (Observation 1.3)**:
   Adding `@EnableMethodSecurity` to `SecurityConfig.java` activates Spring Security's AOP method interception infrastructure (`AuthorizationManagerBeforeMethodInterceptor`). Placing `@PreAuthorize("hasRole('ADMIN')")` at the class level on `UserController` ensures that even if URL pattern matching were misconfigured or bypassed, direct method invocations are blocked by Spring Security with `AccessDeniedException` for non-admin principals.

4. **Verdict Determination (Observations 1.1 - 1.5)**:
   All security requirements defined for Milestone M1 (VULN-01, VULN-02, method security on `UserController`, and CORS origin hardening) were independently tested through real HTTP exchanges, mock principal invocations, and direct Java bean proxy method calls. Zero security boundary bypasses or regressions were detected. Consequently, an explicit **APPROVE** verdict is warranted.

---

## 3. Caveats

1. **Gradle 9.7.1 HTML Test Report Generation**:
   The default `:test` task in Gradle 9.7.1 attempts to run `GenericHtmlTestReportGenerator`, which throws `EOFException` on macOS unless configured with `reports.html.required = false`. This is a build tool artifact issue, not an application code defect. A permanent configuration entry in `backend/build.gradle` (`tasks.named('test') { reports.html.required = false }`) should be adopted in Milestone M2.
2. **Stateless JWT Revocation**:
   Logout (`/api/v1/auth/logout`) returns HTTP 200, but because tokens are stateless HMAC-SHA256 JWTs without an active Redis or database token blocklist, tokens remain cryptographically valid until expiration (`1 day`). This is standard for stateless JWTs, but if immediate invalidation is required, token blacklisting can be considered in subsequent milestones.
3. No other caveats.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone M1's security remediation is empirically verified and robust:
- Non-admin clients (`ROLE_CLIENT`) are strictly blocked from `/api/v1/admin/users` and related administrative routes with HTTP 403 Forbidden.
- Unauthenticated visitors can access `/api/v1/auth/login` and `/api/v1/auth/register`, receiving HTTP 400 for bad payloads rather than HTTP 401 from the filter chain.
- `UserController` method security is active and strictly enforced by Spring CGLIB proxies.
- All 31 empirical verification tests in `Challenger1M1SecurityVerificationTest` pass 100% green.
- Frontend builds cleanly (`npm run build`).

---

## 5. Verification Method

To independently reproduce and verify all findings:

1. **Run Challenger 1 Security Verification Test Suite**:
   ```bash
   cd "/Users/usman/Desktop/tanda site/backend"
   sh ./gradlew test -I "/Users/usman/Desktop/tanda site/.agents/teamwork_preview_challenger_m1_1/init.gradle" --tests com.tanda.Challenger1M1SecurityVerificationTest --rerun-tasks
   ```
   *Expected Output*: `BUILD SUCCESSFUL in 4s`, 31 tests completed, 0 failed, 0 skipped.

2. **Run Full Backend Test Suite**:
   ```bash
   cd "/Users/usman/Desktop/tanda site/backend"
   sh ./gradlew test -I "/Users/usman/Desktop/tanda site/.agents/teamwork_preview_challenger_m1_1/init.gradle" --rerun-tasks
   ```
   *Expected Output*: `BUILD SUCCESSFUL in 5s`, all tests pass.

3. **Verify Frontend Build**:
   ```bash
   cd "/Users/usman/Desktop/tanda site/frontend"
   npm run build
   ```
   *Expected Output*: `tsc && vite build` succeeds with 0 errors.

4. **Inspect Test Code**:
   Inspect `backend/src/test/java/com/tanda/Challenger1M1SecurityVerificationTest.java` to review test scenarios, assertions, and mock principals.
