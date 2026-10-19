-- V44__ebook_reading_sessions_and_royalty_rates.sql
-- Add e-book reading session tracking, separate daily reading stats, and differential royalty rates (max cap 10 KZT, e-book 0.5x coefficient)

CREATE TABLE IF NOT EXISTS ebook_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    book_id VARCHAR(64) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    valid_seconds INT NOT NULL DEFAULT 0,
    credited_seconds INT NOT NULL DEFAULT 0,
    current_page INT NOT NULL DEFAULT 0,
    total_pages INT NOT NULL DEFAULT 0,
    last_cfi VARCHAR(512),
    interaction_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ebook_sessions_book_started ON ebook_sessions(book_id, started_at);
CREATE INDEX IF NOT EXISTS idx_ebook_sessions_user_started ON ebook_sessions(user_id, started_at);

ALTER TABLE audio_daily_stats ADD COLUMN IF NOT EXISTS reading_seconds BIGINT NOT NULL DEFAULT 0;
ALTER TABLE audio_daily_stats ADD COLUMN IF NOT EXISTS read_count INT NOT NULL DEFAULT 0;

ALTER TABLE author_daily_book_stats ADD COLUMN IF NOT EXISTS reading_seconds BIGINT NOT NULL DEFAULT 0;
ALTER TABLE author_daily_book_stats ADD COLUMN IF NOT EXISTS read_count INT NOT NULL DEFAULT 0;

ALTER TABLE royalty_periods ADD COLUMN IF NOT EXISTS total_reading_minutes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE royalty_periods ADD COLUMN IF NOT EXISTS max_rate_per_minute NUMERIC(10, 4) NOT NULL DEFAULT 10.0000;
ALTER TABLE royalty_periods ADD COLUMN IF NOT EXISTS ebook_rate_coefficient NUMERIC(5, 2) NOT NULL DEFAULT 0.50;
ALTER TABLE royalty_periods ADD COLUMN IF NOT EXISTS ebook_rate_per_minute NUMERIC(10, 4) NOT NULL DEFAULT 0.0000;

ALTER TABLE royalty_earnings ADD COLUMN IF NOT EXISTS minutes_read BIGINT NOT NULL DEFAULT 0;
