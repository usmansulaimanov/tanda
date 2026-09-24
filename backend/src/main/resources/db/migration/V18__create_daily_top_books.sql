-- V18: Create daily top books snapshot table for the Daily Leaderboard

CREATE TABLE IF NOT EXISTS daily_top_books (
    id VARCHAR(64) PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    rank INT NOT NULL,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    today_seconds BIGINT NOT NULL DEFAULT 0,
    today_listens BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_daily_top_books_date_rank UNIQUE (snapshot_date, rank)
);

CREATE INDEX IF NOT EXISTS idx_daily_top_books_date ON daily_top_books(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_daily_top_books_book ON daily_top_books(book_id);
