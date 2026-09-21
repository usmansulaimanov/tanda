# Tanda — Фаза 1: CRITICAL

**Срок:** до любого production деплоя  
**Оценка времени:** 2–4 часа  
**Критерий выхода:** backend безопасен для production

---

## 1.1. Убрать `secure=false` из refresh cookie

**Файл:** `AuthController.java:126`

```java
// было
.secure(false)

// стало
.secure(cookieSecure)
```

Добавить поле в контроллер:
```java
@Value("${app.cookie.secure:true}")
private boolean cookieSecure;
```

`application-local.yml`:
```yaml
app:
  cookie:
    secure: false
```

`application-prod.yml`:
```yaml
app:
  cookie:
    secure: true
```

---

## 1.2. Убрать fallback из JWT secret

**Файл:** `application.yml:12`

```yaml
# было
jwt:
  secret: ${JWT_SECRET:tanda-super-secret-jwt-key-minimum-256-bits-for-security-2026}

# стало
jwt:
  secret: ${JWT_SECRET}
```

`JwtTokenProvider.java` — добавить fail-fast в `@PostConstruct`:
```java
@PostConstruct
public void init() {
    String secret = jwtProperties.getSecret();
    if (secret == null || secret.isBlank()) {
        throw new IllegalStateException("JWT_SECRET environment variable must be set");
    }
    // остальной код без изменений
}
```

---

## 1.3. Убрать `admin123` из кода

**Файлы:** `V2__add_users_and_saved_books.sql:26–34`, `DataInitializer.java:157–164`

Вариант А (минимальный): убрать INSERT из V2, создать `V8__admin_seed.sql` только как placeholder, в DataInitializer читать пароль из env:

```java
@Value("${ADMIN_INITIAL_PASSWORD:#{null}}")
private String adminInitialPassword;

// в seedAdminUser():
if (adminInitialPassword == null) {
    log.error("ADMIN_INITIAL_PASSWORD is not set. Admin user not created.");
    return;
}
String encodedPassword = passwordEncoder.encode(adminInitialPassword);
```

Вариант Б (строже): убрать DataInitializer как источник admin полностью. Только Flyway V2 с комментарием "применить один раз при первом деплое, затем сменить пароль через admin panel".

---

## 1.4. Закрыть audio streaming за аутентификацией

**Файлы:** `SecurityConfig.java:58`, `MediaController.java:36–45`

`MediaController.java`:
```java
@GetMapping("/media/stream/audio/{fileName}")
@PreAuthorize("isAuthenticated()")  // добавить
public ResponseEntity<ResourceRegion> streamAudio(...) {
```

`SecurityConfig.java`:
```java
// было
.requestMatchers("/uploads/**").permitAll()

// стало — открыть только covers (обложки публичные), audio и books за auth
.requestMatchers("/uploads/covers/**").permitAll()
// /uploads/audio/** и /uploads/books/** требуют аутентификации через anyRequest().authenticated()
```

Если нужна проверка `isFree` в будущем — отдельный endpoint, который принимает bookId, проверяет флаг и редиректит или стримит.

---

## 1.5. Path traversal fix в audio streaming

**Файл:** `MediaUploadService.java:103`

```java
public ResourceRegion getAudioResourceRegion(String fileName, HttpHeaders headers) throws IOException {
    // ДОБАВИТЬ эти две строки:
    Path audioDir = Paths.get(storageLocation).resolve("audio").toAbsolutePath().normalize();
    Path filePath = audioDir.resolve(fileName).normalize();

    // ДОБАВИТЬ проверку:
    if (!filePath.startsWith(audioDir)) {
        throw new BadRequestException("Недопустимый путь к файлу");
    }

    if (!Files.exists(filePath)) {
        throw new BadRequestException("Аудио файл табылмады");
    }
    // остальной код без изменений
}
```

---

## Чеклист Фазы 1

- [ ] `secure=false` → `secure(cookieSecure)` + конфиг по профилям
- [ ] JWT secret fallback убран, fail-fast добавлен
- [ ] `admin123` убран из кода и SQL, пароль через env
- [ ] `/uploads/audio/**` закрыт за аутентификацией
- [ ] `/api/v1/media/stream/audio/**` закрыт через `@PreAuthorize("isAuthenticated()")`
- [ ] Path traversal fix: `.normalize()` + `.startsWith(audioDir)`
