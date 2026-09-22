# Tanda — Полный план миграции бизнес-логики на backend

> Статус: ИНВЕНТАРИЗАЦИЯ ЗАВЕРШЕНА. Код не изменялся.
> Принцип: frontend = UI + cache. Backend = единственный источник истины. PostgreSQL = хранилище.
> Приоритет: Security > Correctness > Performance > Code Cleanliness

---

## Критерий готовности (smoke test)

После завершения всех фаз должны проходить четыре теста:

**Test 1.** Открыть DevTools → очистить localStorage полностью → перезагрузить страницу. Приложение работает через сервер.

**Test 2.** Выключить backend. Приложение показывает "Service unavailable". Не mock-данные, не localStorage-fallback.

**Test 3.** Войти под одним аккаунтом в двух браузерах. Saved books, shelf, progress, premium — одинаковые. После изменения в одном — refresh в другом показывает актуальное.

**Test 4.** Через DevTools попытаться выставить `role = admin`, `isPremium = true`, `royaltyBalance = 1000000`. Backend игнорирует это и проверяет всё сам.

---

## Инвентаризация — полный список проблем

### [CRITICAL] useAuthStore.ts (~1600 строк)

- Хранит `USERS_REGISTRY_KEY`, `getStoredUsers()`, `saveStoredUsers()`, `DEFAULT_USERS`
- Реальные demo credentials в source: `admin@tanda.kz / admin123`, `reader@tanda.kz / reader123`
- `loginAsAdmin()`, `loginAsClient()` — локальный fallback при недоступном backend
- При ошибке API login — создаёт пользователя локально и выдаёт `mock-jwt-token`
- При ошибке Google login — декодирует credential самостоятельно, выдаёт `mock-google-token`
- `createReaderByAdmin`, `updateUserByAdmin`, `toggleBlockUser`, `createManagerByAdmin`, `updateManagerPermissions`, `deleteManager`, `createAuthorByAdmin`, `updateAuthorByAdmin`, `deleteAuthor` — весь admin user CRUD работает через `getStoredUsers()` / `saveStoredUsers()`
- `checkAndSendBirthdayGreeting()` — выдаёт 30 дней Premium, создаёт сообщение, модифицирует пользователя — всё в браузере
- `sendWelcomeMessage()` — инициируется фронтендом при регистрации
- Profile update и password change проглатывают backend ошибки, возвращают `success: true`
- `RESERVED_USERNAMES_KEY`, `getStoredReservedUsernames()`, `saveStoredReservedUsernames()` — бизнес-правило в localStorage

### [CRITICAL] useBookStore.ts

- `INITIAL_BOOKS` — mock dataset, seed'ится в localStorage при первом запуске
- `tanda_deleted_books_v4` — локальный список удалённых книг
- `tanda_books_storage` / `tanda_books_initialized_v4` — локальный registry книг
- Book CRUD (create/update/delete) делает optimistic local update, затем API; при ошибке — самостоятельно логинится как `admin@tanda.kz / admin123` и повторяет запрос
- Frontend является source of truth для каталога книг

### [CRITICAL] useSavedBooksStore.ts

- Использует одновременно `savedByUser` (localStorage), `savedBookIds` и backend API
- `api.post(...).catch(() => {})` — ошибка сохранения проглатывается, UI считает книгу сохранённой
- Локальный список является source of truth, backend — вторичен

### [CRITICAL] useMyBooksStore.ts

- Полная пользовательская библиотека в localStorage (`tanda_my_books_shelf_storage_v1`)
- Хранит: `status`, `currentPage`, `progressPercent`, `lastReadAt`, `completedAt`, `shelfByUser`, `currentShelf`
- Нет HTTP-запросов — это полноценный backend substitute
- Backend API для shelf не существует

### [CRITICAL] useMessageStore.ts

- Нет HTTP-запросов вообще
- Все сообщения (системные, welcome, birthday, admin) хранятся в localStorage
- Является единственным хранилищем сообщений пользователей

### [CRITICAL] useNewsStore.ts

- Нет HTTP-запросов вообще
- `setInterval` в `NewsNotificationRunner` самостоятельно определяет момент публикации новости и создаёт сообщение
- Новости хранятся в localStorage
- Admin CRUD новостей — через localStorage

### [CRITICAL] useQuoteStore.ts

- Нет HTTP-запросов вообще
- Цитаты хранятся в localStorage
- Admin CRUD — через localStorage

### [CRITICAL] usePromoStore.ts

- Нет HTTP-запросов вообще
- Промокоды хранятся в localStorage
- Валидация промокода — на фронте
- Применение скидки — на фронте

### [CRITICAL] useRoyaltyStore.ts

- Финансовая система целиком в Zustand + localStorage (`tanda_royalty_store_v3`)
- `calculateRoyalty()`, `finalizeRoyaltyPeriod()`, `requestPayout()` — всё в браузере
- `requestPayout()` создаёт `PayoutRecord { status: completed }` локально
- `authorBalances`, `royaltyPeriods`, `payoutHistory` — в localStorage
- Пользователь контролирует финансовые данные через DevTools

### [CRITICAL] useTopAudioStore.ts

- `getDailySeedScore()` — deterministic pseudo-random генератор: `40..350 simulated listens` в день
- Production ranking аудиокниг содержит синтетические данные
- `tanda_top_audio_stats_v1` в localStorage
- Нет HTTP-запросов к backend для ranking

### [CRITICAL] useAudioPlayerStore.ts (частично)

- Отправляет `PUT /api/v1/progress/{bookId}` — это правильно
- Но: при пустом `book.audioChapters` создаёт chapter локально из `audioUrl`
- Persist'ит business audio progress в localStorage

### [CRITICAL] Admin pages

- `AdminRoyaltyTab.tsx` — читает и модифицирует `useRoyaltyStore` (localStorage)
- `AdminStatsPage.tsx` — агрегирует статистику из localStorage stores
- `ReadersPage.tsx` — user management через `useAuthStore` (localStorage)
- `AdminMessagesPage.tsx` — через `useMessageStore` (localStorage)
- `AdminNewsPage.tsx` / `AdminNewsForm.tsx` — через `useNewsStore` (localStorage)
- `AdminQuotesPage.tsx` — через `useQuoteStore` (localStorage)
- `AdminPromoPage.tsx` / `AdminPromoForm.tsx` — через `usePromoStore` (localStorage)
- `AuthorStatsPage.tsx` — читает royalty из localStorage
- `PromoCodePage.tsx` — валидирует промокод через localStorage
- `NewsPage.tsx` / `NewsDetailPage.tsx` — через `useNewsStore` (localStorage)
- `ReaderMessagesPage.tsx` — через `useMessageStore` (localStorage)
- `ReaderQuotesPage.tsx` — через `useQuoteStore` (localStorage)

### [WARNING] useAuthStore.ts — архитектурная проблема

- 1600 строк — один store содержит: auth, users registry, admin users, authors, managers, reserved usernames, birthday gifts, profile, password, Google auth, welcome messages, ID generation, phone formatting, business validation
- Требует декомпозиции даже после миграции на backend

### [WARNING] Bootstrap admin в backend

- `if ("admin@tanda.kz".equalsIgnoreCase(email) && "admin123".equals(dto.getPassword()))` — backend создаёт admin при login
- Заменить на startup provisioning через env vars

### [WARNING] API layer

- `@tanstack/react-query` установлен, используется только в `src/features/catalog/hooks/useBooks.ts`
- Остальное: Zustand + прямой Axios из stores

### [WARNING] Audio chapter generation

- Frontend создаёт audio chapter при отсутствии `book.audioChapters` — это domain logic

### [INFO] React Query не используется системно

- `QueryClientProvider` существует, но покрывает только каталог книг

---

## Backend gaps — что нужно создать

```text
[BACKEND NEEDED] News — CRUD, публикация, уведомления
[BACKEND NEEDED] Messages — системные, welcome, birthday, admin→user
[BACKEND NEEDED] Quotes — CRUD, случайная выборка
[BACKEND NEEDED] Promo codes — создание, валидация, применение, статистика
[BACKEND NEEDED] Royalty — периоды, расчёт, earnings по авторам
[BACKEND NEEDED] Payouts — запрос, approval workflow, статусы
[BACKEND NEEDED] Audio sessions / listening events — серверный tracking
[BACKEND NEEDED] Top audio ranking — агрегация по реальным событиям
[BACKEND NEEDED] Birthday rewards — scheduled job, premium entitlement, уникальность
[BACKEND NEEDED] Premium entitlements — источник истины, проверка на backend
[BACKEND NEEDED] Reserved usernames — таблица, проверка при регистрации
[BACKEND NEEDED] Author management — CRUD, привязка к книгам через author_books
[BACKEND NEEDED] Manager management — CRUD, permissions
[BACKEND NEEDED] Personal shelf (MyBooks) — статус, прогресс, история
[BACKEND NEEDED] Admin reader management — расширение существующего UserController
```

Существующие backend endpoints (переиспользовать):

```text
POST/GET    /api/v1/auth/*
GET/PATCH   /api/v1/admin/users/*
GET/POST/PUT/PATCH/DELETE /api/v1/books/*
GET/POST/DELETE /api/v1/saved-books/*
GET/PUT     /api/v1/progress/*
POST        /api/v1/admin/upload
```

---

## Data ownership — финальная граница

| Данные | Frontend | Backend | DB |
|---|---|---|---|
| Modal / sidebar open | SOURCE | — | — |
| Search input | SOURCE | — | — |
| Filters / sort UI | SOURCE | — | — |
| Audio play/pause/seek | SOURCE | — | — |
| Volume / playback rate | SOURCE | — | — |
| Sleep timer | SOURCE | — | — |
| Books | CACHE | SOURCE | SOURCE |
| Current user | CACHE | SOURCE | SOURCE |
| Roles / permissions | DISPLAY | SOURCE | SOURCE |
| Saved books | CACHE | SOURCE | SOURCE |
| Personal shelf | CACHE | SOURCE | SOURCE |
| Reading progress | CACHE | SOURCE | SOURCE |
| Audio progress | CACHE | SOURCE | SOURCE |
| Audio statistics | — | SOURCE | SOURCE |
| Top audio ranking | — | SOURCE | SOURCE |
| Premium | DISPLAY | SOURCE | SOURCE |
| Birthday gift | — | SOURCE | SOURCE |
| Messages | CACHE | SOURCE | SOURCE |
| News | CACHE | SOURCE | SOURCE |
| Quotes | CACHE | SOURCE | SOURCE |
| Promo codes | — | SOURCE | SOURCE |
| Authors | CACHE | SOURCE | SOURCE |
| Managers | CACHE | SOURCE | SOURCE |
| Reserved usernames | — | SOURCE | SOURCE |
| Royalty | — | SOURCE | SOURCE |
| Payouts | — | SOURCE | SOURCE |

---

## Целевая схема БД

```sql
-- Core
users
roles
refresh_tokens

-- Books
books
audio_chapters
author_books          -- author_id, book_id, royalty_share

-- Library
saved_books
user_books            -- shelf: reading/completed/want_to_read, current_page, progress_percent, timestamps

-- Audio
audio_sessions        -- user_id, book_id, chapter_id, started_at
audio_listen_events   -- session_id, position, duration_seconds, recorded_at
audio_daily_stats     -- book_id, date, listen_count, total_seconds, unique_listeners

-- Content
messages              -- sender_id, recipient_id, type, content, read_at
news                  -- title, content, published_at, author_id
quotes                -- text, author, active

-- Commerce
promo_codes           -- code, discount_percent, max_uses, used_count, expires_at
promo_uses            -- promo_code_id, user_id, used_at
subscriptions
premium_entitlements  -- user_id, source, starts_at, expires_at, granted_by

-- Authors / Finance
authors               -- user_id, display_name, bio
royalty_periods       -- month, status: DRAFT/CALCULATED/FINALIZED
royalty_earnings      -- period_id, author_id, book_id, minutes_listened, amount, status
payout_requests       -- author_id, amount, status: REQUESTED/PROCESSING/COMPLETED/FAILED
payout_transactions   -- payout_request_id, processed_at, reference

-- System
reserved_usernames    -- username, created_by, created_at
birthday_gifts        -- user_id, gift_year, gift_type (UNIQUE constraint)
audit_logs
```

---

## Декомпозиция useAuthStore (после миграции)

```text
useSessionStore       — auth state, current user, JWT
useProfileStore       — profile edit UI state
useAdminUsersStore    — admin user management UI (читает backend)
useAuthorStore        — author UI state (читает backend)
useManagerStore       — manager UI state (читает backend)
```

Бизнес-правила — только backend.

---

## Phase 1 — Уничтожить mock infrastructure [CRITICAL]

**Цель:** убрать всё, что позволяет приложению работать без backend.

### 1.1 useAuthStore.ts

Удалить полностью:
- `USERS_REGISTRY_KEY`, `getStoredUsers()`, `saveStoredUsers()`
- `DEFAULT_USERS`, `loginAsAdmin()`, `loginAsClient()`
- `mock-jwt-token`, `mock-google-token`
- localStorage fallback в `login()` — при ошибке API только `throw`, никакого local user
- localStorage fallback в Google login — при ошибке API только `throw`
- `checkAndSendBirthdayGreeting()` — удалить полностью, логика переедет в backend scheduled job
- `sendWelcomeMessage()` — удалить, backend создаёт welcome message при регистрации
- `RESERVED_USERNAMES_KEY`, `getStoredReservedUsernames()`, `saveStoredReservedUsernames()`
- Весь admin user CRUD через localStorage: `createReaderByAdmin`, `createAuthorByAdmin`, `createManagerByAdmin` и все Update/Delete варианты

Исправить:
- `login()`: `POST /api/v1/auth/login` → success → session; 401 → error; unavailable → error. Третьего сценария нет.
- `updateProfile()`: сначала `PATCH /api/v1/auth/profile` → success → обновить Zustand; ошибка → Zustand не меняем
- `changePassword()`: сначала `PUT /api/v1/auth/password` → success → done; ошибка → показать ошибку пользователю

### 1.2 useBookStore.ts

Удалить:
- `INITIAL_BOOKS` и весь импорт из `src/data/initialBooks`
- `tanda_deleted_books_v4` localStorage key
- `tanda_books_storage`, `tanda_books_initialized_v4`
- Fallback retry с `admin@tanda.kz / admin123` при ошибках CRUD

Исправить Book CRUD flow:
```
UI → POST/PUT/DELETE /api/v1/books → success → Zustand update → UI
                                    ↓ error → UI остаётся прежним
```

### 1.3 useSavedBooksStore.ts

Удалить:
- `savedByUser` localStorage map
- Локальный список как primary state

Исправить:
```
POST /api/v1/saved-books/{id}
  → 201 → Zustand update
  → 401 → logout
  → 409 → already saved
  → 4xx/5xx → UI error, state unchanged (не проглатывать)
```

### 1.4 useTopAudioStore.ts

Удалить полностью:
- `getDailySeedScore()`
- `simulated listens (40..350)`
- `tanda_top_audio_stats_v1`
- Весь store если он используется только для synthetic ranking

Заменить: `GET /api/v1/books/top-audio` (создать в Phase 5).

### 1.5 Удалить из localStorage

```text
tanda_auth_storage_v1
tanda_users_registry_v1
tanda_books_storage
tanda_deleted_books_v4
tanda_books_initialized_v4
tanda_saved_books_storage
tanda_my_books_shelf_storage_v1
tanda_top_audio_stats_v1
tanda_royalty_store_v3
```

### 1.6 Backend — удалить admin bootstrap при login

```java
// Удалить этот блок:
if ("admin@tanda.kz".equalsIgnoreCase(email) && "admin123".equals(dto.getPassword())) { ... }
```

Заменить на startup provisioning:

```java
@Component
public class AdminBootstrap implements ApplicationRunner {
    public void run(ApplicationArguments args) {
        if (!userRepository.existsByEmail(adminEmail)) {
            // создать admin из env vars ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD
            // пометить requirePasswordChange = true
        }
    }
}
```

**Тест Phase 1:** очистить localStorage, перезагрузить — приложение идёт в backend или показывает ошибку.

---

## Phase 2 — Auth & Users на backend [CRITICAL]

### Backend

Endpoint'ы уже существуют для auth. Добавить/расширить:

```
POST   /api/v1/admin/users              — создание reader/author/manager
PATCH  /api/v1/admin/users/{id}         — update
DELETE /api/v1/admin/users/{id}         — удаление
PATCH  /api/v1/admin/users/{id}/block   — блокировка
GET    /api/v1/admin/users/authors      — список авторов
POST   /api/v1/admin/authors            — создание автора
PATCH  /api/v1/admin/authors/{id}
DELETE /api/v1/admin/authors/{id}
GET    /api/v1/admin/users/managers
POST   /api/v1/admin/managers
PATCH  /api/v1/admin/managers/{id}/permissions
DELETE /api/v1/admin/managers/{id}
GET    /api/v1/admin/usernames/reserved
POST   /api/v1/admin/usernames/reserved
DELETE /api/v1/admin/usernames/reserved/{username}
```

Таблицы: `authors`, `reserved_usernames`, расширить `users`.

Проверка reserved username — в `AuthService.register()`, до создания пользователя.

### Frontend

- `ReadersPage.tsx`, `AdminPage.tsx` → вызывают новые endpoints
- `useAdminUsersStore` → только UI state, данные через React Query
- Удалить весь localStorage user management из `useAuthStore`

---

## Phase 3 — Library (Saved Books + Personal Shelf) [CRITICAL]

### Backend

Saved books API уже есть (`/api/v1/saved-books/*`). Добавить Personal Shelf:

```
GET    /api/v1/me/books                  — вся полка пользователя
GET    /api/v1/me/books/{bookId}         — статус конкретной книги
POST   /api/v1/me/books/{bookId}         — добавить на полку
PATCH  /api/v1/me/books/{bookId}         — обновить статус / прогресс страниц
DELETE /api/v1/me/books/{bookId}         — убрать с полки
```

Таблица `user_books`:
```sql
id, user_id, book_id, status, current_page, total_pages,
progress_percent, added_at, last_read_at, completed_at, updated_at
```

### Frontend

- `useMyBooksStore` — удалить весь persist, localStorage, бизнес-логику
- Оставить только UI state (selectedShelf, activeFilter)
- Данные — через React Query hooks на новые endpoints
- `tanda_my_books_shelf_storage_v1` — удалить

---

## Phase 4 — Reading & Audio Progress [CRITICAL]

### Backend

Reading progress API уже существует (`/api/v1/progress/*`). Добавить audio sessions:

```
POST   /api/v1/audio/sessions            — начать сессию прослушивания
POST   /api/v1/audio/sessions/{id}/heartbeat  — position updates (каждые 10-30 сек)
PATCH  /api/v1/audio/sessions/{id}/end   — завершить сессию
```

Backend сам вычисляет valid listening duration — не доверять клиенту сумму секунд.

```sql
audio_sessions: id, user_id, book_id, chapter_id, started_at, ended_at, valid_seconds
audio_listen_events: session_id, position, recorded_at
```

Если у книги есть `audio_url` но нет chapters — backend создаёт дефолтный chapter. Не фронт.

### Frontend

- `useAudioPlayerStore`: оставить `isPlaying`, `volume`, `playbackRate`, `currentPosition`, `sleepTimer`
- Удалить: business audio progress persist, localStorage audio state
- `PUT /api/v1/progress/{bookId}` уже есть — оставить
- Добавить вызовы audio session endpoints
- Удалить: локальное создание audio chapters

---

## Phase 5 — Audio Analytics & Ranking [CRITICAL]

### Backend

```
GET    /api/v1/books/top-audio           — ranking по реальным событиям
GET    /api/v1/admin/stats/audio         — статистика для admin
```

Агрегация на SQL:
```sql
SELECT book_id,
       COUNT(*) as listen_count,
       SUM(valid_seconds) as total_seconds,
       COUNT(DISTINCT user_id) as unique_listeners
FROM audio_sessions
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY book_id
ORDER BY listen_count DESC
LIMIT 20;
```

Таблица `audio_daily_stats` для кэширования агрегатов (обновлять scheduled job раз в час).

### Frontend

- `useTopAudioStore` — удалить полностью
- `AdminStatsPage.tsx` — данные через `GET /api/v1/admin/stats/audio`
- `AuthorStatsPage.tsx` — данные через `GET /api/v1/authors/me/stats`

---

## Phase 6 — Content: News, Messages, Quotes [CRITICAL]

### Backend

```
GET    /api/v1/news                      — список новостей
GET    /api/v1/news/{id}
POST   /api/v1/admin/news
PATCH  /api/v1/admin/news/{id}
DELETE /api/v1/admin/news/{id}

GET    /api/v1/me/messages               — сообщения текущего пользователя
PATCH  /api/v1/me/messages/{id}/read

GET    /api/v1/quotes/random             — случайная цитата
GET    /api/v1/admin/quotes
POST   /api/v1/admin/quotes
PATCH  /api/v1/admin/quotes/{id}
DELETE /api/v1/admin/quotes/{id}
```

Welcome message — создаётся в `AuthService.register()` в той же транзакции.

`NewsNotificationRunner` — удалить с фронтенда. Уведомления о новостях — backend scheduled job или WebSocket push.

```sql
messages: id, sender_id, recipient_id, type, content, read_at, created_at
news: id, title, content, published_at, author_id, created_at
quotes: id, text, author, active, created_at
```

### Frontend

- `useMessageStore`, `useNewsStore`, `useQuoteStore` — удалить весь persist и локальную логику
- Заменить на React Query hooks
- `NewsNotificationRunner` — удалить или переделать в polling/WebSocket subscriber
- Admin pages — данные через новые endpoints

---

## Phase 7 — Promo Codes [CRITICAL]

### Backend

```
GET    /api/v1/admin/promo-codes
POST   /api/v1/admin/promo-codes
PATCH  /api/v1/admin/promo-codes/{id}
DELETE /api/v1/admin/promo-codes/{id}
POST   /api/v1/promo-codes/validate      — проверка кода (возвращает discount info)
POST   /api/v1/promo-codes/apply         — применение к подписке
```

Validation на backend, не на фронте. Frontend может показывать предварительный UI, но применение — только через API.

```sql
promo_codes: id, code, discount_percent, max_uses, used_count, expires_at, active
promo_uses: id, promo_code_id, user_id, used_at
```

Ограничение: один промокод — один раз на пользователя (UNIQUE constraint на `user_id, promo_code_id`).

### Frontend

- `usePromoStore` — удалить полностью
- `PromoCodePage.tsx` — вызов `POST /api/v1/promo-codes/validate`, затем `apply`
- `AdminPromoPage.tsx` / `AdminPromoForm.tsx` — данные через новые endpoints

---

## Phase 8 — Premium & Birthday [CRITICAL]

### Backend

Scheduled job (cron `0 9 * * *`):
```
find users where birthday = today AND NOT EXISTS (
  SELECT 1 FROM birthday_gifts
  WHERE user_id = u.id AND gift_year = YEAR(NOW()) AND gift_type = 'PREMIUM_30'
)
→ create premium_entitlement (30 дней)
→ insert birthday_gifts (UNIQUE constraint — защита от дублирования)
→ create message "С днём рождения!"
```

```sql
premium_entitlements: id, user_id, source, starts_at, expires_at, granted_by
birthday_gifts: id, user_id, gift_year, gift_type (UNIQUE: user_id, gift_year, gift_type)
```

Premium check — только на backend. Frontend получает `isPremium: boolean` из `/api/v1/auth/me`.

```
GET /api/v1/admin/premium              — управление premium пользователями
POST /api/v1/admin/premium/{userId}    — выдать premium вручную
```

### Frontend

- `checkAndSendBirthdayGreeting()` — удалить полностью
- Premium state — только из `/api/v1/auth/me`, никаких локальных вычислений

---

## Phase 9 — Royalty & Payouts [CRITICAL]

Это самая критичная фаза. Финансовый расчёт нельзя держать нигде кроме backend.

### Backend

```
GET    /api/v1/admin/royalty/periods
POST   /api/v1/admin/royalty/periods/{month}/calculate   — расчёт за месяц
POST   /api/v1/admin/royalty/periods/{month}/finalize    — финализация (идемпотентна)
GET    /api/v1/admin/royalty/periods/{month}/earnings    — по авторам

GET    /api/v1/authors/me/earnings      — заработок текущего автора
GET    /api/v1/authors/me/stats         — статистика прослушиваний
POST   /api/v1/authors/me/payouts       — запрос на выплату
GET    /api/v1/authors/me/payouts       — история выплат

GET    /api/v1/admin/payouts            — все запросы на выплату
PATCH  /api/v1/admin/payouts/{id}/approve
PATCH  /api/v1/admin/payouts/{id}/reject
```

Royalty calculation flow:
```
POST /royalty/periods/{month}/calculate
  → RoyaltyService.calculate()
  → читает audio_daily_stats за месяц
  → считает earnings по author_books.royalty_share
  → persist royalty_earnings (status: CALCULATED)
  → period status = CALCULATED

POST /royalty/periods/{month}/finalize
  → проверить period.status = CALCULATED
  → обновить author balances
  → period status = FINALIZED
  → повторный вызов → 409 ALREADY_FINALIZED
```

Payout flow:
```
POST /authors/me/payouts
  → status = REQUESTED

Admin: PATCH /admin/payouts/{id}/approve
  → status = PROCESSING

Scheduled job / manual:
  → status = COMPLETED или FAILED
```

```sql
royalty_periods: id, month, status, calculated_at, finalized_at
royalty_earnings: id, period_id, author_id, book_id, minutes_listened, amount, status
payout_requests: id, author_id, amount, status, requested_at, processed_at
payout_transactions: id, payout_request_id, reference, processed_at
```

Author-Book relationship:
```sql
author_books: author_id, book_id, royalty_share (NOT string matching по имени)
```

### Frontend

- `useRoyaltyStore` — удалить полностью
- `tanda_royalty_store_v3` — удалить
- `AdminRoyaltyTab.tsx` — данные через новые endpoints
- `AuthorStatsPage.tsx` — данные через `/api/v1/authors/me/stats` и `/earnings`

---

## Phase 10 — Cleanup [INFO]

### 10.1 Удалить из localStorage все business keys

```text
tanda_auth_storage_v1
tanda_users_registry_v1
tanda_books_storage
tanda_deleted_books_v4
tanda_books_initialized_v4
tanda_saved_books_storage
tanda_my_books_shelf_storage_v1
tanda_top_audio_stats_v1
tanda_royalty_store_v3
```

Оставить максимум: `tanda_access_token` (если не перешли на HttpOnly cookie).

### 10.2 Унифицировать API layer

```typescript
// apiClient.ts
const apiClient = axios.create({ baseURL: '/api/v1' });

apiClient.interceptors.request.use(attachAccessToken);
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await tryRefreshToken();
      return apiClient.request(error.config); // retry once
    }
    return Promise.reject(normalizeError(error));
  }
);
```

Удалить пустые `catch {}` во всех mutation функциях.

### 10.3 Декомпозировать useAuthStore

```typescript
useSessionStore    — { user, accessToken, login(), logout(), refresh() }
useProfileStore    — { isEditing, formState }
```

Admin stores — только UI state, данные через React Query.

### 10.4 Перевести всё на React Query

React Query уже установлен. Использовать для всех серверных данных:

```typescript
useQuery(['books', 'top-audio'], fetchTopAudio)
useQuery(['me', 'messages'], fetchMessages)
useMutation({ mutationFn: applyPromo, onSuccess: invalidate(['me']) })
```

Zustand остаётся для: modal state, player runtime, form state, активные UI фильтры.

---

## Что НЕ трогать

```text
TIMER_OPTIONS, SPEED_OPTIONS          — UI константы плеера
Месяцы / дни недели                  — display constants
Footer social links                   — статика
Default avatar/image assets           — статика
CSS gradients                         — стили
setTimeout в анимациях и тостах       — UI поведение
Audio sleep timer                     — runtime UI state
Carousel timers                       — UI
YouTube iframe loader                 — UI
UI pagination state                   — локальный UI
Modal / search / filter state         — локальный UI
```

---

## Итог

```text
Фаз всего: 10
[CRITICAL] фаз: 9
[WARNING] фаз: 1

Backend endpoints создать: ~45 новых
Таблицы создать: ~15 новых
Frontend stores зачистить полностью: 6 (messages, news, quotes, promo, royalty, topAudio)
Frontend stores частично переработать: 4 (auth, books, savedBooks, myBooks)
localStorage keys удалить: 10
```

Целевое состояние:

```
React / Zustand (UI + cache)
          |
          | REST
          v
   Spring Boot Backend
          |
          v
      PostgreSQL (источник истины)
```
