-- =============================================================================
-- Migration V15: Enforce Single Author per Book, Realtime Stats & Daily Limits
-- =============================================================================

-- 1. Extend author_books table with active status & timestamps
ALTER TABLE author_books ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE author_books ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE author_books ADD COLUMN IF NOT EXISTS unassigned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_author_books_active_author ON author_books(author_id, is_active);
CREATE INDEX IF NOT EXISTS idx_author_books_active_book ON author_books(book_id, is_active);

-- 2. Extend audio_sessions with credited_seconds
ALTER TABLE audio_sessions ADD COLUMN IF NOT EXISTS credited_seconds INT NOT NULL DEFAULT 0;

-- 3. User Daily Audio Limits table (tracks 8 hours content cap per user per day)
CREATE TABLE IF NOT EXISTS user_daily_audio_limits (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    total_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_daily_audio_limits UNIQUE (user_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_audio_limits_user_date ON user_daily_audio_limits(user_id, stat_date);

-- 4. Author Daily Book Stats table (immutable historical credit per author per book per day)
CREATE TABLE IF NOT EXISTS author_daily_book_stats (
    id VARCHAR(64) PRIMARY KEY,
    author_id VARCHAR(64) NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    total_seconds BIGINT NOT NULL DEFAULT 0,
    listen_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_author_daily_book_stats UNIQUE (author_id, book_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_author_daily_book_stats_author_date ON author_daily_book_stats(author_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_author_daily_book_stats_book_date ON author_daily_book_stats(book_id, stat_date);
