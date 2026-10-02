-- Migration V34: Add independent status boolean flags to user_books
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS is_reading BOOLEAN DEFAULT FALSE;
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE user_books ADD COLUMN IF NOT EXISTS is_want_to_read BOOLEAN DEFAULT FALSE;

-- Backfill existing records based on status
UPDATE user_books SET is_reading = TRUE WHERE status = 'reading';
UPDATE user_books SET is_completed = TRUE WHERE status = 'completed';
UPDATE user_books SET is_want_to_read = TRUE WHERE status = 'want_to_read';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_books_is_reading ON user_books(user_id, is_reading);
CREATE INDEX IF NOT EXISTS idx_user_books_is_completed ON user_books(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_books_is_want_to_read ON user_books(user_id, is_want_to_read);
