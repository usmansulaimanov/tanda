-- Users table
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    id_number VARCHAR(10) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'client' CONSTRAINT users_role_check CHECK (role IN ('admin', 'client')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);

-- Saved books table
CREATE TABLE saved_books (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, book_id)
);

CREATE INDEX idx_saved_books_user_id ON saved_books(user_id);


