-- Migration V35: Add spine_color to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS spine_color VARCHAR(16);
