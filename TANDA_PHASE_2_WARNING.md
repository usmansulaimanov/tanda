# Tanda — Фаза 2: WARNING

**Срок:** до первых реальных пользователей  
**Оценка времени:** 1–2 рабочих дня  
**Критерий выхода:** backend достигает инженерной строгости уровня JF-1C для данного масштаба

---

## 2.1. CORS — добавить production домен

**Файл:** `SecurityConfig.java:85`

```java
// было — hardcoded localhost origins
config.setAllowedOrigins(List.of("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"));

// стало — через конфиг
@Value("${app.cors.allowed-origins}")
private List<String> allowedOrigins;

// в corsConfigurationSource():
config.setAllowedOrigins(allowedOrigins);
```

`application-prod.yml`:
```yaml
app:
  cors:
    allowed-origins:
      - https://tanda.kz
      - https://www.tanda.kz
```

`application-local.yml`:
```yaml
app:
  cors:
    allowed-origins:
      - http://localhost:5173
      - http://localhost:3000
```

---

## 2.2. Включить contentTypeOptions

**Файл:** `SecurityConfig.java:44–45`

```java
// было (и комментарий неправильный — disable() убирает nosniff, а не оставляет его)
.contentTypeOptions(HeadersConfigurer.ContentTypeOptionsConfig::disable)

// стало — убрать строку целиком (Spring Boot добавит nosniff по умолчанию)
// или явно:
.contentTypeOptions(c -> c.nosniff())
```

---

## 2.3. Пагинация для книг

**Файлы:** `BookRepository.java`, `BookService.java`, `BookController.java`

`BookRepository.java`:
```java
// заменить сигнатуру
@Query("SELECT b FROM Book b WHERE ...")
Page<Book> searchBooks(
    @Param("category") String category,
    @Param("search") String search,
    @Param("includeArchived") boolean includeArchived,
    Pageable pageable
);
```

`BookController.java`:
```java
@GetMapping
public ResponseEntity<Page<BookResponseDto>> getAllBooks(
    @RequestParam(required = false) String category,
    @RequestParam(required = false) String search,
    @RequestParam(required = false, defaultValue = "false") boolean includeArchived,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    return ResponseEntity.ok(bookService.getBooks(category, search, includeArchived, pageable));
}
```

Аналогично: `UserService.getAllUsers()` — `userRepository.findAll()` заменить на `findAll(pageable)`.

---

## 2.4. `@PreAuthorize` на admin-операции в BookController

**Файл:** `BookController.java` — сейчас нет ни одной аннотации метода

```java
@PostMapping
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<BookResponseDto> createBook(...) { ... }

@PutMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<BookResponseDto> updateBook(...) { ... }

@PatchMapping("/{id}/archive")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<BookResponseDto> toggleArchive(...) { ... }

@DeleteMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<Void> deleteBook(...) { ... }
```

Это defense-in-depth: SecurityConfig защищает по URL, `@PreAuthorize` — на уровне метода. При добавлении нового маппинга защита не забудется.

---

## 2.5. Race condition fix в ReadingProgressService

**Файл:** `ReadingProgressService.java`

Добавить обработку `DataIntegrityViolationException` при конкурентном создании записи:

```java
@Transactional
public ReadingProgressResponseDto updateProgress(String userId, String bookId, ReadingProgressRequestDto dto) {
    ReadingProgress progress = progressRepository.findByUserIdAndBookId(userId, bookId).orElse(null);

    if (progress == null) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Кітап табылмады id: " + bookId));
        try {
            progress = ReadingProgress.builder()
                    .id("rp-" + UUID.randomUUID().toString().substring(0, 8))
                    .book(book)
                    .userId(userId)
                    .currentPage(dto.getCurrentPage() != null ? dto.getCurrentPage() : 1)
                    .currentAudioChapterId(dto.getCurrentAudioChapterId())
                    .currentAudioTime(dto.getCurrentAudioTime() != null ? dto.getCurrentAudioTime() : 0)
                    .updatedAt(OffsetDateTime.now())
                    .build();
            progress = progressRepository.save(progress);
        } catch (DataIntegrityViolationException e) {
            // Race condition: другой поток уже успел вставить запись
            progress = progressRepository.findByUserIdAndBookId(userId, bookId)
                    .orElseThrow(() -> new RuntimeException("Прогрессті жаңарту мүмкін болмады"));
            applyProgressUpdates(progress, dto);
            progress = progressRepository.save(progress);
        }
    } else {
        applyProgressUpdates(progress, dto);
        progress = progressRepository.save(progress);
    }
    return toDto(progress);
}

private void applyProgressUpdates(ReadingProgress progress, ReadingProgressRequestDto dto) {
    if (dto.getCurrentPage() != null) progress.setCurrentPage(dto.getCurrentPage());
    if (dto.getCurrentAudioChapterId() != null) progress.setCurrentAudioChapterId(dto.getCurrentAudioChapterId());
    if (dto.getCurrentAudioTime() != null) progress.setCurrentAudioTime(dto.getCurrentAudioTime());
    progress.setUpdatedAt(OffsetDateTime.now());
}
```

---

## 2.6. Testcontainers вместо H2

**Файлы:** `build.gradle`, `application-test.yml`

`build.gradle`:
```groovy
testImplementation 'org.testcontainers:junit-jupiter:1.20.1'
testImplementation 'org.testcontainers:postgresql:1.20.1'
```

`application-test.yml`:
```yaml
spring:
  datasource:
    url: jdbc:tc:postgresql:16://localhost/tanda_test
    driver-class-name: org.testcontainers.jdbc.ContainerDatabaseDriver
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
```

Testcontainers автоматически поднимает реальный PostgreSQL контейнер при запуске тестов. Зависимость H2 из `build.gradle` после этого можно убрать.

---

## 2.7. Rate limiting — добавить bounds через Caffeine

**Файл:** `RateLimitingFilter.java:28–29`

`build.gradle`:
```groovy
implementation 'com.github.ben-manes.caffeine:caffeine:3.1.8'
```

```java
// было — неограниченный ConcurrentHashMap, растёт до ООМ при DDoS
private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

// стало — bounded cache с TTL
private final Cache<String, Bucket> authBuckets = Caffeine.newBuilder()
    .expireAfterAccess(10, TimeUnit.MINUTES)
    .maximumSize(10_000)
    .build();

private final Cache<String, Bucket> generalBuckets = Caffeine.newBuilder()
    .expireAfterAccess(5, TimeUnit.MINUTES)
    .maximumSize(100_000)
    .build();
```

Вызовы заменить: `authBuckets.computeIfAbsent(key, k -> createAuthBucket())` → `authBuckets.get(key, k -> createAuthBucket())`.

---

## Чеклист Фазы 2

- [ ] CORS origins вынесены в конфиг, production домен добавлен
- [ ] `contentTypeOptions::disable` убран — nosniff включён
- [ ] Пагинация для `GET /api/v1/books` (page + size параметры)
- [ ] `@PreAuthorize("hasRole('ADMIN')")` на POST/PUT/PATCH/DELETE в BookController
- [ ] Race condition в `updateProgress()` обработан через `DataIntegrityViolationException`
- [ ] Testcontainers вместо H2 в тестах
- [ ] Rate limiting: Caffeine cache с bounds вместо голого ConcurrentHashMap
