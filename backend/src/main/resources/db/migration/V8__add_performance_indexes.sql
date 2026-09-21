-- V8: Add performance indexes for books, audio chapters, saved books, reading progress, and refresh sessions

CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_is_archived ON books(is_archived);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_chapters_book_order ON audio_chapters(book_id, chapter_order ASC);
CREATE INDEX IF NOT EXISTS idx_saved_books_user ON saved_books(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
