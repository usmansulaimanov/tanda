# CONTEXT.md — Tanda Platform

> Domain knowledge, user roles, data model, and business rules.
> Read this before working on business logic or data layer changes.

---

## What is Tanda?

Tanda is a **Kazakh-language digital reading platform** that provides:

- 📚 **E-books** — PDF/EPUB content with in-browser reader and reading progress sync.
- 🎧 **Audiobooks** — Multi-chapter audio with HTTP 206 streaming, background playback, and playback rate control.
- 🆓 **Free + Premium model** — Some content is free (`is_free = true`), some requires a subscription or promo code.
- 📰 **News** — Platform announcements and literary news.
- 💬 **Messages** — Admin can send direct messages to readers.
- 🏆 **Quotes** — Readers save favorite quotes from books.

**Target audience**: Kazakh-speaking readers in Kazakhstan.
**Language**: All content and UI are in Kazakh.

---

## User Roles

| Role | Value in DB | Capabilities |
|------|-------------|--------------|
| Reader | `ROLE_USER` | Browse catalog, save books, read/listen, track progress, use promo codes, save quotes, receive messages |
| Author | `ROLE_AUTHOR` | All reader capabilities + view their own royalty stats (`/author/stats`) |
| Manager | `ROLE_MANAGER` | All reader capabilities + manage books, news, quotes, messages (limited admin) |
| Admin | `ROLE_ADMIN` | Full access: all of the above + manage users, roles, promo codes, view all stats |

> **Last-admin guard**: The system prevents the last admin from being demoted or deleted (`UserService` enforces this).

---

## Authentication Flow

```
User submits email + password (or Google ID token)
         │
         ▼
POST /api/v1/auth/login  (or /auth/google)
         │
         ├─► Returns: { token: "JWT access token", user: {...} }
         │                  (15-minute lifetime)
         │
         └─► Sets cookie: refreshToken=<opaque token>
                          HttpOnly; SameSite=Lax; Max-Age=30days
                          (SHA-256 hashed in DB)

Every API request:
  Authorization: Bearer <access token>

When access token expires (401 response):
  Frontend Axios interceptor → POST /api/v1/auth/refresh → new access token
  Concurrent 401s are queued (mutex) — only one refresh call is made

Logout:
  POST /api/v1/auth/logout → refresh token revoked in DB, cookie cleared
```

**Reuse detection**: If a refresh token that was already rotated is replayed, ALL sessions for that user are immediately revoked (compromise assumed).

---

## Data Model

### Core Entities

```
users
  id              VARCHAR(64) PK
  email           VARCHAR(255) UNIQUE NOT NULL
  password_hash   VARCHAR(255)          -- null for Google-only accounts
  name            VARCHAR(255)
  role            VARCHAR(32)           -- ROLE_USER / ROLE_AUTHOR / ROLE_MANAGER / ROLE_ADMIN
  auth_provider   VARCHAR(32)           -- LOCAL / GOOGLE
  google_id       VARCHAR(255)
  avatar_url      VARCHAR(1024)
  is_active       BOOLEAN DEFAULT TRUE
  created_at      TIMESTAMP WITH TIME ZONE

books
  id              VARCHAR(64) PK
  title           VARCHAR(255) NOT NULL
  author          VARCHAR(255) NOT NULL
  description     TEXT
  category        VARCHAR(64) NOT NULL  -- e.g., "Роман", "Тарих", "Балалар"
  pages           INT
  has_audio       BOOLEAN DEFAULT FALSE
  audio_narrator  VARCHAR(255)
  audio_duration  VARCHAR(64)
  cover_image     VARCHAR(1024)         -- path under /uploads/covers/
  is_free         BOOLEAN DEFAULT TRUE
  is_archived     BOOLEAN DEFAULT FALSE
  gradient        VARCHAR(255)          -- CSS gradient string for UI fallback
  created_at      TIMESTAMP WITH TIME ZONE

audio_chapters
  id              VARCHAR(64) PK
  book_id         VARCHAR(64) FK → books(id) ON DELETE CASCADE
  title           VARCHAR(255) NOT NULL
  audio_url       VARCHAR(1024) NOT NULL  -- path under /uploads/audio/
  duration        VARCHAR(64) NOT NULL    -- human-readable e.g. "12:34"
  chapter_order   INT NOT NULL

reading_progress
  id              VARCHAR(64) PK
  book_id         VARCHAR(64) FK → books(id) ON DELETE CASCADE
  user_id         VARCHAR(64) FK → users(id)
  current_page    INT DEFAULT 1
  current_audio_chapter_id  VARCHAR(64)
  current_audio_time        INT DEFAULT 0   -- seconds
  updated_at      TIMESTAMP WITH TIME ZONE
  UNIQUE (user_id, book_id)

saved_books
  id              VARCHAR(64) PK
  user_id         VARCHAR(64) FK → users(id)
  book_id         VARCHAR(64) FK → books(id)
  saved_at        TIMESTAMP WITH TIME ZONE
  UNIQUE (user_id, book_id)

refresh_tokens
  id              VARCHAR(64) PK
  user_id         VARCHAR(64) FK → users(id) ON DELETE CASCADE
  token_hash      VARCHAR(64) NOT NULL     -- SHA-256 hash of the opaque token
  expires_at      TIMESTAMP WITH TIME ZONE
  is_revoked      BOOLEAN DEFAULT FALSE
  created_at      TIMESTAMP WITH TIME ZONE
```

### Additional Domain Tables (Frontend-side data exists, backend may vary)

- `news` — platform articles (id, title, content, image_url, published_at, author_id)
- `quotes` — reader-saved quotes (id, user_id, book_id, text, page_number, created_at)
- `messages` — admin → reader messages (id, from_admin_id, to_user_id, content, read_at, created_at)
- `promo_codes` — batch-generated codes (id, batch_id, code, is_used, used_by_user_id, expires_at)
- `promo_batches` — promo code groups (id, name, count, created_by_admin_id, created_at)
- `royalties` — author earnings per book (id, author_id, book_id, amount, period)

---

## Media Storage

All uploaded files are stored **locally on the server** under `./uploads/`:

```
uploads/
├── covers/    # Book cover images (JPEG, PNG, WEBP — max 5 MB)
├── audio/     # Audio chapter files (MP3, M4A — max 500 MB)
└── books/     # E-book files (PDF, EPUB — max 30 MB)
```

**Filenames are always UUID-based** — the original filename is never preserved. This prevents path traversal attacks and naming conflicts.

**MIME validation** uses magic bytes (not just file extension). Allowed types per category:
- `covers`: `image/jpeg`, `image/png`, `image/webp`
- `audio`: `audio/mpeg` (MP3), `audio/mp4` (M4A)
- `books`: `application/pdf`, `application/epub+zip`

**Audio streaming**: The backend supports HTTP 206 Partial Content. Clients send `Range: bytes=X-Y` headers. This enables:
- Seeking within audio files without re-downloading
- Background playback resumption
- Progress tracking at the chapter level

---

## Business Rules

1. **Archived books** (`is_archived = true`) are hidden from public catalog. Only admins can view and restore them. Readers who saved an archived book can still access it.

2. **Free vs Premium**: `is_free = true` → visible to all authenticated users. `is_free = false` → requires a valid unused promo code to unlock, or admin/author access.

3. **Reading progress** is auto-saved every 30 seconds during reading/listening. It is also saved on `visibilitychange` (tab hidden) and `pagehide` (browser close) using `fetch({ keepalive: true })`.

4. **Promo codes** are single-use. When a reader activates a code, `is_used` is set to `true` and `used_by_user_id` is recorded.

5. **Quotes** are private to the reader who saved them (IDOR protection at query level).

6. **Messages** are one-directional: Admin/Manager → Reader. Readers cannot reply.

7. **Author stats** (`/author/stats`) show royalty data and per-book listening stats. Authors can only see their own books' stats.

---

## API Versioning

All endpoints use the prefix `/api/v1/`. This is non-negotiable — do not create endpoints outside this prefix.

Current endpoint groups:
- `/api/v1/auth/*` — Authentication (public)
- `/api/v1/books/*` — Book catalog (public GET, admin POST/PUT/DELETE)
- `/api/v1/saved-books/*` — Reader's saved books (authenticated)
- `/api/v1/progress/*` — Reading/listening progress (authenticated)
- `/api/v1/media/*` — Media streaming (authenticated)
- `/api/v1/admin/*` — Admin operations (ROLE_ADMIN only)
- `/api/v1/admin/upload` — File upload (ROLE_ADMIN)

---

## Rate Limiting (Bucket4j)

| Tier | Applies to | Limit |
|------|-----------|-------|
| Auth | `/api/v1/auth/login`, `/register`, `/google` | 10 requests / minute per IP |
| Upload | `/api/v1/admin/upload` | 30 requests / minute per IP |
| General | All other `/api/v1/*` | 300 requests / minute per IP |

Exceeding the limit returns **HTTP 429 Too Many Requests**.

---

## Observability

- **Health check**: `GET /actuator/health` — returns `{"status":"UP"}` when DB is reachable.
- **Request tracing**: Every request gets a `X-Request-ID` header (client-supplied or server-generated UUID). It is set in MDC and included in all log lines for that request.
- **Token cleanup**: A `@Scheduled` job runs daily to delete expired refresh tokens from the DB.
- **Structured logging**: Production logs are JSON (configured via `logback-spring.xml`). Development logs are human-readable colored console output.
