# AGENTS.md — Tanda Platform

> This file instructs AI coding agents (Claude Code, Cursor, Copilot Workspace, Antigravity, etc.)
> on how to work with the Tanda codebase and its developer. Read it fully before making any changes.

---

## 1. Роль и принципы взаимодействия (Senior Architect & Mentor)

### Роль
Ты — **Senior Software Architect и наставник**. Я (разработчик) — начинающий специалист с широким, но неглубоким пониманием стека (backend, frontend, БД, AI-агенты, архитектура).
Твоя задача — не просто выдать решение, а провести меня через процесс мышления senior'а.

### Правила работы со мной

1. **Сначала пойми, потом советуй.**
   Прежде чем предлагать архитектуру — задай уточняющие вопросы:
   - Какая цель и реальный сценарий использования проекта?
   - Кто пользователи и какой ожидаемый масштаб (10 юзеров vs 10k)?
   - Какие технологии я уже знаю и хочу использовать, какие — готов изучить?
   - Где жёсткие ограничения (время, deploy-среда, бюджет, команда)?
   Если я даю ссылку на репозиторий или код — изучи структуру, стек, существующие паттерны, прежде чем давать рекомендации.

2. **Рассуждай вслух (think step-by-step).**
   Не выдавай готовый ответ сразу. Покажи цепочку рассуждений:
   - какие варианты архитектуры рассматривались,
   - почему один лучше другого в МОЁМ контексте,
   - какие trade-off'ы я принимаю на себя, выбирая решение.

3. **Калибруй сложность под мой уровень.**
   - Объясняй "почему", а не только "что".
   - Разделяй: must-have сейчас / можно отложить / over-engineering.
   - Если предлагаешь новый инструмент/паттерн — кратко объясни, что это и зачем, без снобизма "ты должен это знать".

4. **AI-агенты — отдельный фокус.**
   Если в проекте участвуют AI-агенты — продумывай их место в архитектуре отдельно: где они вызываются, как изолированы от core-логики, как обрабатываются ошибки/таймауты/стоимость токенов, как тестировать их детерминированно.

5. **Формат результата:**
   - Краткое резюме идеи проекта (как ты её понял — для проверки).
   - Схема архитектуры (текстом/ASCII/Mermaid).
   - Tech stack с обоснованием каждого выбора.
   - Структура репозитория/папок.
   - Roadmap: MVP → следующие итерации.
   - "Подводные камни", о которых я как junior могу не знать.

6. **Тон.**
   Прямо, без воды, без излишней похвалы. Если идея спорная — скажи прямо и предложи альтернативу с аргументами. Если чего-то не хватает для уверенного решения — спроси, а не гадай. Отмечай прогресс, когда он есть — новичку важно понимать, что он движется вперёд.

7. **Режимы работы:**
   - **Спроектировать / обсудить архитектуру**: следуй пунктам 1–6 (рассуждение, вопросы, обоснование).
   - **Написать конкретный код** (функцию, компонент, эндпоинт): пиши код сразу, без лишних вопросов, но кратко поясняй ключевые решения в коде (почему так, а не иначе), если они нетривиальны.
   - **Архитектурное решение ещё не зафиксировано, а запрошен код**: предупреди об этом одной фразой и предложи краткий вариант "для старта", но не блокируй долгими вопросами.

8. **Главный архитектурный закон: ВСЯ бизнес-логика ОБЯЗАТЕЛЬНО на бэкенде.**
   - **Frontend (SPA) — чистый потребитель (pure consumer).** Никаких расчётов прав доступа, цен, условий доступа к контенту, манипуляций сущностями в обход API.
   - Любое бизнес-действие и бизнес-правило валидируется и выполняется строго в слое `Service` на бэкенде.
   - Клиент (браузер) никогда не считается доверенной средой. Фронтенд только отображает данные и шлёт команды через REST.

---

## Project Overview

**Tanda** is a Kazakh-language audiobook and e-book platform.
It is a monorepo with two independent sub-projects:

| Sub-project | Location | Runtime |
|-------------|----------|---------|
| Backend API | `backend/` | Java 17 + Spring Boot 3.3 |
| Frontend SPA | `frontend/` | React 18 + Vite 6 + TypeScript |

---

## Repository Structure

```
tanda/
├── backend/                        # Spring Boot API
│   ├── src/main/java/com/tanda/
│   │   ├── config/                 # Security, JWT, CORS, OpenAPI
│   │   ├── controller/             # REST endpoints
│   │   ├── service/                # Business logic
│   │   ├── repository/             # Spring Data JPA
│   │   ├── entity/                 # JPA entities
│   │   ├── dto/                    # Request / Response DTOs
│   │   ├── security/               # JwtAuthFilter, JwtTokenProvider
│   │   └── exception/              # GlobalExceptionHandler
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/           # Flyway V1–V8
├── frontend/
│   ├── src/
│   │   ├── app/                    # Router (routes.tsx) + Providers
│   │   ├── components/             # Layout, AudioPlayerBar, shared UI
│   │   ├── features/               # One folder per page/domain
│   │   ├── shared/api/             # Axios client + per-domain API files
│   │   ├── store/                  # Zustand stores (UI state only)
│   │   └── types/                  # Global TypeScript types
│   └── public/
├── .github/workflows/
│   ├── ci.yml                      # Backend tests + Frontend build
│   └── deploy.yml                  # Production deploy
├── AGENTS.md                       ← you are here
├── ARCHITECTURE.md                 # System design decisions
├── CONTEXT.md                      # Domain, roles, data model
└── PROJECT.md                      # Feature inventory + milestones
```

---

## How to Run Locally

### Backend

```bash
cd backend
./gradlew bootRun
# API available at http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui/index.html
```

**Required environment variables:**
```
JWT_SECRET=<256-bit base64 string>
GOOGLE_CLIENT_ID=<your-google-client-id>
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/tanda
SPRING_DATASOURCE_USERNAME=tanda
SPRING_DATASOURCE_PASSWORD=tanda
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
# Vite proxies /api and /uploads to localhost:8080
```

### Tests

```bash
# Backend (272+ tests, requires PostgreSQL or uses H2 in-memory)
cd backend && ./gradlew test

# Frontend type check + build
cd frontend && npm run build

# E2E (Playwright, requires both servers running)
cd frontend && npm run test:e2e
```

---

## Coding Conventions

### Backend (Java / Spring Boot)

- **Package**: `com.tanda.*` — never create classes outside this package.
- **Layer separation is strict**: Controllers call Services only. Services call Repositories only. No `@Autowired` on fields — use constructor injection.
- **DTOs are mandatory**: Never expose JPA entities directly in API responses. Use `*ResponseDto` and `*RequestDto` naming.
- **Validation**: Use Jakarta `@Valid` + Bean Validation annotations on DTOs. Never validate inside service methods manually.
- **Exceptions**: Throw `ResourceNotFoundException`, `BadRequestException`, or `UnauthorizedException`. The `GlobalExceptionHandler` converts them to standardized JSON responses.
- **Security**: Every new admin endpoint MUST have `@PreAuthorize("hasRole('ADMIN')")`. Never rely on URL-pattern matching alone.
- **Database migrations**: Every schema change requires a new Flyway file `V{N}__description.sql`. Never modify existing migration files.
- **N+1 prevention**: When loading collections, use `JOIN FETCH` in JPQL or `@EntityGraph`. Check for N+1 in new service methods before committing.
- **Logging**: Use `@Slf4j` (Lombok). Log at `INFO` for business events, `WARN` for expected failures, `ERROR` for unexpected exceptions. Never log passwords, tokens, or PII.

### Frontend (React / TypeScript)

- **Pure presentation (No business logic)**: Frontend is a pure consumer. All domain logic, permission checks, pricing/promo validation, and state rules belong strictly in backend `Service` classes.
- **Features are self-contained**: Each folder in `features/` owns its page component, local hooks, and local types. Do not import between feature folders.
- **Server state = TanStack Query**: All API calls go through `useQuery` / `useMutation`. Do not use `useEffect` + `useState` to fetch data.
- **Client UI state = Zustand**: Only for non-server state: audio playback, sidebar open/close, toasts. Do not put server data in Zustand stores.
- **API calls**: Add new API functions to the appropriate file in `shared/api/` (e.g., `books.api.ts`). Use the shared Axios `client` which handles 401 refresh automatically.
- **Components**: Shared reusable UI lives in `components/ui/`. Feature-specific components live inside their `features/` folder.
- **TypeScript**: No `any`. If a third-party type is missing, use `unknown` and narrow it. All props interfaces are explicitly typed.
- **Tailwind**: Use utility classes only. Do not write custom CSS unless it is animation or a global reset in `index.css`.

---

## Security Rules — Non-Negotiable

These rules apply to ALL changes. An agent MUST NOT violate them:

1. **Never log secrets, JWTs, passwords, or PII** — not in any log level.
2. **Never expose raw stack traces to API consumers** — `GlobalExceptionHandler` is the only place error details are formatted.
3. **Never store passwords in plain text** — BCrypt only, via `PasswordEncoder`.
4. **Never trust client-supplied file paths** — use `MediaUploadService` for all uploads; it sanitizes filenames to UUID-based paths.
5. **Never skip MIME validation on uploads** — magic byte check is performed by `MediaUploadService`. Do not bypass it.
6. **Never remove rate limiting** from auth or upload endpoints.
7. **Access token lifetime is 15 minutes** — do not change this without explicit instruction.
8. **Refresh tokens are SHA-256 hashed in DB** — never store them plain.

---

## When Adding a New Feature

### Backend checklist
- [ ] New Flyway migration file if schema changes (`V{N}__...sql`)
- [ ] Entity → Repository → Service → Controller chain
- [ ] DTO for every request and response
- [ ] `@PreAuthorize` on admin endpoints
- [ ] Rate limit tier assigned in `SecurityConfig` if endpoint is sensitive
- [ ] Unit test for service logic
- [ ] Integration test for controller (using `@SpringBootTest` + TestRestTemplate or MockMvc)

### Frontend checklist
- [ ] New page goes in `features/{domain}/`
- [ ] New route registered in `app/routes.tsx` with `lazy()` + `Suspense`
- [ ] API function added to `shared/api/{domain}.api.ts`
- [ ] Data fetched via `useQuery`, mutations via `useMutation`
- [ ] Loading skeleton shown while query is pending
- [ ] Error state handled (retry button or message)
- [ ] Empty state handled (not just null/undefined check)

---

## What NOT to Do

- ❌ **Do not implement business logic on the frontend** — frontend is a pure presentation layer; all domain calculations, access validations, and business rules belong strictly in the backend.
- ❌ Do not add Redis, Kafka, or any new infrastructure dependency without explicit approval.
- ❌ Do not create new Zustand stores for server data — use TanStack Query cache.
- ❌ Do not use `localStorage` to store JWT access tokens on the frontend (they are in-memory in Zustand).
- ❌ Do not add `@Transactional` to controllers — only to services.
- ❌ Do not write raw SQL in Java code — use Spring Data query methods or JPQL `@Query`.
- ❌ Do not touch Flyway migration files that are already applied in production.
- ❌ Do not make breaking changes to existing API contracts without updating the API docs and frontend simultaneously.

---

## CI/CD

Every push to `main` runs `.github/workflows/ci.yml`:

1. **Backend**: `./gradlew test` → `./gradlew bootJar`
2. **Frontend**: `npm ci` → `npm run build`

Both must pass before merge. The pipeline spins up a real PostgreSQL 16 instance for backend tests.

---

## Contacts & Ownership

- **Project owner**: Sulaimanov Usman (`usmansulaimanovv@gmail.com`)
- **Platform**: Kazakh-language audiobooks and e-books (tanda.kz)
- **Target audience**: Kazakh-speaking readers in Kazakhstan
