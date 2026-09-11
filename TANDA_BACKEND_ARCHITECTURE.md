# Архитектура бэкенда Tanda (Легковесная и надежная)

> **Принцип:** *KISS (Keep It Simple, Stupid)* — чистый Spring Boot 3 + PostgreSQL без оверинжиниринга.  
> **Исключено:** ❌ Redis, ❌ Caffeine, ❌ Векторные БД (pgvector), ❌ Kafka, ❌ Микросервисы.

---

## 1. Стек технологий

| Слой | Технология | Зачем |
|---|---|---|
| **Язык** | Java 17 | Стабильность, современные фичи (Records, Text Blocks, Pattern Matching). |
| **Фреймворк** | Spring Boot 3.3.0 | Spring Data JPA, Spring Web, Spring Security 6, Jakarta Validation. |
| **База данных** | **PostgreSQL 15+** | Реляционная БД. Быстрая, надежная, без внешних расширений. |
| **Миграции** | **Flyway** | Версионирование структуры БД (`V1__...`, `V2__...`). |
| **Аутентификация** | **Stateless JWT (jjwt)** | Без сессий и без Redis. Токен проверяется математически (HMAC-SHA256). |
| **Маппинг** | **MapStruct** | Быстрая компиляция Entity $\leftrightarrow$ DTO на этапе сборки. |
| **Утилиты** | **Lombok** | Устранение шаблонного кода (геттеры, сеттеры, билдеры). |

---

## 2. Архитектура системы

```
┌────────────────────────────────────────────────────────┐
│               FRONTEND (React + Vite)                  │
│             Хранит JWT в localStorage                  │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS REST + Bearer Token
┌──────────────────────────▼─────────────────────────────┐
│          SPRING BOOT 3 (Единый сервис)                 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Security Filter (JwtAuthFilter + BCrypt)         │  │
│  │ Проверяет подпись JWT без запросов в сторонние БД│  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────┐ ┌──────────────────────────────┐  │
│  │ AuthController  │ │ BookController / Progress    │  │
│  └────────┬────────┘ └──────────────┬───────────────┘  │
│  ┌────────▼────────┐ ┌──────────────▼───────────────┐  │
│  │ AuthService     │ │ BookService / ProgressService│  │
│  └────────┬────────┘ └──────────────┬───────────────┘  │
│  ┌────────▼─────────────────────────▼───────────────┐  │
│  │          Spring Data JPA Repositories            │  │
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

## 3. Почему этот подход лучше для Tanda?

1. **Минимум инфраструктуры:**  
   Нужен всего 1 сервер (или контейнер на Railway/Render) и 1 база PostgreSQL. Не нужно оплачивать, настраивать и мониторить Redis или векторные хранилища.
2. **Нулевой риск рассинхронизации кэша (Cache Invalidation):**  
   Все данные всегда актуальны в БД, нет проблем с устаревшим кэшем при редактировании или удалении книг.
3. **Высокая скорость из коробки:**  
   PostgreSQL с правильными индексами (`idx_users_email`, `idx_books_category`, `idx_saved_books_user_id`) легко обрабатывает тысячи запросов в секунду для библиотеки такого масштаба.
4. **Простой Stateless JWT:**  
   Токен содержит `userId`, `email` и `role` (`admin` / `client`). Сервер валидирует его за микросекунды через секретный ключ без похода в базу.

---

## 4. Структура проекта (Feature-by-Package)

```
backend/
├── src/main/java/com/tanda/
│   ├── TandaApplication.java
│   │
│   ├── config/
│   │   ├── SecurityConfig.java          # Spring Security 6, CORS, BCrypt
│   │   ├── JwtProperties.java           # Секрет и время жизни JWT из yaml
│   │   └── WebConfig.java               # Настройки CORS для фронтенда
│   │
│   ├── security/
│   │   ├── JwtTokenProvider.java        # Генерация и валидация токенов
│   │   ├── JwtAuthFilter.java           # Извлечение Bearer-токена из заголовка
│   │   └── UserPrincipal.java           # Авторизованный пользователь в SecurityContext
│   │
│   ├── modules/
│   │   ├── auth/                        # Логин, регистрация, текущий юзер (/api/auth)
│   │   │   ├── controller/AuthController.java
│   │   │   ├── service/AuthService.java
│   │   │   └── dto/{LoginRequest, RegisterRequest, AuthResponse}.java
│   │   │
│   │   ├── user/                        # Пользователи и профили (/api/users)
│   │   │   ├── entity/User.java
│   │   │   ├── repository/UserRepository.java
│   │   │   └── dto/UserResponseDto.java
│   │   │
│   │   ├── book/                        # Каталог книг и аудио-главы (/api/books)
│   │   │   ├── entity/Book.java
│   │   │   ├── entity/AudioChapter.java
│   │   │   ├── repository/BookRepository.java
│   │   │   ├── repository/AudioChapterRepository.java
│   │   │   ├── service/BookService.java
│   │   │   └── controller/BookController.java
│   │   │
│   │   ├── saved/                       # Избранные/сохраненные книги (/api/saved-books)
│   │   │   ├── entity/SavedBook.java
│   │   │   ├── repository/SavedBookRepository.java
│   │   │   ├── service/SavedBookService.java
│   │   │   └── controller/SavedBookController.java
│   │   │
│   │   └── progress/                    # Прогресс чтения и аудио (/api/progress)
│   │       ├── entity/ReadingProgress.java
│   │       ├── repository/ReadingProgressRepository.java
│   │       ├── service/ReadingProgressService.java
│   │       └── controller/ReadingProgressController.java
│   │
│   └── exception/
│       ├── GlobalExceptionHandler.java  # Стандартизация ошибок (400, 401, 403, 404, 500)
│       └── ResourceNotFoundException.java
│
└── src/main/resources/
    ├── application.yml                  # Общий конфиг
    ├── application-local.yml            # H2 или локальный Postgres
    ├── application-prod.yml             # Railway/Prod Postgres + ENV переменные
    └── db/migration/
        ├── V1__init_books_schema.sql
        ├── V2__add_users_and_saved_books.sql
        └── V3__alter_books_pages_nullable.sql
```

---

## 5. Зависимости в `build.gradle` (Без лишнего)

```gradle
dependencies {
    // Web & Validation
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'

    // Security & JWT
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'io.jsonwebtoken:jjwt-api:0.12.5'
    runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.5'
    runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.5'

    // Database & Migrations
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    runtimeOnly 'org.postgresql:postgresql'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'

    // Lombok & MapStruct
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    implementation 'org.mapstruct:mapstruct:1.5.5.Final'
    annotationProcessor 'org.mapstruct:mapstruct-processor:1.5.5.Final'
    annotationProcessor 'org.projectlombok:lombok-mapstruct-binding:0.2.0'

    // Testing
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
}
```

---

## 6. Итог

Такая архитектура:
- **Разворачивается за 5 минут** (один jar-файл + PostgreSQL).
- **Легко читается и поддерживается** любым Java-разработчиком.
- **Не требует дополнительных сервисов** (Redis, Vector DB).
- **Покрывает 100% требований** платформы Tanda: книги, аудиокниги, читалка, закладки, прогресс, админка и авторизация.
