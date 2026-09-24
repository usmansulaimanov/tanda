-- V19: Add electronic book (e-book) fields to books table

ALTER TABLE books ADD COLUMN IF NOT EXISTS has_ebook BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE books ADD COLUMN IF NOT EXISTS ebook_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS ebook_format VARCHAR(32);
