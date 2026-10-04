-- V39: Add rating fields to books and create book_reviews table

ALTER TABLE books ADD COLUMN IF NOT EXISTS average_rating DOUBLE PRECISION DEFAULT 0.00;
ALTER TABLE books ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS book_reviews (
    id BIGSERIAL PRIMARY KEY,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_book_user_review UNIQUE (book_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_book_reviews_book_id ON book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_user_id ON book_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_created_at ON book_reviews(created_at DESC);

CREATE TABLE IF NOT EXISTS book_review_likes (
    review_id BIGINT NOT NULL REFERENCES book_reviews(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_book_review_likes_user_id ON book_review_likes(user_id);
