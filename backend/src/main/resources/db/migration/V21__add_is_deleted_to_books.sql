-- V21__add_is_deleted_to_books.sql
-- Add is_deleted column to books table for soft delete functionality
ALTER TABLE books ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_books_is_deleted ON books(is_deleted);
