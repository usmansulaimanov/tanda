-- V10__personal_shelf_and_audio_sessions.sql

-- 1. Personal Reading Shelf: user_books
CREATE TABLE IF NOT EXISTS user_books (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL, -- 'reading', 'completed', 'want_to_read'
    current_page INT DEFAULT 1,
    total_pages INT,
    progress_percent DOUBLE PRECISION DEFAULT 0.0,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_books_user_book UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON user_books(book_id);
CREATE INDEX IF NOT EXISTS idx_user_books_user_status ON user_books(user_id, status);

-- 2. Audio Sessions: audio_sessions
CREATE TABLE IF NOT EXISTS audio_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_id VARCHAR(64) REFERENCES audio_chapters(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    valid_seconds INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_audio_sessions_user_id ON audio_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_book_id ON audio_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_started_at ON audio_sessions(started_at);

-- 3. Audio Listen Events: audio_listen_events
CREATE TABLE IF NOT EXISTS audio_listen_events (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES audio_sessions(id) ON DELETE CASCADE,
    position_seconds INT NOT NULL,
    duration_seconds INT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_listen_events_session_id ON audio_listen_events(session_id);
CREATE INDEX IF NOT EXISTS idx_audio_listen_events_recorded_at ON audio_listen_events(recorded_at);

-- 4. Audio Daily Statistics (Aggregates for ranking & author royalties)
CREATE TABLE IF NOT EXISTS audio_daily_stats (
    id VARCHAR(64) PRIMARY KEY,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    listen_count INT DEFAULT 0,
    total_seconds BIGINT DEFAULT 0,
    unique_listeners INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_audio_daily_stats_book_date UNIQUE (book_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_audio_daily_stats_book_date ON audio_daily_stats(book_id, stat_date);
