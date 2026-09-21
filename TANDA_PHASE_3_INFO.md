# Tanda — Фаза 3: INFO

**Срок:** по мере роста проекта, не блокирует production  
**Оценка времени:** по задаче  
**Критерий выхода:** нет жёсткого — это polish и архитектурная гигиена

---

## 3.1. Вынести `isAdmin()` из BookService в параметр метода

**Файл:** `BookService.java:19–23`

Сервис не должен тянуть `SecurityContextHolder` напрямую — это усложняет тестирование и нарушает разделение ответственности.

`BookController.java`:
```java
@GetMapping
public ResponseEntity<List<BookResponseDto>> getAllBooks(
    @AuthenticationPrincipal UserPrincipal principal,
    @RequestParam(required = false) String category,
    @RequestParam(required = false) String search,
    @RequestParam(required = false, defaultValue = "false") boolean includeArchived
) {
    boolean isAdmin = principal != null && "admin".equals(principal.getRole());
    return ResponseEntity.ok(bookService.getBooks(category, search, includeArchived, isAdmin));
}
```

`BookService.java`:
```java
// убрать метод isAdmin()

public List<BookResponseDto> getBooks(String category, String search, boolean includeArchived, boolean isAdmin) {
    boolean effectiveIncludeArchived = includeArchived && isAdmin;
    // остальной код без изменений
}
```

---

## 3.2. Выбрать один canonical URL prefix

**Файлы:** все контроллеры

Сейчас везде двойные маппинги:
```java
@RequestMapping({"/api/books", "/api/v1/books"})
@RequestMapping({"/api/auth", "/api/v1/auth"})
// и т.д.
```

Нужно выбрать один вариант и убрать дублирование. Рекомендация: оставить `/api/v1/` как canonical, убрать `/api/` без версии — это оставляет возможность добавить `/api/v2/` в будущем без конфликтов.

Убрать дублирование поэтапно: по одному контроллеру за коммит.

---

## 3.3. Перенести seed данных в Flyway

**Файл:** `DataInitializer.java`

Книги сейчас загружаются через `CommandLineRunner` из `data/books.json`. Это отдельный механизм от Flyway — схема через миграции, данные через Java код.

Альтернатива: `V9__seed_books.sql` с начальными данными. Плюсы: один источник правды, данные версионированы вместе со схемой, reproducible при чистом деплое без Java-кода.

Минус: SQL INSERT для большого JSON может быть громоздким. Для 10–20 книг — нормально, для 200+ — лучше оставить CommandLineRunner.

---

## 3.4. Явно указать `FetchType.LAZY` в Book.audioChapters

**Файл:** `Book.java`

```java
// было — implicit LAZY (JPA default для @OneToMany)
@OneToMany(mappedBy = "book", cascade = CascadeType.ALL, orphanRemoval = true)

// стало — explicit, намерение очевидно из кода
@OneToMany(mappedBy = "book", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
```

Не функциональное изменение, но делает код читаемым без знания JPA defaults.

---

## 3.5. Периодическая чистка stale refresh tokens

Таблица `refresh_tokens` растёт: revoked + expired токены никогда не удаляются. Это не проблема сейчас, но через год это несколько десятков тысяч мёртвых строк.

```java
@Component
@RequiredArgsConstructor
public class RefreshTokenCleanupJob {

    private final RefreshTokenRepository refreshTokenRepository;

    @Scheduled(cron = "0 0 3 * * *") // каждую ночь в 03:00
    @Transactional
    public void cleanupExpiredTokens() {
        int deleted = refreshTokenRepository.deleteExpiredOrRevoked(OffsetDateTime.now());
        log.info("Cleaned up {} stale refresh tokens", deleted);
    }
}
```

`RefreshTokenRepository.java`:
```java
@Modifying
@Query("DELETE FROM RefreshToken rt WHERE rt.revoked = true OR rt.expiresAt < :now")
int deleteExpiredOrRevoked(@Param("now") OffsetDateTime now);
```

Добавить `@EnableScheduling` на `TandaApplication.java`.

---

## Чеклист Фазы 3

- [ ] `isAdmin()` убран из BookService, передаётся как параметр из контроллера
- [ ] Двойные URL маппинги убраны, выбран один canonical prefix
- [ ] Seed данные перенесены в Flyway (если объём разумный)
- [ ] `FetchType.LAZY` указан явно в `Book.audioChapters`
- [ ] `@Scheduled` джоб для чистки stale refresh tokens
