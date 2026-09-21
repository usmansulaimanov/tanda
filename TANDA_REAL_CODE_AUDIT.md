# Tanda Backend — Полный аудит по реальному коду

Дата: 2026-09-21  
Репозиторий: usmansulaimanov/tanda  
Аудитор: Claude Sonnet 4.6 (по запросу MrSgemaSeny)  
База: реальный исходный код из tanda-main.zip  
Эталон уровня: MrSgemaSeny/JF-1C

---

## Предисловие

Предыдущий аудит (`TANDA_BACKEND_FULL_AUDIT.md`) был написан по документации — `build.gradle`, `application.yml` и README. Он содержит правильный диагноз, но не знает, что реально в коде. Этот аудит написан по каждому Java-файлу в репозитории.

Хорошая новость: реальный код значительно лучше, чем предполагал предыдущий аудит. Refresh token rotation реализован. IDOR изоляция есть. Rate limiting есть. GlobalExceptionHandler есть. MDC request ID есть.

Плохая новость: остаются конкретные, верифицированные проблемы — не теоретические. Вот они по коду с точными строками.

---

## Что реально сделано хорошо

Это не похвала ради похвалы. Это важно понимать, чтобы не переписывать то, что работает.

**Auth и sessions.**  
`RefreshTokenService.rotateRefreshToken()` — нормальная реализация. Reuse detection есть: если revoked токен повторно используется — отзываются все сессии пользователя (`revokeAllByUserId`). Токен хранится как SHA-256 hash. `SecureRandom` для генерации. Expiry проверяется. User active status проверяется. Это production-quality auth flow.

**HttpOnly cookie.**  
`AuthController.createRefreshTokenCookie()` выставляет `httpOnly(true)`, `sameSite("Lax")`. Refresh token правильно не доступен из JS. Cookie устанавливается на login, register, google auth, refresh — везде.

**MDC + Request ID.**  
`JwtAuthFilter` генерирует `requestId` на каждый запрос, кладёт в MDC, возвращает в заголовке `X-Request-ID`. Это позволяет трассировать запрос в логах. Грамотно.

**GlobalExceptionHandler.**  
Покрывает все нужные случаи: `ResourceNotFoundException`, `MethodArgumentNotValidException`, `BadRequestException`, `UnauthorizedException`, `BadCredentialsException`, `AccessDeniedException`, generic `Exception`. Generic exception не пропускает stack trace в ответ. Структура ответа унифицирована.

**Rate limiting.**  
`RateLimitingFilter` с Bucket4j: 20 req/min для auth endpoints, 300 req/min для остальных — per IP. IP определяется через CF-Connecting-IP / X-Forwarded-For. Порядок фильтра: `HIGHEST_PRECEDENCE + 5` — значит он срабатывает до security chain.

**Database integrity.**  
FK между таблицами есть. `UNIQUE (user_id, book_id)` в `saved_books` — есть на уровне БД (V4 migration). `reading_progress` тоже имеет unique constraint. `ddl-auto: validate` — не `create`, не `update`.

**Service-level auth в BookService.**  
`isAdmin()` метод используется для фильтрации архивных книг и в логике. `UserService.updateUser()` содержит last-admin guard.

**N+1 в UserService устранён.**  
`buildSavedCountMap()` делает один batch-запрос вместо N запросов на каждого пользователя.

**IDOR изоляция в контроллерах.**  
`ReadingProgressController` и `SavedBookController` берут userId из `@AuthenticationPrincipal UserPrincipal principal` — не из URL параметра или body. Пользователь не может передать чужой userId.

**Логирование изменений.**  
В `UserService` есть логирование при деактивации, смене роли, удалении. В `BookService` — при создании, обновлении, удалении. Это правильно.

---

## Верифицированные проблемы по коду

Далее — только то, что найдено в реальных файлах. Каждая проблема указывает конкретный файл и строку.

---

### [CRITICAL] 1. `secure=false` на refresh cookie — невалидно для production

**Файл:** `AuthController.java`, строка 126

```java
return ResponseCookie.from(REFRESH_COOKIE_NAME, token)
    .httpOnly(true)
    .secure(false)   // <-- ЗДЕСЬ
    .path("/")
    .maxAge(maxAge)
    .sameSite("Lax")
    .build();
```

`secure(false)` означает, что cookie будет передаваться по HTTP — не только по HTTPS. На production (любой деплой с TLS) это нужно исправить на `secure(true)`. `SameSite=Lax` без `Secure` не обеспечивает защиту от перехвата.

Правильно:
```java
.secure(!isLocalEnvironment) // или всегда true, если dev делает через ngrok/https
```

Ещё лучше — вынести в конфиг через `@Value("${app.cookie.secure:true}")`.

---

### [CRITICAL] 2. Hardcoded JWT secret и Google Client ID в `application.yml`

**Файл:** `src/main/resources/application.yml`, строки 12 и 15

```yaml
jwt:
  secret: ${JWT_SECRET:tanda-super-secret-jwt-key-minimum-256-bits-for-security-2026}

google:
  client-id: ${GOOGLE_CLIENT_ID:249161344734-j51fft6shbogf2clnrhofn3l0c1euihl.apps.googleusercontent.com}
```

Два отдельных нарушения:

1. Fallback JWT secret в исходном коде. Если `JWT_SECRET` не задан в env — используется захардкоженный. Любой, кто видит репозиторий, может подписать валидный JWT токен.

2. Google Client ID в публичном репозитории. Формально это менее критично (OAuth audience ID не секрет сам по себе), но это нарушение принципа "secrets out of source". Если Google решит отозвать этот Client ID из-за злоупотреблений — менять придётся везде.

Целевое состояние для JWT:
```yaml
jwt:
  secret: ${JWT_SECRET}   # без fallback — приложение падает при старте если не задан
```

---

### [CRITICAL] 3. Двойной источник admin пользователя — конфликт между Flyway и DataInitializer

**Файл 1:** `V2__add_users_and_saved_books.sql`, строки 26-34

```sql
-- Initial admin user (password: admin123)
INSERT INTO users (id, id_number, name, email, password_hash, role, is_active)
VALUES (
    'admin-1',
    '000 001',
    'Администратор',
    'admin@tanda.kz',
    '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',  -- admin123
    'admin',
    TRUE
);
```

**Файл 2:** `DataInitializer.java`, строки 157-170

```java
String encodedPassword = passwordEncoder.encode("admin123");
// ...
log.info("Default admin user created: admin@tanda.kz — change the password via admin panel before production.");
```

Пароль `admin123` захардкожен в двух местах: в SQL-миграции (BCrypt hash, но всем известный) и в Java-коде. Это означает, что при каждом деплое на чистую базу создаётся admin с известным паролем, и это поведение закреплено в истории Git навсегда.

Правильно: admin пользователь должен создаваться через env переменную `ADMIN_PASSWORD`, не через захардкоженный `admin123`. Или Flyway миграция должна быть единственным источником, а DataInitializer не должен пересоздавать admin.

Текущая ситуация: два механизма создания admin могут привести к рассинхронизации. Если Flyway уже создал admin с hash из SQL, DataInitializer не трогает его (проверяет `findByEmail`). Но если кто-то дропнет пользователей — DataInitializer воссоздаст admin123. Это не то поведение, которое хочется видеть в production.

---

### [CRITICAL] 4. Audio streaming открыт без аутентификации — любой может скачать любой аудиофайл

**Файл:** `SecurityConfig.java`, строка 58

```java
.requestMatchers("/uploads/**").permitAll()
```

**Файл:** `MediaController.java`, строки 36-45

```java
@GetMapping("/media/stream/audio/{fileName}")
// НЕТ @PreAuthorize
// НЕТ @AuthenticationPrincipal
public ResponseEntity<ResourceRegion> streamAudio(
        @PathVariable String fileName,
        @RequestHeader HttpHeaders headers) throws IOException {
    ResourceRegion region = mediaUploadService.getAudioResourceRegion(fileName, headers);
    ...
}
```

Оба endpoint (`/uploads/**` и `/api/v1/media/stream/audio/{fileName}`) открыты для неаутентифицированных пользователей. Это значит:

- Любой знает ли URL — скачивает аудиокнигу без входа
- `is_free` флаг на книге ни на что не влияет с точки зрения доступа к медиафайлам

Если в Tanda есть платный контент (`isFree=false`) — эта дыра делает монетизацию невозможной.

---

### [CRITICAL] 5. Path traversal в audio streaming

**Файл:** `MediaUploadService.java`, строки 103-108

```java
public ResourceRegion getAudioResourceRegion(String fileName, HttpHeaders headers) throws IOException {
    Path filePath = Paths.get(storageLocation).resolve("audio").resolve(fileName);
    if (!Files.exists(filePath)) {
        throw new BadRequestException("Аудио файл табылмады: " + fileName);
    }
    // дальше используется без нормализации
```

`fileName` приходит из `@PathVariable String fileName` контроллера. Нет вызова `.normalize()` и нет проверки, что результирующий путь находится внутри директории `./uploads/audio/`.

Атака:
```
GET /api/v1/media/stream/audio/../../application-prod.yml
GET /api/v1/media/stream/audio/../books/secret.pdf
```

`Paths.get(storageLocation).resolve("audio").resolve("../../application-prod.yml")` разрешится в `./application-prod.yml` — и файл будет отдан.

Фикс:
```java
Path audioDir = Paths.get(storageLocation).resolve("audio").toAbsolutePath().normalize();
Path filePath = audioDir.resolve(fileName).normalize();

if (!filePath.startsWith(audioDir)) {
    throw new BadRequestException("Недопустимый путь к файлу");
}
```

Аналогичная уязвимость потенциально есть в `/uploads/**` — Spring StaticResourceHandler, но там Spring сам нормализует пути. В кастомном коде — нет.

---

### [WARNING] 6. CORS в production настроен только для localhost

**Файл:** `SecurityConfig.java`, строка 85

```java
config.setAllowedOrigins(List.of(
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000"
));
```

Нет production домена. Это значит, что когда frontend задеплоен на GitHub Pages (домен `usmansulaimanov.github.io/tanda` или кастомный) — CORS будет блокировать все запросы. В CI/CD пайплайне (`deploy.yml`) фронтенд деплоится на GitHub Pages, но CORS это не учитывает.

Фикс: вынести allowed origins в конфиг через env переменную.

```yaml
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

---

### [WARNING] 7. `contentTypeOptions` отключён с неправильным комментарием

**Файл:** `SecurityConfig.java`, строки 44-45

```java
.contentTypeOptions(HeadersConfigurer.ContentTypeOptionsConfig::disable) 
// spring default already enables nosniff
```

Комментарий ошибочный. `disable()` отключает `X-Content-Type-Options: nosniff`. Spring Boot по умолчанию включает этот header — но вызов `disable()` его убирает. Нужно либо убрать эту строку целиком, либо заменить на `enable()`.

---

### [WARNING] 8. Книги без пагинации — `getBooks()` возвращает весь список

**Файл:** `BookService.java`, метод `getBooks()`  
**Файл:** `BookRepository.java`, метод `searchBooks()`

```java
List<Book> books = bookRepository.searchBooks(cat, q, effectiveIncludeArchived);
return books.stream().map(this::toResponseDto).collect(Collectors.toList());
```

`searchBooks` возвращает `List<Book>` без пагинации. При 1000+ книгах это полная загрузка из БД в память плюс сериализация в JSON одним ответом. Для MVP это не критично, но это техдолг с понятным порогом боли.

Аналогично `UserService.getAllUsers()` — `userRepository.findAll()` без пагинации.

---

### [WARNING] 9. В `BookController` нет `@PreAuthorize` — защита только через `SecurityConfig`

**Файл:** `BookController.java` — нет ни одной аннотации `@PreAuthorize` или `@Secured`

Защита admin-only операций (POST/PUT/PATCH/DELETE `/api/books/**`) настроена только в `SecurityConfig.java`. Это значит:

- Если кто-то добавит новый маппинг в контроллер и забудет добавить правило в SecurityConfig — endpoint будет открыт
- Нет defense-in-depth: security boundary только один (URL matcher), а не два (URL matcher + service/method level)

Для JF-1C уровня правильно иметь `@PreAuthorize("hasRole('ADMIN')")` на методах контроллера, которые требуют admin прав. Не вместо SecurityConfig, а дополнительно.

---

### [WARNING] 10. `ReadingProgressService.updateProgress()` — race condition при одновременных запросах

**Файл:** `ReadingProgressService.java`, метод `updateProgress()`

```java
ReadingProgress progress = progressRepository.findByUserIdAndBookId(userId, bookId).orElse(null);

if (progress == null) {
    // создаём новый...
    progress = ReadingProgress.builder()...build();
} else {
    // обновляем...
}
progress = progressRepository.save(progress);
```

При двух одновременных запросах на создание (оба прочитали `null`) оба попытаются вставить новую запись. Один из них получит `DataIntegrityViolationException` из-за UNIQUE constraint — и это вылетит как 500, а не корректно обработается.

В `ReadingProgress` нет `@Version` для optimistic locking. Уникальный constraint в БД есть (V4 migration), но обработки `DataIntegrityViolationException` в сервисе нет.

Фиксов два (нужен один из них):

**Вариант A — pessimistic lock:**
```java
@Query("SELECT rp FROM ReadingProgress rp WHERE rp.userId = :userId AND rp.book.id = :bookId")
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<ReadingProgress> findByUserIdAndBookIdForUpdate(...);
```

**Вариант B — upsert на уровне SQL:**
```sql
INSERT INTO reading_progress (...) VALUES (...)
ON CONFLICT (user_id, book_id) DO UPDATE SET ...
```

---

### [WARNING] 11. Тесты работают на H2, а production на PostgreSQL — это скрытое расхождение

**Файл:** `application-test.yml`

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:tanda_test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL
```

H2 в режиме `MODE=PostgreSQL` — это не PostgreSQL. Отличия:
- JPQL `LOWER()`, `LIKE`, `CONCAT` могут работать по-разному
- Constraint поведение при concurrent inserts разное
- Flyway миграции на H2 могут проходить с нюансами (особенно `TEXT` тип, `ON CONFLICT`, `TIMESTAMP WITH TIME ZONE`)

Тесты, написанные на H2, не ловят PostgreSQL-специфичные ошибки. Challenger тесты в проекте (`Challenger1M1Iter2EmpiricalVerificationTest.java` и т.д.) — все работают на H2.

Правильный путь: Testcontainers. `testImplementation 'org.testcontainers:postgresql'` + поднятие реального PostgreSQL в тестах.

---

### [WARNING] 12. Rate limiting — in-memory, не переживёт перезапуск и не масштабируется

**Файл:** `RateLimitingFilter.java`, строки 28-29

```java
private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();
```

Состояние buckets живёт в памяти JVM. При каждом перезапуске приложения — лимиты сбрасываются. Это не критично для single-instance деплоя, но нужно понимать: если приложение перезапускается под нагрузкой — rate limit не работает.

Дополнительно: ConcurrentHashMap растёт без bounds. При большом числе уникальных IP (DDoS) — это утечка памяти. Нужен TTL или LRU eviction.

Для масштаба Tanda на старте это приемлемо — но это `[WARNING]`, потому что нужно знать ограничение.

---

### [INFO] 13. `BookService.isAdmin()` использует SecurityContext напрямую — плохой паттерн

**Файл:** `BookService.java`, строки 19-23

```java
private boolean isAdmin() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return auth != null && auth.getAuthorities() != null &&
            auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
}
```

Сервис знает о SecurityContext. Это нарушает принцип: сервис должен получать данные о пользователе как параметр, а не тянуть из глобального контекста. Это затрудняет тестирование (нужно мокать SecurityContext или дёргать `SecurityContextHolder.setContext()`).

Правильный паттерн:
```java
// в контроллере
@GetMapping
public ResponseEntity<List<BookResponseDto>> getAllBooks(
    @AuthenticationPrincipal UserPrincipal principal,
    ...
) {
    boolean isAdmin = principal != null && "admin".equals(principal.getRole());
    return ResponseEntity.ok(bookService.getBooks(category, search, includeArchived, isAdmin));
}

// в сервисе
public List<BookResponseDto> getBooks(String category, String search, boolean includeArchived, boolean isAdmin) {
    boolean effectiveIncludeArchived = includeArchived && isAdmin;
    ...
}
```

---

### [INFO] 14. Двойные маппинги на все endpoints — техдолг

**Файлы:** все контроллеры

```java
@RequestMapping({"/api/books", "/api/v1/books"})
```

Это есть везде: auth, books, saved-books, progress, media. Два URL на каждый resource. Это создаёт путаницу: какой каноничный? Если нужен versioning — нужно выбрать `/api/v1/` как canonical и убрать дублирование. Если versioning не нужен — убрать `/api/v1/` и оставить `/api/`.

---

### [INFO] 15. `DataInitializer` читает JSON и сидит книги — это не Flyway

**Файл:** `DataInitializer.java`

Начальные данные книг загружаются через `CommandLineRunner` из `data/books.json` — не через Flyway миграцию. Это создаёт разделение: схема через Flyway, данные через Java код. При рефакторинге или переезде это может привести к тому, что новый разработчик запустит базу без начальных данных (если CommandLineRunner упадёт по какой-то причине).

Начальные seed-данные лучше держать в Flyway `V_*__seed_*.sql` с правильным порядком.

---

### [INFO] 16. `Book.audioChapters` — FetchType не указан явно, используется default LAZY

**Файл:** `Book.java`

```java
@OneToMany(mappedBy = "book", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("chapterOrder ASC")
@Builder.Default
private List<AudioChapter> audioChapters = new ArrayList<>();
```

`FetchType` не указан для `@OneToMany` — по JPA spec default для `@OneToMany` это `LAZY`. Это правильно. Но `BookService.toDetailResponseDto()` итерирует `book.getAudioChapters()` — это вызовет lazy load. В транзакции (метод аннотирован `@Transactional`) это нормально. Проблема возникнет, если кто-то попытается получить chapters вне транзакции — будет `LazyInitializationException`. Сейчас код этого не делает, но стоит быть осторожным.

---

## Таблица приоритетов (реальный код)

| # | Проблема | Приоритет | Файл |
|---|---|---|---|
| 1 | `secure=false` на refresh cookie | CRITICAL | `AuthController.java:126` |
| 2 | Hardcoded JWT secret fallback | CRITICAL | `application.yml:12` |
| 3 | Двойной источник admin + пароль `admin123` в коде | CRITICAL | `V2__*.sql`, `DataInitializer.java` |
| 4 | Audio/media без аутентификации | CRITICAL | `SecurityConfig.java:58`, `MediaController.java` |
| 5 | Path traversal в audio streaming | CRITICAL | `MediaUploadService.java:103` |
| 6 | CORS без production домена | WARNING | `SecurityConfig.java:85` |
| 7 | `contentTypeOptions` отключён | WARNING | `SecurityConfig.java:44` |
| 8 | Книги без пагинации | WARNING | `BookService.java`, `BookRepository.java` |
| 9 | BookController без `@PreAuthorize` | WARNING | `BookController.java` |
| 10 | Race condition в `updateProgress()` | WARNING | `ReadingProgressService.java` |
| 11 | Тесты на H2 вместо Testcontainers | WARNING | `application-test.yml` |
| 12 | Rate limiting in-memory, без bounds | WARNING | `RateLimitingFilter.java:28` |
| 13 | `isAdmin()` через SecurityContext в сервисе | INFO | `BookService.java:19` |
| 14 | Двойные URL маппинги везде | INFO | Все контроллеры |
| 15 | Seed data через CommandLineRunner, не Flyway | INFO | `DataInitializer.java` |
| 16 | `FetchType` не указан явно | INFO | `Book.java` |

---

## Что НЕ является проблемой (но было в предыдущем аудите)

Предыдущий аудит поднимал ряд проблем, которых в реальном коде нет:

- **"Нет refresh token lifecycle"** — есть. `RefreshTokenService` полноценный, с rotation и reuse detection.
- **"Нет unified error contract"** — есть. `GlobalExceptionHandler` с унифицированной структурой.
- **"Нет MDC/request ID"** — есть. `JwtAuthFilter` добавляет `X-Request-ID` в MDC и в response header.
- **"Нет rate limiting"** — есть. `RateLimitingFilter` с Bucket4j.
- **"IDOR не защищён"** — защищён в progress и saved-books через `@AuthenticationPrincipal`.
- **"Actuator не добавлен"** — добавлен в `build.gradle`.

---

## План исправлений

Детальный план разбит на три отдельных файла:

| Файл | Фаза | Когда |
|---|---|---|
| `TANDA_PHASE_1_CRITICAL.md` | CRITICAL — 5 задач | До любого production деплоя (2–4 ч) |
| `TANDA_PHASE_2_WARNING.md` | WARNING — 7 задач | До первых реальных пользователей (1–2 дня) |
| `TANDA_PHASE_3_INFO.md` | INFO — 5 задач | По мере роста проекта |

---

## Что делать НЕ нужно

Для текущего масштаба Tanda следующее — over-engineering:

- Redis для сессий или кэширования
- Kafka / RabbitMQ
- Микросервисы
- Elasticsearch для поиска книг
- Distributed tracing (Zipkin/Jaeger)
- gRPC
- Kubernetes

Stale-токены из `refresh_tokens` (revoked + expired) нужно периодически чистить — но это `@Scheduled` джоб на 10 строк, не отдельный сервис.

---

## Итоговая оценка

**Текущий уровень:** значительно выше CRUD. Auth flow, security headers, rate limiting, MDC, error handling, IDOR изоляция — всё сделано. Это не учебный проект.

**Разрыв до JF-1C уровня:** 5 критичных проблем, которые нужно исправить до production. Всё остальное — polish.

**Оценочное время на фазу 1:** 2-4 часа работы.  
**Оценочное время на фазу 2:** 1-2 рабочих дня.

После фазы 1 — backend безопасен для production деплоя.  
После фазы 2 — backend достигает инженерной строгости уровня JF-1C для данного масштаба.
