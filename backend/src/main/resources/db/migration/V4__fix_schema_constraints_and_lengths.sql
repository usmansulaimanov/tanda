-- Fix schema constraints and column lengths
-- 1. Enforce uniqueness on reading progress per user and book to prevent race conditions
ALTER TABLE reading_progress ADD CONSTRAINT uq_reading_progress_user_book UNIQUE (user_id, book_id);

-- 2. Alter column types to TEXT to support Base64 data URLs and long asset links without length limits
ALTER TABLE books ALTER COLUMN cover_image TYPE TEXT;
ALTER TABLE books ALTER COLUMN audio_url TYPE TEXT;
ALTER TABLE audio_chapters ALTER COLUMN audio_url TYPE TEXT;
