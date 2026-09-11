# Tanda — Полный план реализации бекенда и интеграции с фронтендом

> **Версия:** 1.0 | **Дата:** Сентябрь 2026  
> **Цель:** Полностью перейти с localStorage/mock-данных на реальный бекенд + БД, не нарушая дизайн.

---

## 📋 Содержание

1. [Понимание текущего состояния](#1-понимание-текущего-состояния)
2. [Целевая архитектура](#2-целевая-архитектура)
3. [Tech Stack с обоснованием](#3-tech-stack-с-обоснованием)
4. [База данных — полная схема](#4-база-данных--полная-схема)
5. [Бекенд — структура и API](#5-бекенд--структура-и-api)
6. [Фронтенд — что и как менять](#6-фронтенд--что-и-как-менять)
7. [Очистка localStorage](#7-очистка-localstorage)
8. [Roadmap: MVP → Итерации](#8-roadmap-mvp--итерации)
9. [Подводные камни](#9-подводные-камни)
10. [Checklist по каждому файлу](#10-checklist-по-каждому-файлу)

---

## 1. Понимание текущего состояния

### Что есть сейчас

| Слой | Статус | Проблема |
|---|---|---|
| Фронтенд (React + Zustand) | ✅ Готов, дизайн хорош | Все данные в localStorage |
| Бекенд (Spring Boot) | ⚠️ Частично | Только CRUD книг, нет users, нет auth |
| БД | ⚠️ Частично | Таблицы books + audio_chapters + reading_progress, но нет users |
| Аутентификация | ❌ Отсутствует | `loginAsAdmin()` / `loginAsClient()` — это моки |
| Сохранённые книги | ❌ Только localStorage | Нет таблицы в БД |
| Аудиоплеер прогресс | ❌ Только localStorage | Нет синхронизации с сервером |
| Пользователи | ❌ Только localStorage | DEFAULT_USERS в коде |

### Что делает каждый Zustand store

**`useAuthStore`** — хранит текущего пользователя, список всех пользователей (мок), логин/логаут. Всё в localStorage под ключом `tanda_auth_storage`.

**`useBookStore`** — хранит все книги (INITIAL_BOOKS), CRUD операции. Пытается синхронизировать с `/api/books`, но при ошибке остаётся на моках. Ключ: `tanda_books_storage`.

**`useSavedBooksStore`** — хранит `savedByUser: { email: [bookId, ...] }`. Ключ: `tanda_saved_books_storage`.

**`useAudioPlayerStore`** — состояние плеера (текущая книга, глава, прогресс). Ключ: `tanda_audio_player_state_v1`.

### Страницы и что им нужно от бекенда

| Страница | Нужные API |
|---|---|
| `LandingPage` | `GET /api/books` (без архивированных) |
| `CatalogPage` | `GET /api/books?category=&search=` |
| `BookDetailPage` | `GET /api/books/:id` (с главами) |
| `ReaderPage` | `GET /api/books/:id`, `POST /api/progress` |
| `ProfilePage` | `GET /api/users/me`, `GET /api/saved-books`, `DELETE /api/saved-books/:bookId` |
| `AdminDashboard` | `GET /api/books?includeArchived=true`, `PATCH /api/books/:id/archive`, `DELETE /api/books/:id` |
| `BookFormPage` | `POST /api/books`, `PUT /api/books/:id` |
| `ReadersPage` | `GET /api/admin/users` |
| `Header` | Login/Register modal → `POST /api/auth/login`, `POST /api/auth/register` |

---

## 2. Целевая архитектура

```
┌─────────────────────────────────────────────────┐
│              ПОЛЬЗОВАТЕЛИ                        │
│         (браузер / iOS / Android)                │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────┐
│           FRONTEND (React + Vite)                │
│    GitHub Pages / любой статик-хостинг           │
│                                                  │
│  ┌─────────────┐  ┌──────────────┐               │
│  │ Zustand     │  │ API Layer    │               │
│  │ (UI state   │  │ (fetch/axios │               │
│  │  only)      │  │  + JWT)      │               │
│  └─────────────┘  └──────┬───────┘               │
└─────────────────────────┼───────────────────────┘
                           │ REST JSON + JWT Bearer
┌──────────────────────────▼──────────────────────┐
│          BACKEND (Spring Boot 3.x)               │
│              порт 8080                           │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Security Layer (Spring Security + JWT)  │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ AuthController│ │BookControl.│ │UserControl.│  │
│  └──────┬───────┘ └─────┬──────┘ └─────┬──────┘  │
│  ┌──────▼───────────────▼──────────────▼──────┐  │
│  │              Service Layer                  │  │
│  │  AuthService  BookService  UserService      │  │
│  └──────────────────────┬──────────────────────┘  │
│  ┌──────────────────────▼──────────────────────┐  │
│  │           Repository Layer (JPA)            │  │
│  └──────────────────────┬──────────────────────┘  │
└─────────────────────────┼───────────────────────┘
                           │ JDBC
┌──────────────────────────▼──────────────────────┐
│              PostgreSQL                          │
│   users, books, audio_chapters,                 │
│   saved_books, reading_progress                 │
└─────────────────────────────────────────────────┘
```

### Принципы архитектуры

1. **Фронтенд НЕ хранит бизнес-данные в localStorage** — только UI state (тема, sidebar открыт/закрыт) и JWT токен.
2. **JWT в httpOnly cookie** или localStorage (см. раздел безопасности) — для авторизации.
3. **Zustand** остаётся, но теперь это кэш серверных данных, а не источник истины.
4. **Все мутации** (добавить книгу, сохранить книгу, логин) — сначала на сервер, потом обновляем Zustand.

---

## 3. Tech Stack с обоснованием

### Бекенд

| Технология | Выбор | Почему |
|---|---|---|
| Язык | **Java 17** | Уже есть, Spring Boot работает |
| Фреймворк | **Spring Boot 3.3** | Уже есть, богатая экосистема |
| Аутентификация | **Spring Security + JWT (jjwt)** | Стандарт для Spring, хорошая документация |
| БД | **PostgreSQL** | Уже прописан в build.gradle, production-ready |
| Миграции | **Flyway** | Уже настроен |
| Маппинг | **MapStruct** | Безопаснее и быстрее ручного маппинга в DTO |
| Валидация | **Jakarta Validation** | Уже есть |
| Lombok | Да | Уже есть |

> **Что НЕ берём:** Redis, Kafka, микросервисы — это over-engineering для текущего масштаба. При 10k пользователей это всё ещё не нужно.

### Фронтенд (изменения)

| Что | Было | Станет |
|---|---|---|
| HTTP-клиент | нативный fetch | **axios** + interceptors (для автоматического добавления JWT) |
| Auth state | Zustand persist (localStorage) | Zustand (только UI) + JWT в localStorage |
| Book data | Zustand persist (localStorage) | Zustand как кэш + fetch от API |
| Saved books | Zustand persist (localStorage) | Fetch от API, Zustand как кэш |

### Где деплоить бекенд

**Рекомендация для старта:**

| Вариант | Стоимость | Сложность | Когда |
|---|---|---|---|
| **Railway.app** | $5/мес (или free tier) | ⭐ Очень просто | **Сейчас (MVP)** |
| Render.com | Free tier есть | ⭐ Просто | MVP |
| VPS (DigitalOcean/Hetzner) | $6-12/мес | ⭐⭐⭐ Сложнее | После MVP |

Railway: подключаешь GitHub repo → выбираешь backend папку → он сам собирает Gradle → добавляешь PostgreSQL одной кнопкой → готово.

---

## 4. База данных — полная схема

### Новые миграции (добавляем к существующим)

#### V2__add_users_and_saved_books.sql

```sql
-- Пользователи системы
CREATE TABLE users (
    id           VARCHAR(64) PRIMARY KEY,
    id_number    VARCHAR(10) UNIQUE,          -- "000 001", "001 001" и т.д.
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role         VARCHAR(10) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);

-- Сохранённые книги (у каждого пользователя свой список)
CREATE TABLE saved_books (
    id         VARCHAR(64) PRIMARY KEY,
    user_id    VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id    VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    saved_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, book_id)              -- нельзя сохранить одну книгу дважды
);

CREATE INDEX idx_saved_books_user_id ON saved_books(user_id);

-- Вставляем первого admin-пользователя
-- Пароль: admin123 (bcrypt hash ниже — замени на свой через https://bcrypt-generator.com)
INSERT INTO users (id, id_number, name, email, password_hash, role)
VALUES (
    'admin-1',
    '000 001',
    'Админ',
    'admin@tanda.kz',
    '$2a$12$ЗАМЕНИ_НА_РЕАЛЬНЫЙ_BCRYPT_HASH',
    'admin'
);
```

#### V3__alter_books_pages_nullable.sql

```sql
-- В фронтенде pages может быть null (audiobook без страниц)
-- В текущей схеме pages NOT NULL — это баг
ALTER TABLE books ALTER COLUMN pages DROP NOT NULL;

-- reading_progress: user_id теперь ссылается на users
-- Пересоздаём с FK
ALTER TABLE reading_progress 
    ADD CONSTRAINT fk_reading_progress_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Итоговая ER-схема

```
users
├── id (PK)
├── id_number (UNIQUE) ← "000 001" формат
├── name
├── email (UNIQUE)
├── password_hash
├── role ('admin' | 'client')
├── created_at
└── is_active

books
├── id (PK)
├── title
├── author
├── description
├── category
├── pages (NULLABLE)
├── has_audio
├── audio_narrator
├── audio_duration
├── audio_url
├── cover_image
├── gradient
├── is_free
├── is_archived
└── created_at

audio_chapters
├── id (PK)
├── book_id (FK → books.id)
├── title
├── audio_url
├── duration
└── chapter_order

saved_books
├── id (PK)
├── user_id (FK → users.id)
├── book_id (FK → books.id)
├── saved_at
└── UNIQUE(user_id, book_id)

reading_progress
├── id (PK)
├── user_id (FK → users.id)
├── book_id (FK → books.id)
├── current_page
├── current_audio_chapter_id
├── current_audio_time
└── updated_at
```

---

## 5. Бекенд — структура и API

### Новая структура папок бекенда

```
backend/
└── src/main/java/com/tanda/
    ├── TandaApplication.java
    │
    ├── config/
    │   ├── SecurityConfig.java          ← НОВЫЙ: Spring Security + CORS
    │   ├── JwtConfig.java               ← НОВЫЙ: параметры токена
    │   └── DataInitializer.java         ← уже есть, расширить для users
    │
    ├── security/
    │   ├── JwtTokenProvider.java        ← НОВЫЙ: создание/проверка JWT
    │   ├── JwtAuthFilter.java           ← НОВЫЙ: фильтр на каждый запрос
    │   └── UserDetailsServiceImpl.java  ← НОВЫЙ: загружает user из БД
    │
    ├── entity/
    │   ├── Book.java                    ← уже есть
    │   ├── AudioChapter.java            ← уже есть
    │   ├── ReadingProgress.java         ← уже есть
    │   ├── User.java                    ← НОВЫЙ
    │   └── SavedBook.java               ← НОВЫЙ
    │
    ├── repository/
    │   ├── BookRepository.java          ← уже есть
    │   ├── AudioChapterRepository.java  ← уже есть
    │   ├── ReadingProgressRepository.java ← уже есть
    │   ├── UserRepository.java          ← НОВЫЙ
    │   └── SavedBookRepository.java     ← НОВЫЙ
    │
    ├── dto/
    │   ├── (book DTOs — уже есть)
    │   ├── auth/
    │   │   ├── LoginRequestDto.java     ← НОВЫЙ
    │   │   ├── RegisterRequestDto.java  ← НОВЫЙ
    │   │   └── AuthResponseDto.java     ← НОВЫЙ (токен + данные юзера)
    │   ├── user/
    │   │   ├── UserResponseDto.java     ← НОВЫЙ
    │   │   └── UserListResponseDto.java ← НОВЫЙ (для admin/readers)
    │   └── saved/
    │       └── SavedBookResponseDto.java ← НОВЫЙ
    │
    ├── controller/
    │   ├── BookController.java          ← уже есть, добавить /archive
    │   ├── AuthController.java          ← НОВЫЙ
    │   ├── UserController.java          ← НОВЫЙ
    │   ├── SavedBookController.java     ← НОВЫЙ
    │   └── ReadingProgressController.java ← НОВЫЙ
    │
    ├── service/
    │   ├── BookService.java             ← уже есть, расширить
    │   ├── AuthService.java             ← НОВЫЙ
    │   ├── UserService.java             ← НОВЫЙ
    │   ├── SavedBookService.java        ← НОВЫЙ
    │   └── ReadingProgressService.java  ← НОВЫЙ
    │
    └── exception/
        ├── GlobalExceptionHandler.java  ← уже есть, расширить
        └── ResourceNotFoundException.java ← уже есть
```

### Полный список API endpoints

#### Аутентификация — `/api/auth`

```
POST /api/auth/login
  Body: { email, password }
  Response: { token, user: { id, idNumber, name, email, role } }
  Access: Public

POST /api/auth/register
  Body: { name, email, password }
  Response: { token, user: { id, idNumber, name, email, role } }
  Access: Public

POST /api/auth/logout
  Response: 200 OK
  Access: Authenticated (просто для будущего blacklist)

GET /api/auth/me
  Response: { id, idNumber, name, email, role }
  Access: Authenticated
```

#### Книги — `/api/books` (уже частично есть)

```
GET /api/books
  Query: ?category=&search=&includeArchived=false&format=all&free=all
  Response: BookResponseDto[]
  Access: Public

GET /api/books/:id
  Response: BookDetailResponseDto (с главами)
  Access: Public

POST /api/books
  Body: CreateBookRequestDto
  Response: BookResponseDto
  Access: ADMIN ONLY

PUT /api/books/:id
  Body: UpdateBookRequestDto
  Response: BookResponseDto
  Access: ADMIN ONLY

DELETE /api/books/:id
  Response: 204 No Content
  Access: ADMIN ONLY

PATCH /api/books/:id/archive       ← НОВЫЙ
  Body: { isArchived: boolean }
  Response: BookResponseDto
  Access: ADMIN ONLY
```

#### Сохранённые книги — `/api/saved-books`

```
GET /api/saved-books
  Response: { bookIds: string[], books: BookResponseDto[] }
  Access: Authenticated (CLIENT)

POST /api/saved-books/:bookId
  Response: { bookId, savedAt }
  Access: Authenticated (CLIENT)

DELETE /api/saved-books/:bookId
  Response: 204 No Content
  Access: Authenticated (CLIENT)
```

#### Прогресс чтения — `/api/progress`

```
GET /api/progress/:bookId
  Response: { bookId, currentPage, currentAudioChapterId, currentAudioTime }
  Access: Authenticated

PUT /api/progress/:bookId
  Body: { currentPage?, currentAudioChapterId?, currentAudioTime? }
  Response: Updated progress
  Access: Authenticated
```

#### Пользователи (Admin) — `/api/admin/users`

```
GET /api/admin/users
  Query: ?role=client&search=
  Response: UserListResponseDto[]
  Access: ADMIN ONLY

DELETE /api/admin/users/:id
  Response: 204 No Content
  Access: ADMIN ONLY

PATCH /api/admin/users/:id
  Body: { name?, role? }
  Response: UserResponseDto
  Access: ADMIN ONLY
```

### Ключевые классы — код

#### User.java (новый entity)

```java
@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "id_number", length = 10, unique = true)
    private String idNumber;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "email", length = 255, nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", length = 255, nullable = false)
    private String passwordHash;

    @Column(name = "role", length = 10, nullable = false)
    @Builder.Default
    private String role = "client"; // "admin" | "client"

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
```

#### SavedBook.java (новый entity)

```java
@Entity
@Table(name = "saved_books",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "book_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SavedBook {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "saved_at")
    private OffsetDateTime savedAt;

    @PrePersist
    public void prePersist() {
        if (savedAt == null) savedAt = OffsetDateTime.now();
    }
}
```

#### SecurityConfig.java (новый)

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Публичные эндпоинты
                .requestMatchers(HttpMethod.GET, "/api/books", "/api/books/**").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
                // Только для авторизованных
                .requestMatchers("/api/saved-books/**").authenticated()
                .requestMatchers("/api/progress/**").authenticated()
                .requestMatchers("/api/auth/me").authenticated()
                // Только для admin
                .requestMatchers(HttpMethod.POST, "/api/books").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/books/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/books/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/books/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // ВАЖНО: замени на реальный URL твоего фронтенда
        config.setAllowedOrigins(List.of(
            "http://localhost:5173",
            "https://твой-юзернейм.github.io"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        return new UrlBasedCorsConfigurationSource().apply("/**", config);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

#### AuthController.java (новый)

```java
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody LoginRequestDto request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody RegisterRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> me(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(authService.getMe(userDetails.getUsername()));
    }
}
```

#### AuthService.java (новый)

```java
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthResponseDto login(LoginRequestDto dto) {
        User user = userRepository.findByEmail(dto.getEmail().trim().toLowerCase())
            .orElseThrow(() -> new BadCredentialsException("Пользователь не найден"));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Неверный пароль");
        }

        if (!user.getIsActive()) {
            throw new BadCredentialsException("Аккаунт заблокирован");
        }

        String token = jwtTokenProvider.generateToken(user);
        return AuthResponseDto.builder()
            .token(token)
            .user(toUserDto(user))
            .build();
    }

    public AuthResponseDto register(RegisterRequestDto dto) {
        String email = dto.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email уже зарегистрирован");
        }

        // Генерируем idNumber: 001XXX для клиентов
        long clientCount = userRepository.countByRole("client");
        String idNumber = formatIdNumber(1001 + clientCount);

        User user = User.builder()
            .id("user-" + UUID.randomUUID().toString().substring(0, 8))
            .idNumber(idNumber)
            .name(dto.getName().trim())
            .email(email)
            .passwordHash(passwordEncoder.encode(dto.getPassword()))
            .role("client")
            .build();

        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(user);
        return AuthResponseDto.builder()
            .token(token)
            .user(toUserDto(user))
            .build();
    }

    private String formatIdNumber(long num) {
        String str = String.format("%06d", num);
        return str.substring(0, 3) + " " + str.substring(3);
    }

    private UserResponseDto toUserDto(User user) { /* маппинг */ }
}
```

#### application-prod.yml (обновить)

```yaml
server:
  port: ${PORT:8080}

spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  flyway:
    enabled: true

jwt:
  secret: ${JWT_SECRET}         # минимум 32 символа, случайная строка
  expiration: 86400000           # 24 часа в миллисекундах

logging:
  level:
    com.tanda: INFO
```

#### build.gradle (добавить зависимости)

```gradle
// Добавить в dependencies:
implementation 'org.springframework.boot:spring-boot-starter-security'
implementation 'io.jsonwebtoken:jjwt-api:0.12.5'
runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.5'
runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.5'
```

---

## 6. Фронтенд — что и как менять

### Шаг 1: Создать API layer

Создать файл `src/lib/api.ts` — единый клиент для всех запросов:

```typescript
// src/lib/api.ts
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Перед каждым запросом — добавить JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tanda_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// При 401 — разлогинить пользователя
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tanda_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

Добавить `.env` файл:
```
VITE_API_URL=https://твой-бекенд.railway.app
```

### Шаг 2: Переписать useAuthStore.ts

**Убрать:** DEFAULT_USERS, persist middleware, saveUsersToBackend, все моки.

**Оставить:** user, isAuthenticated, role, login(), logout().

```typescript
// src/store/useAuthStore.ts (новая версия)
import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  idNumber: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('tanda_token', data.token);
      set({ user: data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password });
      localStorage.setItem('tanda_token', data.token);
      set({ user: data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('tanda_token');
    set({ user: null, isAuthenticated: false });
  },

  // Вызывать при загрузке приложения
  restoreSession: async () => {
    const token = localStorage.getItem('tanda_token');
    if (!token) return;
    try {
      const { data } = await api.get('/api/auth/me');
      set({ user: data, isAuthenticated: true });
    } catch {
      localStorage.removeItem('tanda_token');
    }
  },
}));
```

### Шаг 3: Переписать useBookStore.ts

```typescript
// src/store/useBookStore.ts (новая версия)
import { create } from 'zustand';
import { api } from '../lib/api';
import { Book } from '../types';

interface BookState {
  books: Book[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategory: string;
  formatFilter: 'all' | 'audio' | 'ebook';
  freeFilter: 'all' | 'free' | 'paid';

  fetchBooks: (params?: { includeArchived?: boolean }) => Promise<void>;
  fetchBookById: (id: string) => Promise<Book>;
  createBook: (data: Omit<Book, 'id'>) => Promise<Book>;
  updateBook: (id: string, data: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  toggleArchive: (id: string, isArchived: boolean) => Promise<void>;

  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  setFormatFilter: (f) => set({ formatFilter: f }),
  setFreeFilter: (f) => set({ freeFilter: f }),
}

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  isLoading: false,
  searchQuery: '',
  selectedCategory: 'Барлығы',
  formatFilter: 'all',
  freeFilter: 'all',

  fetchBooks: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/books', { params });
      set({ books: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBookById: async (id) => {
    const { data } = await api.get(`/api/books/${id}`);
    return data;
  },

  createBook: async (bookData) => {
    const { data } = await api.post('/api/books', bookData);
    set((state) => ({ books: [data, ...state.books] }));
    return data;
  },

  updateBook: async (id, updates) => {
    const { data } = await api.put(`/api/books/${id}`, updates);
    set((state) => ({
      books: state.books.map((b) => (b.id === id ? data : b)),
    }));
  },

  deleteBook: async (id) => {
    await api.delete(`/api/books/${id}`);
    set((state) => ({ books: state.books.filter((b) => b.id !== id) }));
  },

  toggleArchive: async (id, isArchived) => {
    const { data } = await api.patch(`/api/books/${id}/archive`, { isArchived });
    set((state) => ({
      books: state.books.map((b) => (b.id === id ? data : b)),
    }));
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  setFormatFilter: (f) => set({ formatFilter: f }),
  setFreeFilter: (f) => set({ freeFilter: f }),
}));
```

### Шаг 4: Переписать useSavedBooksStore.ts

```typescript
// src/store/useSavedBooksStore.ts (новая версия)
import { create } from 'zustand';
import { api } from '../lib/api';

interface SavedBooksState {
  savedBookIds: string[];
  isLoading: boolean;

  fetchSavedBooks: () => Promise<void>;
  toggleSavedBook: (bookId: string) => Promise<boolean>;
  isBookSaved: (bookId: string) => boolean;
}

export const useSavedBooksStore = create<SavedBooksState>((set, get) => ({
  savedBookIds: [],
  isLoading: false,

  fetchSavedBooks: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/saved-books');
      set({ savedBookIds: data.bookIds });
    } catch {
      // Если не авторизован — просто очищаем
      set({ savedBookIds: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleSavedBook: async (bookId) => {
    const isSaved = get().isBookSaved(bookId);
    if (isSaved) {
      await api.delete(`/api/saved-books/${bookId}`);
      set((state) => ({ savedBookIds: state.savedBookIds.filter((id) => id !== bookId) }));
      return false;
    } else {
      await api.post(`/api/saved-books/${bookId}`);
      set((state) => ({ savedBookIds: [...state.savedBookIds, bookId] }));
      return true;
    }
  },

  isBookSaved: (bookId) => get().savedBookIds.includes(bookId),
}));
```

### Шаг 5: Обновить main.tsx

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/routes';
import { useAuthStore } from './store/useAuthStore';
import './index.css';

// Восстанавливаем сессию при загрузке
useAuthStore.getState().restoreSession();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

### Шаг 6: Обновить Header.tsx (логин форма)

Текущий Header содержит UI для переключения между admin/client моками. Нужно заменить на реальную форму:

1. Найти в Header.tsx кнопки `loginAsAdmin()` / `loginAsClient()` 
2. Заменить на Modal с формой email + password
3. Вызывать `useAuthStore.getState().login(email, password)`
4. Добавить форму регистрации

### Шаг 7: Удалить файлы с моками

- Удалить: `src/data/initialBooks.ts`
- Удалить импорт `INITIAL_BOOKS` из useBookStore

---

## 7. Очистка localStorage

### Как очистить у текущих пользователей (миграция)

Добавить в `main.tsx` одноразовый cleanup при первом запуске новой версии:

```typescript
// src/utils/migration.ts
const MIGRATION_KEY = 'tanda_migrated_v2';

export function runMigration() {
  if (localStorage.getItem(MIGRATION_KEY)) return; // уже выполнено

  // Удаляем все старые ключи
  const keysToRemove = [
    'tanda_books_storage',
    'tanda_auth_storage',
    'tanda_saved_books_storage',
    'tanda_audio_player_state_v1',
    'tanda_users',
  ];

  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // Помечаем что миграция выполнена
  localStorage.setItem(MIGRATION_KEY, '1');

  console.log('[Tanda] localStorage очищен, переходим на серверные данные');
}
```

Вызывать в `main.tsx` до всего:

```typescript
import { runMigration } from './utils/migration';
runMigration(); // первая строка после импортов
```

### Что остаётся в localStorage после миграции

| Ключ | Что хранит | Когда |
|---|---|---|
| `tanda_token` | JWT токен | Всегда (если залогинен) |
| `tanda_migrated_v2` | Флаг миграции | Всегда |
| `tanda_audio_player_state_v1` | Состояние плеера | Оставить — это UI state, не данные |

---

## 8. Roadmap: MVP → Итерации

### Фаза 0: Подготовка (1-2 дня)

- [ ] Зарегистрироваться на Railway.app
- [ ] Создать PostgreSQL базу на Railway
- [ ] Настроить переменные окружения в Railway:
  - `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
  - `JWT_SECRET` (случайная строка 64 символа)
  - `SPRING_PROFILES_ACTIVE=prod`
- [ ] Создать bcrypt хэш для admin пароля (используй https://bcrypt-generator.com)
- [ ] Установить axios в frontend: `npm install axios`

### Фаза 1: Бекенд — Auth + Users (3-5 дней)

- [ ] Создать `V2__add_users_and_saved_books.sql`
- [ ] Создать `V3__alter_books_pages_nullable.sql`
- [ ] Создать entity `User.java` и `SavedBook.java`
- [ ] Создать `UserRepository.java` и `SavedBookRepository.java`
- [ ] Создать `JwtTokenProvider.java`
- [ ] Создать `JwtAuthFilter.java`
- [ ] Создать `UserDetailsServiceImpl.java`
- [ ] Создать `SecurityConfig.java`
- [ ] Создать `AuthController.java` + `AuthService.java`
- [ ] Создать `UserController.java` + `UserService.java`
- [ ] Обновить `GlobalExceptionHandler` — добавить обработку `BadCredentialsException`
- [ ] Обновить `BookController` — добавить `PATCH /archive`
- [ ] Тест: `POST /api/auth/register` → получаем токен
- [ ] Тест: `POST /api/auth/login` → получаем токен
- [ ] Тест: `GET /api/auth/me` с токеном → получаем данные

### Фаза 2: Бекенд — Saved Books + Progress (2-3 дня)

- [ ] Создать `SavedBookController.java` + `SavedBookService.java`
- [ ] Создать `ReadingProgressController.java` + расширить `ReadingProgressService.java`
- [ ] Тест: `POST /api/saved-books/book-id` → сохраняет книгу
- [ ] Тест: `GET /api/saved-books` → возвращает список
- [ ] Тест: `DELETE /api/saved-books/book-id` → удаляет

### Фаза 3: Фронтенд — API Layer (3-4 дня)

- [ ] Создать `src/lib/api.ts` (axios + interceptors)
- [ ] Добавить `.env` с `VITE_API_URL`
- [ ] Создать `src/utils/migration.ts`
- [ ] Переписать `useAuthStore.ts` — убрать моки
- [ ] Переписать `useBookStore.ts` — реальный API
- [ ] Переписать `useSavedBooksStore.ts` — реальный API
- [ ] Обновить `main.tsx` — restoreSession + runMigration
- [ ] Обновить `Header.tsx` — реальная форма login/register
- [ ] Удалить `src/data/initialBooks.ts`
- [ ] Тест: авторизация работает
- [ ] Тест: книги загружаются из БД
- [ ] Тест: сохранение книги синхронизируется

### Фаза 4: Admin панель (2-3 дня)

- [ ] `AdminDashboard.tsx` — заменить `useBookStore` на API вызовы
- [ ] `ReadersPage.tsx` — загружать из `GET /api/admin/users`
- [ ] `BookFormPage.tsx` — POST/PUT к реальному API
- [ ] Проверить что admin-only эндпоинты защищены (401/403 при попытке без прав)

### Фаза 5: Прогресс чтения (1-2 дня)

- [ ] `ReaderPage.tsx` — при изменении страницы вызывать `PUT /api/progress/:bookId`
- [ ] `AudioPlayerBar.tsx` — при изменении главы/времени вызывать API (с debounce 5 сек)
- [ ] `ProfilePage.tsx` — показывать реальный прогресс

### Итого по времени
**Минимальный MVP (Фазы 0-3):** ~10-14 дней одному  
**Полная версия (Фазы 0-5):** ~18-22 дня

---

## 9. Подводные камни

### 🔴 Критические (если пропустить — сломается)

**1. CORS в продакшене**
Фронт на GitHub Pages (`*.github.io`), бекенд на Railway — разные домены. Без правильного CORS всё запросы упадут с ошибкой. В `SecurityConfig` добавь точный URL твоего GitHub Pages.

**2. JWT секрет**
Если `JWT_SECRET` меняется — все текущие токены становятся невалидными и все пользователи разлогиниваются. Сгенерируй один раз и не меняй без необходимости. Минимальная длина для HS256 — 32 байта (256 бит).

**3. pages nullable в БД**
Текущая схема: `pages INT NOT NULL`. Но в фронте `pages: number | null`. Нужна миграция V3 до запуска, иначе создание audiobook (без страниц) упадёт с SQL ошибкой.

**4. HashRouter и GitHub Pages**
Фронтенд использует `createHashRouter` (URL вида `/#/catalog`). Это специально сделано для GitHub Pages. НЕ меняй на `createBrowserRouter` без настройки сервера — сломается refresh страницы.

**5. Bcrypt hash для admin**
В V2 миграции нужен реальный bcrypt hash. Не пиши пароль в открытом виде. Используй: `htpasswd -bnBC 12 "" admin123 | tr -d ':\n'` или онлайн генератор.

### 🟡 Важные (если пропустить — будут баги)

**6. Race condition при авторизации**
При загрузке страницы `restoreSession()` асинхронна. Если компонент рендерится до завершения — покажет "не авторизован". Добавь `isLoading` state и спиннер в Layout.

**7. Debounce для прогресса аудио**
Не вызывай `PUT /api/progress` при каждом изменении `currentTime` (это каждую секунду). Используй debounce на 5-10 секунд, иначе завалишь бекенд запросами.

**8. Токен в localStorage vs cookie**
localStorage уязвим к XSS. Но httpOnly cookie не работает с разными доменами (CORS). Для MVP localStorage — приемлемо. В будущем — переход на httpOnly cookie с sameSite=none + secure.

**9. Rollback при ошибке API**
В текущем useBookStore при ошибке `createBook` данные уже добавлены в Zustand (optimistic update). Нужно rollback при ошибке, иначе UI рассинхронизируется с БД.

**10. Пустая БД при первом запуске**
После деплоя бекенда БД пустая. Нужно либо мигрировать книги из `initialBooks.ts` (написать скрипт), либо вручную добавить через admin панель. Рекомендую: создать `DataSeeder.java` который запускается один раз.

### 🟢 Хорошие практики (не критично, но важно)

**11. Environment variables на фронте**
Никогда не хардкодь URL бекенда в коде. Всегда через `import.meta.env.VITE_API_URL`. В GitHub Actions добавь как secret.

**12. Error handling в stores**
Каждый `async` вызов API должен иметь try/catch и показывать toast пользователю. Не проглатывай ошибки молча.

**13. Admin route protection на фронте**
Даже если бекенд защищён, добавь проверку роли на фронте для UX. Если обычный пользователь зайдёт на `/admin` — редирект на главную.

---

## 10. Checklist по каждому файлу

### Бекенд — новые файлы создать

```
□ V2__add_users_and_saved_books.sql
□ V3__alter_books_pages_nullable.sql
□ User.java
□ SavedBook.java
□ UserRepository.java
□ SavedBookRepository.java
□ JwtTokenProvider.java
□ JwtAuthFilter.java
□ UserDetailsServiceImpl.java
□ SecurityConfig.java
□ JwtConfig.java
□ AuthController.java
□ AuthService.java
□ LoginRequestDto.java
□ RegisterRequestDto.java
□ AuthResponseDto.java
□ UserResponseDto.java
□ UserController.java
□ UserService.java
□ SavedBookController.java
□ SavedBookService.java
□ ReadingProgressController.java
```

### Бекенд — существующие файлы изменить

```
□ build.gradle — добавить spring-security, jjwt
□ application-prod.yml — JWT config, реальная БД
□ BookController.java — добавить PATCH /archive
□ BookService.java — поддержка archive
□ GlobalExceptionHandler.java — 401, 403 responses
□ DataInitializer.java — убрать или адаптировать
```

### Фронтенд — новые файлы создать

```
□ src/lib/api.ts
□ src/utils/migration.ts
□ .env (локально, не в git)
□ .env.example (в git, без секретов)
```

### Фронтенд — существующие файлы изменить

```
□ src/store/useAuthStore.ts — убрать все моки
□ src/store/useBookStore.ts — реальный API
□ src/store/useSavedBooksStore.ts — реальный API
□ src/store/useAudioPlayerStore.ts — добавить sync прогресса
□ src/main.tsx — restoreSession + runMigration
□ src/components/layout/Header.tsx — реальный login form
□ src/features/profile/ProfilePage.tsx — реальные данные
□ src/features/admin/ReadersPage.tsx — API вызовы
□ src/features/admin/AdminDashboard.tsx — API вызовы
□ src/features/admin/BookFormPage.tsx — API вызовы
□ src/features/reader/ReaderPage.tsx — прогресс API
□ package.json — добавить axios
□ vite.config.ts — proxy для локальной разработки
```

### Фронтенд — удалить

```
□ src/data/initialBooks.ts — весь файл
```

### CI/CD — обновить

```
□ .github/workflows/deploy.yml — добавить VITE_API_URL secret
```

---

## Итоговая схема взаимодействия

```
Пользователь открывает сайт
    │
    ▼
main.tsx
    ├── runMigration() → очищает старый localStorage
    └── restoreSession() → GET /api/auth/me с JWT
            │
            ├── 200 OK → user восстановлен, authenticated: true
            └── 401 → JWT нет или истёк, user: null

Пользователь нажимает "Войти"
    │
    ▼
Header.tsx (Modal) → login(email, password)
    │
    ▼
POST /api/auth/login
    │
    ├── 200 → сохраняем JWT в localStorage
    │         → set user в Zustand
    │         → fetchBooks() + fetchSavedBooks()
    └── 401 → showToast('Неверный email или пароль')

Пользователь открывает каталог
    │
    ▼
CatalogPage useEffect → fetchBooks()
    │
    ▼
GET /api/books?category=&search=
    │
    ▼
books в Zustand → рендер BookCard компонентов

Пользователь сохраняет книгу
    │
    ▼
BookCard onClick bookmark → toggleSavedBook(bookId)
    │
    ├── POST /api/saved-books/{bookId} (если не сохранена)
    └── DELETE /api/saved-books/{bookId} (если уже сохранена)
            │
            ▼
    Оптимистичное обновление Zustand
    При ошибке → rollback + toast
```

---

*Этот план охватывает полный переход от mock-данных к реальному бекенду. Следуй фазам по порядку — каждая фаза оставляет приложение рабочим. Не пытайся менять всё сразу.*
