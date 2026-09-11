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
