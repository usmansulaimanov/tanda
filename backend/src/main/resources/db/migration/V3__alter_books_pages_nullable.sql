-- Allow nullable pages in books table for audiobooks without page counts
ALTER TABLE books ALTER COLUMN pages DROP NOT NULL;
