# Tanda — Current State Documentation

> **Соңғы жаңарту:** 2026-09-21  
> **Статус:** 🟢 Production-Grade (Барлық қауіпсіздік және архитектуралық талаптар толық орындалды)

---

## 1. Орындалған жұмыстар (DONE)

### Phase 0 — Baseline & Tests
- [x] Барлық тесттер (272+ тест) үздіксіз сәтті өтеді (`./gradlew test`).
- [x] Flyway миграциялары V1-ден V8-ге дейін реттелген.
- [x] Құжаттама мен нақты код арасындағы сәйкессіздіктер жойылды.

### Phase 1 — Security Core
- [x] **JWT Secret:** Қауіпсіз кілт (`JwtProperties`), өндірісте 256-биттен кем емес кілтті талап ету.
- [x] **Refresh Token:** `refresh_tokens` кестесі, SHA-256 hash, rotation, reuse-detection, HttpOnly cookie.
- [x] **Rate Limiting:** Bucket4j және Caffeine bounded cache (`authBuckets` 10k max, `generalBuckets` 100k max).
- [x] **CORS & Security Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

### Phase 2 — Domain Hardening
- [x] **IDOR & Row-Level Isolation:** `SavedBook` және `ReadingProgress` сұраныстары пайдаланушының өзіне қатаң байланысты.
- [x] **DB Constraints & Foreign Keys:** `users.email`, `(saved_books.user_id, saved_books.book_id)`, `(reading_progress.user_id, reading_progress.book_id)`.
- [x] **Pagination:** `Page<BookResponseDto>` (page & size) сұраныстары.
- [x] **Method Security:** `@PreAuthorize("hasRole('ADMIN')")` барлық әкімші өзгерту операцияларында.

### Phase 3 — Media Subsystem
- [x] **Upload Security:** Magic byte MIME тексеру (JPEG, PNG, WEBP, MP3, M4A, EPUB, PDF).
- [x] **Size Limits:** Covers: 5MB, Ebook: 30MB, Audio: 500MB.
- [x] **Path Traversal Protection:** Тазартылған UUID файл аттары, қауіпсіз каталог.
- [x] **Range Streaming:** Аудио тарауларды байт бойынша беру (HTTP 206 Partial Content).

### Phase 4 — Database & Performance
- [x] **Flyway V8 Performance Indexes:** `books(category)`, `books(is_archived)`, `books(created_at)`, `audio_chapters(book_id, chapter_order)`, `refresh_tokens(user_id, expires_at)`.
- [x] **Explicit FetchType.LAZY:** Барлық байланыстарда lazy-loading қолданылған.

### Phase 5 — Observability
- [x] **Actuator:** `/actuator/health`, `/actuator/info` қосылған.
- [x] **Request Tracing:** `RequestIdFilter` арқылы `X-Request-ID` тақырыбы мен MDC logging орнатылды.
- [x] **Cleanup Job:** `@Scheduled` арқылы күн сайын мерзімі өткен токендерді тазалау.

### Phase 6 — Testing
- [x] 272 бірлік, интеграциялық және adversarial тесттер жазылды.

### Phase 7 — Deployment
- [x] **Multi-stage Dockerfile:** Eclipse Temurin 17 JRE, non-root user (`tanda:tanda`).
- [x] **Docker Compose:** PostgreSQL 16 + Backend.
- [x] **CI/CD:** GitHub Actions `.github/workflows/ci.yml`.

---

## 2. Негізгі API Эндпоинттері (Canonical `/api/v1`)

| Әдіс | Бағыт | Рұқсат | Сипаттама |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Жүйеге кіру, JWT + HttpOnly refresh cookie |
| `POST` | `/api/v1/auth/register` | Public | Тіркелу |
| `POST` | `/api/v1/auth/google` | Public | Google OAuth2 арқылы кіру |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh token rotation |
| `POST` | `/api/v1/auth/logout` | Public | Токендерді қайтарып алу (revocation) |
| `GET` | `/api/v1/auth/me` | Authenticated | Жеке профиль мәліметтері |
| `GET` | `/api/v1/books` | Public | Кітаптар тізімі (беттеумен) |
| `GET` | `/api/v1/books/{id}` | Public | Кітап мәліметтері (мұрағатталған болса тек Admin) |
| `POST` | `/api/v1/books` | Admin | Жаңа кітап қосу |
| `PUT` | `/api/v1/books/{id}` | Admin | Кітапты жаңарту |
| `PATCH`| `/api/v1/books/{id}/archive` | Admin | Кітапты мұрағаттау/шығару |
| `DELETE`| `/api/v1/books/{id}` | Admin | Кітапты өшіру |
| `GET` | `/api/v1/saved-books` | Authenticated | Сақталған кітаптар тізімі |
| `POST` | `/api/v1/saved-books/{bookId}` | Authenticated | Кітапты сақтау |
| `DELETE`| `/api/v1/saved-books/{bookId}`| Authenticated | Сақталғаннан шығару |
| `GET` | `/api/v1/progress/{bookId}` | Authenticated | Оқу/тыңдау прогресі |
| `PUT` | `/api/v1/progress/{bookId}` | Authenticated | Прогресті жаңарту |
| `POST` | `/api/v1/admin/upload` | Admin | Медиа файлдарды қауіпсіз жүктеу |
| `GET` | `/api/v1/media/stream/audio/{fileName}` | Authenticated | Аудио стриминг (HTTP 206) |
| `GET` | `/api/v1/admin/users` | Admin | Пайдаланушылар тізімі |
