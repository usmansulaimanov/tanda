# ARCHITECTURE.md — Tanda Platform

> System design decisions, component diagrams, and architectural trade-offs.
> Read this before proposing new infrastructure or changing data flow.

---

## Core Principles

1. **KISS over over-engineering.** One backend service. One database. No message queues, no caches, no service mesh — unless a real bottleneck is measured.
2. **Security by default.** Every layer has defense-in-depth: JWT expiry, refresh rotation, rate limiting, input sanitization, MIME validation, row-level isolation.
3. **Frontend is a pure consumer.** The SPA talks to the backend via REST only. It holds no business logic, no secrets.
4. **Local file storage for now.** Object storage (S3-compatible) is the natural next step when the platform scales, but local is zero-cost and sufficient for early stage.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   USER'S BROWSER / DEVICE                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          React 18 SPA (Vite 6 + TypeScript)         │   │
│  │                                                     │   │
│  │  TanStack Query   ─── server state (books, user)   │   │
│  │  Zustand stores   ─── UI state (player, sidebar)   │   │
│  │  Axios client     ─── HTTP + 401 refresh mutex     │   │
│  └──────────────────────────┬──────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTPS
                              │ REST JSON  /api/v1/*
                              │ Bearer token + HttpOnly cookie
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Spring Boot 3.3 — Single Service               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Security Filter Chain                               │  │
│  │  JwtAuthFilter → rate limiter → MDC X-Request-ID    │  │
│  └──────────────────────────┬─────────────────────────┘   │
│                              │                              │
│  ┌───────────────┐  ┌────────▼────────┐  ┌─────────────┐  │
│  │ AuthController│  │ BookController  │  │MediaController│  │
│  │ /auth/*       │  │ /books/*        │  │ /media/*    │  │
│  └───────┬───────┘  └────────┬────────┘  └──────┬──────┘  │
│  ┌───────▼───────┐  ┌────────▼────────┐  ┌──────▼──────┐  │
│  │ AuthService   │  │ BookService     │  │MediaUpload  │  │
│  │ RefreshToken  │  │ ProgressService │  │Service      │  │
│  │ Service       │  │ SavedBookService│  │             │  │
│  └───────┬───────┘  └────────┬────────┘  └──────┬──────┘  │
│  ┌───────▼──────────────────▼──────────────────▼──────┐   │
│  │             Spring Data JPA Repositories            │   │
│  └───────────────────────────┬─────────────────────────┘   │
│                              │ HikariCP JDBC pool          │
│  ┌───────────────────────────▼─────────────────────────┐   │
│  │                      PostgreSQL 16                  │   │
│  │  users · books · audio_chapters · saved_books       │   │
│  │  reading_progress · refresh_tokens · …              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Local File System  ./uploads/{covers,audio,books}  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Architecture

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │ POST /login   │               │ POST /refresh
           ▼               │               ▼
    ┌──────────────┐       │    ┌────────────────────────┐
    │ AuthService  │       │    │  RefreshTokenService   │
    │ verify pwd   │       │    │  1. Find hash in DB    │
    │ BCrypt check │       │    │  2. Check not revoked  │
    └──────┬───────┘       │    │  3. Check not expired  │
           │               │    │  4. Rotate: mark old   │
           │               │    │     as revoked, issue  │
    ┌──────▼───────┐       │    │     new token + hash   │
    │JwtTokenProvid│       │    │  5. Reuse detected?    │
    │er.generate() │       │    │     → revoke ALL user  │
    │15-min token  │       │    │       sessions         │
    └──────┬───────┘       │    └────────────┬───────────┘
           │               │                 │
           ▼               │                 ▼
    JWT in response body   │    New JWT in body
    + SHA-256(refresh)     │    + rotated refresh cookie
      in HttpOnly cookie   │
```

**Why stateless JWT + DB-backed refresh?**

Pure stateless JWTs (no DB) cannot be revoked before expiry. DB-only sessions require a DB hit on every request. This hybrid gives us:
- Fast validation (JWT is verified cryptographically, no DB hit)
- Short exposure window (15-min access token)
- Revocability (refresh tokens are in DB and can be invalidated)
- Compromise detection (reuse detection revokes all sessions)

---

## Frontend State Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend State Layers                    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              TanStack Query Cache                  │    │
│  │   (server state: books, user profile, progress)    │    │
│  │   • Auto-refetch on window focus                   │    │
│  │   • Stale-while-revalidate                         │    │
│  │   • Infinite scroll for catalog                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Zustand Stores (UI only)              │    │
│  │   useAudioPlayerStore  — playback position, rate   │    │
│  │   useAuthStore         — current user session      │    │
│  │   useSidebarStore      — drawer open/close         │    │
│  │   useToastStore        — notification queue        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Axios Client (shared/api/client.ts)   │    │
│  │   • Attaches Bearer token from useAuthStore        │    │
│  │   • 401 interceptor → refresh → replay queue       │    │
│  │   • Mutex prevents multiple simultaneous refreshes │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Rule**: Never put server data into Zustand. Never fetch data in `useEffect`. TanStack Query is the single source of truth for anything that comes from the API.

---

## Audio Streaming Architecture

```
AudioPlayerBar (React component)
        │
        │ user presses Play / seeks to position
        ▼
useAudioPlayerStore (Zustand)
   currentChapterId, currentTime, isPlaying, playbackRate
        │
        │ HTMLAudioElement.src = /api/v1/media/stream/audio/{fileName}
        ▼
MediaController (Spring Boot)
        │
        │ reads Range: bytes=X-Y header
        ▼
MediaUploadService.getAudioResourceRegion()
        │
        │ reads file from ./uploads/audio/{uuid}.mp3
        │ returns ResourceRegion (Spring's byte-range abstraction)
        ▼
HTTP 206 Partial Content response
   Content-Range: bytes X-Y/total
   Accept-Ranges: bytes
```

**Progress sync timing:**
- Every 30 seconds while playing → `PUT /api/v1/progress/{bookId}`
- On `visibilitychange` (tab goes to background) → same endpoint
- On `pagehide` (browser closes) → `fetch(..., { keepalive: true })` or `navigator.sendBeacon`

The `keepalive: true` flag is critical — it ensures the browser sends the request even when the page is being unloaded.

---

## Security Layers

```
Request arrives
      │
      ▼
[1] Rate Limiter (Bucket4j)
      │ → 429 if limit exceeded
      ▼
[2] JwtAuthFilter
      │ → 401 if token missing / invalid / expired
      ▼
[3] Spring Security RBAC
      │ → 403 if role insufficient (@PreAuthorize)
      ▼
[4] Controller / Service validation
      │ → 400 if input invalid (Jakarta Validation)
      ▼
[5] Row-level isolation (Repository)
      │ → queries always scoped to authenticated user's ID
      ▼
[6] File system isolation (MediaUploadService)
      │ → UUID filenames, magic byte MIME check, size limits
      ▼
Business logic executes
```

Each layer is independent. Bypassing one does not bypass the others.

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Server                        │
│                                                             │
│  ┌──────────────────┐    ┌───────────────────────────────┐ │
│  │  Frontend (SPA)  │    │  Backend (Spring Boot JAR)    │ │
│  │  Vercel / CDN    │    │  Docker container             │ │
│  │  Static HTML/JS  │    │  :8080                        │ │
│  └──────────────────┘    └──────────────┬────────────────┘ │
│                                         │                   │
│                          ┌──────────────▼────────────────┐ │
│                          │   PostgreSQL 16 (Docker)      │ │
│                          │   Volume: /var/lib/postgresql │ │
│                          └───────────────────────────────┘ │
│                                                             │
│                          ┌───────────────────────────────┐ │
│                          │   ./uploads/ (bind mount)     │ │
│                          │   Persisted outside container │ │
│                          └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Current state**: Frontend on Vercel (static SPA), backend on a single Docker container + PostgreSQL via Docker Compose.

**Known limitation**: Local file storage is tied to a single server. If the backend is ever scaled horizontally, uploads must move to object storage (MinIO / S3-compatible) first.

---

## Architectural Decision Log

### ADR-001: Local file storage instead of S3

**Context**: Media uploads needed a storage solution at launch.

**Decision**: Store files locally under `./uploads/` with UUID-based filenames.

**Rationale**: Zero cost, zero config, sufficient for the initial user base. UUID filenames eliminate path traversal risk. The `MediaUploadService` abstraction means the storage backend can be swapped later without touching controllers or services.

**Consequences**: Does not scale horizontally. Must migrate to object storage before running multiple backend replicas. Accepted trade-off for early stage.

---

### ADR-002: JWT (15 min) + DB-backed refresh tokens

**Context**: Needed authentication that is revocable but doesn't require a DB hit on every request.

**Decision**: Short-lived JWT access tokens verified cryptographically, combined with long-lived opaque refresh tokens stored as SHA-256 hashes in PostgreSQL.

**Rationale**: Pure stateless JWT cannot be revoked. Pure DB sessions add latency to every request. The hybrid is the industry standard for SPAs.

**Consequences**: Requires a DB query on every token refresh (every 15 min). Acceptable — refresh is infrequent compared to API calls.

---

### ADR-003: No Redis, no Caffeine for caching

**Context**: Backend needs rate limiting (Bucket4j) but Redis adds operational complexity.

**Decision**: Use Bucket4j with Caffeine in-memory cache (`authBuckets`: 10k max, `generalBuckets`: 100k max).

**Rationale**: At the current scale, in-memory rate limiting per JVM instance is sufficient. Redis would be needed only if we run multiple backend replicas and need shared rate limit state.

**Consequences**: Rate limit state is lost on backend restart. Limits are per-instance, not globally shared across replicas. Accepted trade-off.

---

### ADR-004: Monorepo, not microservices

**Context**: Platform has distinct concerns (auth, books, media, admin).

**Decision**: Single Spring Boot service handling all concerns.

**Rationale**: Microservices add network latency, distributed tracing complexity, and deployment overhead that is not justified at this scale. A well-layered monolith is easier to develop, test, and deploy for a small team.

**Consequences**: Entire backend deploys together. Scaling requires replicating the whole service (acceptable until a clear bottleneck exists).

---

## What to Build Next (Architectural Priorities)

When these problems actually occur, here is the agreed approach:

| Problem | Solution | Trigger |
|---------|----------|---------|
| Storage fills up / multi-server | Migrate `./uploads/` → MinIO or Wasabi (S3-compatible) | 100+ GB uploads or horizontal scale |
| Audio delivery too slow | Add CDN in front of audio streaming endpoint | User complaints about buffering |
| Search becomes slow | Add PostgreSQL full-text search (`tsvector`) on `books.title` + `books.author` | > 1000 books in catalog |
| DB becomes a bottleneck | Add read replica, move `GET /books` queries to replica | > 10k concurrent users |
| Email verification needed | Add `email_verifications` table + SMTP service (Resend / SES) | Business requirement |
