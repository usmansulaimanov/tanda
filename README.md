# Tanda — Интеллектуалды Кітап және Аудио Платформасы 📚🎧

> **Tanda** — қазақ және әлем классикасы, заманауи әдебиет пен аудиокітаптарды оқуға және тыңдауға арналған толыққанды веб-платформа.

---

## 🚀 Архитектура және Технологиялық стек

### Backend
- **Java 17** + **Spring Boot 3.3.0**
- **Spring Security 6** (Stateless JWT HMAC-SHA256, BCrypt, RBAC)
- **Spring Data JPA** + **Hibernate** (HikariCP, PostgreSQL / H2)
- **Flyway** миграциялары (V1 - V6)
- **Google Identity Services (GIS)** OAuth2 токен верификациясы
- **Spring Boot Actuator** (Health checks, Metrics, Correlation ID via MDC)
- **Logback** (Structured console & JSON logging)

### Frontend
- **React 18** + **Vite 6** + **TypeScript 5.6**
- **Zustand 5** (Auth, Book, AudioPlayer, SavedBooks, Toast)
- **Tailwind CSS** + **Lucide React**
- **@react-oauth/google** (Google Sign-In)
- **Playwright** (End-to-End автоматтандырылған тестілеу)

---

## 🛠️ Жобаны іске қосу (Quick Start)

### Алғышарттар (Prerequisites)
- **JDK 17+**
- **Node.js 18+** және **npm**

### 1. Бэкендті іске қосу
```bash
cd backend
./gradlew bootRun
```
*Бэкенд `http://localhost:8080` портында іске қосылады.*
- Health check: `http://localhost:8080/actuator/health`
- Info: `http://localhost:8080/actuator/info`

### 2. Фронтендті іске қосу
```bash
cd frontend
npm install
npm run dev
```
*Фронтенд `http://localhost:5173` портында ашылады.*

---

## 🧪 Тестілеу (Testing Suite)

### Backend Tests (200+ Unit, Integration, RBAC, IDOR & Adversarial)
```bash
cd backend
./gradlew test
```

### Frontend E2E Tests (Playwright)
```bash
cd frontend
npm run test:e2e
```

---

## 🔐 Әдепкі логиндер (Default Credentials)

| Рөл | Email | Құпиясөз |
|---|---|---|
| **Admin** | `admin@tanda.kz` | `admin123` |
| **Reader** | `reader@tanda.kz` | `reader123` |

---

## 📂 Жоба құрылымы (Project Layout)

```
tanda site/
├── backend/                  # Spring Boot 3 қосымшасы
│   ├── src/main/java/com/tanda/
│   │   ├── config/           # Security, Web, Properties, DataInitializer
│   │   ├── controller/       # REST контроллерлері (/api/...)
│   │   ├── dto/              # Request / Response DTOs
│   │   ├── entity/           # JPA мәндері (User, Book, ReadingProgress, т.б.)
│   │   ├── exception/        # GlobalExceptionHandler
│   │   ├── repository/       # Spring Data JPA интерфейстері
│   │   ├── security/         # JwtTokenProvider, JwtAuthFilter, UserPrincipal
│   │   └── service/          # AuthService, BookService, UserService, т.б.
│   └── src/test/java/        # 200+ Unit және Интеграциялық тестілер
│
├── frontend/                 # React 18 + Vite қосымшасы
│   ├── src/
│   │   ├── app/              # Маршрутизация (HashRouter)
│   │   ├── components/       # UI және Layout компоненттері
│   │   ├── features/         # Auth, Admin, Book, Catalog, Reader, Profile
│   │   ├── lib/              # Axios API клиенті
│   │   ├── store/            # Zustand күй басқару қоймалары
│   │   └── types/            # TypeScript типтері
│   └── e2e/                  # Playwright E2E тестілері
│
└── docs/                     # Архитектуралық құжаттама және ADRs
    └── decisions/            # Архитектуралық шешімдер (ADR-001 ... ADR-004)
```
