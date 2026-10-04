-- V40: Add dislikes_count to book_reviews and reaction_type to book_review_likes

ALTER TABLE book_reviews ADD COLUMN IF NOT EXISTS dislikes_count INT NOT NULL DEFAULT 0;

ALTER TABLE book_review_likes ADD COLUMN IF NOT EXISTS reaction_type VARCHAR(16) NOT NULL DEFAULT 'LIKE';
