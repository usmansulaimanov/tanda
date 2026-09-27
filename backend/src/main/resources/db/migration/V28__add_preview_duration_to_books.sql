-- Migration: Add preview_duration_minutes to books table with default 15 minutes
ALTER TABLE books ADD COLUMN IF NOT EXISTS preview_duration_minutes INT DEFAULT 15;
UPDATE books SET preview_duration_minutes = 15 WHERE preview_duration_minutes IS NULL;
