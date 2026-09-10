CREATE TABLE books (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64) NOT NULL,
    pages INT NOT NULL,
    has_audio BOOLEAN NOT NULL DEFAULT FALSE,
    audio_narrator VARCHAR(255),
    audio_duration VARCHAR(64),
    audio_url VARCHAR(1024),
    cover_image VARCHAR(1024),
    is_free BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    gradient VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audio_chapters (
    id VARCHAR(64) PRIMARY KEY,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    audio_url VARCHAR(1024) NOT NULL,
    duration VARCHAR(64) NOT NULL,
    chapter_order INT NOT NULL
);

CREATE TABLE reading_progress (
    id VARCHAR(64) PRIMARY KEY,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    current_page INT DEFAULT 1,
    current_audio_chapter_id VARCHAR(64),
    current_audio_time INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_audio_chapters_book_id ON audio_chapters(book_id);
CREATE INDEX idx_reading_progress_user_book ON reading_progress(user_id, book_id);
