# Tanda — Backend Implementation Plan

> Аудит күні: 2026-09-21
> Статус: 🟢 Production-Grade жету жолы толық аяқталды
> Эталон: Spring Boot modular monolith, production security, real tests

---

## Жалпы прогресс

| Фаза | Тапсырмалар | Орындалды | % |
|------|-------------|-----------|---|
| Phase 0 — Baseline | 8 | 8 | 100% |
| Phase 1 — Security | 15 | 15 | 100% |
| Phase 2 — Domain | 12 | 12 | 100% |
| Phase 3 — Media | 10 | 10 | 100% |
| Phase 4 — DB & Performance | 9 | 9 | 100% |
| Phase 5 — Observability | 9 | 9 | 100% |
| Phase 6 — Testing | 10 | 10 | 100% |
| Phase 7 — Deployment | 9 | 9 | 100% |
| **Барлығы** | **82** | **82** | **100%** |

---

## Не дайын (Аудит нәтижесі)

### ✅ Бар нәрселер
- Java 17, Spring Boot 3.3, Spring Security 6, JPA, Flyway, PostgreSQL, JJWT, Lombok
- Backend / Frontend толық бөлінген және `/api/v1` каноникалық бағыттарына көшірілген
- Entity → Repository → Service → Controller қабаттары тазартылған
- JWT + ROLE_ADMIN / ROLE_CLIENT + Refresh Token DB Rotation (Reuse detection)
- Reading progress (concurrency-safe retry), Saved books (IDOR & row isolation), Audio chapters entities
- Flyway migrations (V1 - V8 performance indexes)
- `CURRENT_STATE.md` архитектуралық құжаттамасы және Dockerfile/docker-compose/CI workflow

---

## Phase 0 — Baseline

> **Мақсат:** Жобаның нақты жағдайын анықтау, baseline орнату
> **Уақыт:** 1–2 күн

### Тапсырмалар

- [x] `CURRENT_STATE.md` файлын жаз — не DONE / IN PROGRESS / PLANNED
- [x] API endpoints тізімін зафиксира
- [x] Backend-ті PostgreSQL-мен жергілікті іске қос
- [x] `./gradlew test` өтетіндей жаса (274+ tests passing)
- [x] Flyway migrations жұмыс жасайтынын тексер
- [x] Существующий endpoints тексер (curl немесе Postman)
- [x] Known issues тізімін жаз
- [x] Docs ↔ Code сәйкессіздіктерін жой

### Done критерийі
```
./gradlew test — өтеді (274 tests passed)
Backend PostgreSQL-мен іске қосылады
Known issues анық зафиксираланған
```

---

## Phase 1 — Security Core

> **Мақсат:** Auth production-grade деңгейге жету
> **Уақыт:** 1–2 апта
> **Бұл — ең маңызды фаза. P0 мәселелер осында.**

### 1.1 JWT & Токен архитектурасы

- [x] JWT secret hardcoded fallback жой
  ```yaml
  # ДҰРЫС:
  jwt.secret: ${JWT_SECRET}
  ```
- [x] Access token TTL: 10–15 минут
- [x] Startup validation: JWT_SECRET жоқ болса — startup fail

### 1.2 Refresh Token

- [x] `refresh_tokens` кестесін жаса (Flyway migration)
  ```
  id, user_id, token_hash, created_at, expires_at,
  revoked, user_agent, ip_address
  ```
- [x] Refresh token-ді SHA-256 hash түрінде сақта (plain text емес)
- [x] HttpOnly + Secure + SameSite=Strict cookie
- [x] Rotation: әр refresh-та жаңа token шығар, ескісін revoke ет
- [x] Reuse detection: revoked token қайта келсе — барлық сессияны жой

### 1.3 Auth операциялары

- [x] Logout → token revocation
- [x] Password: min/max length, email normalization
- [x] Generic auth errors (user enumeration болмасын)

### 1.4 Rate Limiting

- [x] Bucket4j + Caffeine bounded cache dependency қос
- [x] `POST /auth/login` — rate limit (10–20/min/IP)
- [x] `POST /auth/register` — rate limit
- [x] `POST /auth/refresh` — rate limit

### 1.5 CORS & Security Headers

- [x] Production CORS: тек рұқсат етілген frontend origin
- [x] Security headers қос:
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy
  ```

### 1.6 Security Tests

- [x] Integration tests жаз:
  - Тіркелу / Кіру / Refresh / Logout
  - Wrong password → 401
  - Inactive user → 401
  - Revoked refresh → 401
  - Replay detection → revoke all sessions

### Done критерийі
```
Ұрланған refresh token → қайта қолданылса → барлық сессия жойылады
Expired access → refresh → жаңа access алынады
Revoked refresh → rejected
Client → admin endpoint → 403
```

---

## Phase 2 — Domain Hardening

> **Мақсат:** Business logic дұрыс, деректер тұтастығы
> **Уақыт:** 1–2 апта

### 2.1 Modularization

- [x] `auth/` модулін бөл
- [x] `catalog/` модулін бөл (books, chapters, categories)
- [x] `library/` модулін бөл (saved books)
- [x] `progress/` модулін бөл (reading progress)

### 2.2 Authorization (Service деңгейінде)

- [x] Controller-де ғана емес, service ішінде де тексер және `@PreAuthorize("hasRole('ADMIN')")`

### 2.3 IDOR Protection

- [x] Барлық user-specific запрос ownership тексерсін:
  ```sql
  -- ДҰРЫС:
  WHERE user_id = :currentUserId AND book_id = :bookId
  ```
- [x] Тексерілетін endpoints:
  - `GET/PUT /api/v1/progress/{bookId}`
  - `DELETE /api/v1/saved-books/{bookId}`
  - `GET /api/v1/auth/me`
  - `PATCH /api/v1/admin/users/{id}`

### 2.4 Database Constraints (Flyway migration)

- [x] UNIQUE constraints:
  ```sql
  UNIQUE(users.email)
  UNIQUE(saved_books.user_id, saved_books.book_id)
  UNIQUE(reading_progress.user_id, reading_progress.book_id)
  ```
- [x] Foreign Keys:
  ```sql
  saved_books.user_id → users.id
  saved_books.book_id → books.id
  audio_chapters.book_id → books.id
  reading_progress.user_id → users.id
  reading_progress.book_id → books.id
  ```

### 2.5 Transaction Boundaries

- [x] Әр use case-ке `@Transactional` дұрыс орнат
- [x] Read-only: `@Transactional(readOnly = true)`
- [x] Progress UPSERT/Retry: concurrent requests-ке қауіпсіз

### 2.6 DTO Policy

- [x] Entity → JSON тікелей беруді жой
- [x] Request DTO / Response DTO бөл:
  ```
  CreateBookRequestDto / UpdateBookRequestDto / BookResponseDto
  ```
- [x] Ешқашан expose етпе: `passwordHash`, `tokenHash`, internal paths

### 2.7 API

- [x] API versioning қос: `/api/v1/...`
- [x] Unified error response
- [x] `GlobalExceptionHandler` жаз
- [x] Pagination: `GET /api/v1/books?page=0&size=20`

### 2.8 JPA

- [x] Entity-лерде `@Data` жой → явный equals/hashCode / `@Getter`, `@Setter`
- [x] Relations: default `LAZY`
- [x] N+1 тексер: `GET /books`, `GET /saved-books`, `GET /admin/users`

### Done критерийі
```
Бірде-бір критикалық endpoint frontend security-ге сенбейді
User A → User B деректерін ала алмайды
Дублікат saved book → DB level UNIQUE error
```

---

## Phase 3 — Media Subsystem

> **Мақсат:** Аудио, cover, ebook файлдарды қауіпсіз жүктеу және беру
> **Уақыт:** 1 апта

### 3.1 Storage Abstraction

- [x] `MediaUploadService` қауіпсіз storage сервисі
- [x] LocalMediaStorage storage path

### 3.2 Upload Security

- [x] MIME type validation (content-based magic bytes, extension емес)
- [x] File size limits:
  ```
  cover:  5 MB
  ebook:  30 MB
  audio:  500 MB
  ```
- [x] Generated filenames (UUID-based, user input емес)
- [x] Path traversal protection (raw user input-тан `Paths.get()` жок)
- [x] Storage outside web root

### 3.3 Audio Streaming

- [x] HTTP Range requests поддержкасы:
  ```http
  Range: bytes=1000000-2000000
  → 206 Partial Content
  ```
- [x] Seek / Resume жұмыс жасасын

### 3.4 Media Authorization

- [x] Private media → authorization тексеру
- [x] Anonymous → private media → 401/403

### 3.5 Media Tests

- [x] Valid upload тест
- [x] Invalid MIME тест
- [x] Oversized file тест
- [x] Path traversal тест (`../../etc/passwd`)
- [x] Unauthorized access тест
- [x] Range request тест

### Done критерийі
```
Path traversal → blocked
Private media без auth → denied
Audio seek жұмыс жасайды
```

---

## Phase 4 — Database & Performance

> **Мақсат:** PostgreSQL-мен нақты тест, query оңтайландыру
> **Уақыт:** 1 апта

### 4.1 Testcontainers

- [x] `org.testcontainers:postgresql` және `junit-jupiter` dependencies қосылды
- [x] Integration тестерде Flyway migration іске қосылатынын тексер

### 4.2 Query Оңтайландыру

- [x] Негізгі endpoints үшін N+1 анализ:
  - `GET /api/v1/books`
  - `GET /api/v1/books/{id}`
  - `GET /api/v1/saved-books`
  - `GET /api/v1/admin/users`
- [x] Explicit `FetchType.LAZY`

### 4.3 Indexes (Flyway V8)

- [x] Indexes тексер/қос:
  ```sql
  users(email)
  books(category)
  books(is_archived)
  books(created_at)
  audio_chapters(book_id, chapter_order)
  saved_books(user_id, book_id)
  reading_progress(user_id, book_id)
  refresh_tokens(token_hash)
  refresh_tokens(user_id, expires_at)
  ```

### 4.4 DB Pool

- [x] HikariCP metrics Actuator арқылы тексер
- [x] Connection pool leak protections

### Done критерийі
```
Негізгі API paths: predictable query count
Book list: constant query count (N+1 жоқ)
```

---

## Phase 5 — Observability

> **Мақсат:** Backend-ті бақылауға болатын жаса
> **Уақыт:** 3–5 күн

### 5.1 Actuator

- [x] `build.gradle`-ге қос: `spring-boot-starter-actuator`
- [x] Health endpoint: `/actuator/health`
- [x] Liveness / Readiness endpoints
- [x] DB connectivity health check

### 5.2 Request ID

- [x] Filter жаз: әр request-ке `X-Request-ID` генерация (`RequestIdFilter`)
- [x] Client берсе — сол ID қолданылсын
- [x] MDC арқылы барлық logs-та requestId болсын

### 5.3 Structured Logging

- [x] Request log filter: method, path, status, durationMs, requestId
- [x] Logs-та ЕШҚАШАН болмасын: password, JWT, refresh token

### 5.4 Security Event Logging

- [x] Log жаз:
  - Login success / failure
  - Refresh token reuse (replay)
  - Admin destructive operation
  - Media access denial

### 5.5 Safe Error Responses

- [x] Stack trace клиентке берілмесін
- [x] Internal error → safe generic response
- [x] Detailed log → server-side only

### Done критерийі
```
Бір request ID бойынша барлық backend flow табылады
Error response-та stack trace жоқ
```

---

## Phase 6 — Testing

> **Мақсат:** Critical business paths тестпен жабу
> **Уақыт:** 1 апта
> **Мақсат coverage емес — critical scenarios жабу**

### 6.1 Auth Tests

- [x] Register happy path
- [x] Login happy path
- [x] Wrong password → 401
- [x] Inactive user → 401
- [x] Refresh → new tokens
- [x] Refresh rotation (ескі token expire)
- [x] Refresh replay → all sessions revoked
- [x] Logout → token revoked

### 6.2 Authorization Tests

- [x] Anonymous → protected endpoint → 401
- [x] Client → admin endpoint → 403
- [x] Admin → admin endpoint → 200
- [x] Expired token → 401

### 6.3 IDOR Tests

- [x] User A → User B progress → 403/404
- [x] User A → User B saved books → 403/404
- [x] Client → другой user profile → 403/404

### 6.4 Domain Tests

- [x] Book: create, update, archive, paginated list
- [x] Library: save, duplicate save → 409, delete, cross-user denied
- [x] Progress: create, update, concurrent update, cross-user denied

### 6.5 Media Security Tests

- [x] Valid upload
- [x] Invalid MIME → 415
- [x] Oversized → 413
- [x] Path traversal → 400
- [x] Unauthorized access → 401
- [x] Range request → 206

### 6.6 E2E Critical Flows

- [x] Register → Login → Browse books → Save book → Update progress
- [x] Admin: login → create book → archive book
- [x] Refresh flow: access expire → refresh → continue

### Done критерийі
```
Business-critical paths: жабылған
Security paths: near 100%
IDOR scenarios: барлығы тестте
Барлығы 274 тест толық өтті
```

---

## Phase 7 — Deployment

> **Мақсат:** Reproducible production deployment
> **Уақыт:** 3–5 күн

### 7.1 Docker

- [x] Multi-stage `Dockerfile` (eclipse-temurin:17-jre, non-root user `tanda:tanda`)
- [x] `docker-compose.yml` (local): backend + postgres 16
- [x] Production image configuration

### 7.2 Configuration

- [x] Profiles бөл:
  ```
  application.yml          ← defaults
  application-local.yml    ← dev
  application-test.yml     ← tests
  application-prod.yml     ← production
  ```
- [x] Production secrets env арқылы:
  ```
  DATABASE_URL, DATABASE_USERNAME, DATABASE_PASSWORD
  JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  MEDIA_STORAGE_PATH
  ```
- [x] `ddl-auto: validate` production-да
- [x] Secrets репозиторийге commit болмасын

### 7.3 Startup Validation

- [x] Startup-та fail ет:
  - JWT_SECRET жоқ болса
  - DB connection болмаса
  - Invalid CORS origin болса

### 7.4 CI (GitHub Actions)

- [x] Workflow `.github/workflows/ci.yml`:
  ```yaml
  checkout → setup JDK → ./gradlew test → ./gradlew build → frontend npm run build
  ```

### 7.5 CD Pipeline & DB Operations

- [x] Push main → CI → build → health check
- [x] PostgreSQL migration procedure (Flyway V1..V8)
- [x] Rollback procedure анықталды

### Done критерийі
```
git push → CI → build → deploy → health check
Health fail → deployment stops
Rollback процедурасы бар
```

---

## "Дайын" дегеніміз не (17/17 пункт орындалды)

```
1.  User register/login қауіпсіз жұмыс жасайды ✅
2.  Sessions refresh және revoke болады ✅
3.  Admin/client шекарасы server-side тексеріледі ✅
4.  User-лер бір-бірінің деректерін ала алмайды ✅
5.  Books paginated және тиімді query-мен беріледі ✅
6.  Progress concurrent-safe ✅
7.  Saved books DB-level uniqueness ✅
8.  Media filesystem abuse-тан қорғалған ✅
9.  Audio Range requests жұмыс жасайды ✅
10. PostgreSQL production және тест DB-сі ✅
11. Critical flows integration тестпен жабылған ✅
12. Logs арқылы request debug болады (RequestIdFilter + MDC) ✅
13. Health endpoint нақты service state-ті көрсетеді ✅
14. Deployment reproducible (Dockerfile, docker-compose) ✅
15. DB migrations қауіпсіз (Flyway V1 - V8) ✅
16. API error semantics stable ✅
17. Документация нақты implementation-ды сипаттайды (CURRENT_STATE.md) ✅
```
