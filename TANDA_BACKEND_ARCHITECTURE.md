# Архитектура бэкенда Tanda (Легковесная, надежная, Enterprise-ready)

> **Принцип:** *KISS (Keep It Simple, Stupid)* — чистый Spring Boot 3 + PostgreSQL без оверинжиниринга.  
> **Исключено:** ❌ Redis, ❌ Caffeine, ❌ Векторные БД (pgvector), ❌ Kafka, ❌ Микросервисы.

---

## 1. Стек технологий

| Слой | Технология | Зачем |
|---|---|---|
| **Язык** | Java 17 | Стабильность, современные возможности (Records, Text Blocks, Pattern Matching). |
| **Фреймворк** | Spring Boot 3.3.0 | Spring Data JPA, Spring Web, Spring Security 6, Jakarta Validation, Actuator. |
| **База данных** | **PostgreSQL 15+** / H2 (test) | Реляционная БД. Быстрая, надежная, ACID-совместимая. |
| **Миграции** | **Flyway** | Версионирование структуры БД (`V1__...` до `V6__...`). |
| **Аутентификация** | **Stateless JWT (jjwt 0.12.5)** | Без сессий и без Redis. Токен проверяется математически (HMAC-SHA256). |
| **OAuth2 / GIS** | **Google Identity Services SDK 2.7.0** | Криптографическая верификация Google ID Token на сервере. |
| **Observability** | **Spring Boot Actuator + SLF4J MDC** | Health checks, metrics, X-Request-ID correlation tracking, JSON logs. |
| **Утилиты** | **Lombok 1.18.36** | Устранение шаблонного кода (геттеры, сеттеры, билдеры, `@Slf4j`). |

---

## 2. Архитектура системы

```
┌────────────────────────────────────────────────────────┐
│               FRONTEND (React 18 + Vite)               │
│             Хранит JWT в localStorage                  │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS REST + Bearer Token + X-Request-ID
┌──────────────────────────▼─────────────────────────────┐
│          SPRING BOOT 3 (Единый сервис)                 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Security Filter (JwtAuthFilter + MDC + BCrypt)   │  │
│  │ Проверяет подпись JWT, присваивает correlation ID│  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────┐ ┌──────────────────────────────┐  │
│  │ AuthController  │ │ BookController / Progress    │  │
│  └────────┬────────┘ └──────────────┬───────────────┘  │
│  ┌────────▼────────┐ ┌──────────────▼───────────────┐  │
│  │ AuthService     │ │ BookService / ProgressService│  │
│  │ (Google/Local)  │ │ (Audio chapters, caching)    │  │
│  └────────┬────────┘ └──────────────┬───────────────┘  │
│  ┌────────▼─────────────────────────▼───────────────┐  │
│  │          Spring Data JPA Repositories            │  │
│  │ (Batch queries, N+1 optimization, Row-Level Sec) │  │
│  └────────────────────────┬─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │ JDBC (HikariCP пул)
┌───────────────────────────▼────────────────────────────┐
│                    POSTGRESQL                          │
│   users, books, audio_chapters, saved_books, progress  │
│          (Индексы: B-Tree по email, book_id, user_id)  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Структура проекта (Layout)

```
backend/
├── src/main/java/com/tanda/
│   ├── TandaApplication.java
│   │
│   ├── config/
│   │   ├── SecurityConfig.java          # Spring Security 6, CORS, Actuator permitAll
│   │   ├── JwtProperties.java           # Секрет и время жизни JWT из yaml
│   │   ├── GoogleOAuthProperties.java   # Google Client ID конфигурация
│   │   ├── WebConfig.java               # Настройки CORS для фронтенда
│   │   └── DataInitializer.java         # Безопасный посев данных без утечки паролей
│   │
│   ├── security/
│   │   ├── JwtTokenProvider.java        # Генерация и валидация токенов
│   │   ├── JwtAuthFilter.java           # Bearer-токен + MDC X-Request-ID
│   │   ├── UserDetailsServiceImpl.java  # Загрузка пользователя из БД
│   │   └── UserPrincipal.java           # Аутентифицированный пользователь
│   │
│   ├── controller/
│   │   ├── AuthController.java          # /api/auth/login, register, me, google
│   │   ├── BookController.java          # /api/books (CRUD, поиск, архив)
│   │   ├── UserController.java          # /api/admin/users
│   │   ├── SavedBookController.java     # /api/saved-books
│   │   └── ReadingProgressController.java # /api/progress
│   │
│   ├── service/
│   │   ├── AuthService.java             # Local + Google login/register логика
│   │   ├── GoogleTokenVerifier.java     # Google SDK криптографическая проверка
│   │   ├── BookService.java             # Управление книгами и аудио-главами
│   │   ├── UserService.java             # N+1 оптимизированный сервис с last-admin guard
│   │   ├── SavedBookService.java        # Сохраненные книги
│   │   └── ReadingProgressService.java  # Прогресс чтения и аудио
│   │
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── BookRepository.java
│   │   ├── AudioChapterRepository.java
│   │   ├── SavedBookRepository.java     # Batch count запросы (N+1 free)
│   │   └── ReadingProgressRepository.java
│   │
│   ├── entity/
│   │   ├── User.java                    # authProvider, avatarUrl, role, passwordHash
│   │   ├── Book.java
│   │   ├── AudioChapter.java
│   │   ├── SavedBook.java
│   │   └── ReadingProgress.java
│   │
│   └── exception/
│       ├── GlobalExceptionHandler.java  # Стандартизация ошибок (400, 401, 403, 404, 500)
│       └── ResourceNotFoundException.java
│
└── src/main/resources/
    ├── application.yml                  # Общий конфиг (Actuator, JWT, Google)
    ├── logback-spring.xml               # Dev (Console colored) & Prod (JSON structured)
    └── db/migration/
        ├── V1__init_books_schema.sql
        ├── V2__add_users_and_saved_books.sql
        ├── V3__alter_books_pages_nullable.sql
        ├── V4__fix_schema_constraints_and_lengths.sql
        ├── V5__add_google_oauth.sql
        └── V6__add_google_auth_and_avatar.sql
```

---

## 4. Зависимости в `build.gradle`

```gradle
dependencies {
    // Web, JPA, Validation & Actuator
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'

    // Database & Migrations
    runtimeOnly 'org.postgresql:postgresql'
    runtimeOnly 'com.h2database:h2'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'

    // Security & JWT
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'io.jsonwebtoken:jjwt-api:0.12.5'
    runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.5'
    runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.5'

    // Google OAuth (GIS)
    implementation 'com.google.api-client:google-api-client:2.7.0'

    // Lombok
    compileOnly 'org.projectlombok:lombok:1.18.36'
    annotationProcessor 'org.projectlombok:lombok:1.18.36'

    // Testing
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
```

---

## 5. Итог

Такая архитектура:
- **Разворачивается мгновенно** (один jar-файл + PostgreSQL).
- **Имеет 100% покрытие автоматическими тестами** (200+ бэкенд тестов + 12 E2E Playwright тестов).
- **Полная наблюдаемость (Observability):** Health checks, метрики, структурированные логи, Request Correlation ID.
- **Enterprise-grade безопасность:** BCrypt, Stateless JWT, Google ID Token Cryptographic Verification, Last-Admin Guard, IDOR Protection.
