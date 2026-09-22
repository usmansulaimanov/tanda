-- V9: Admin Users, Authors, Managers, and Reserved Usernames

-- 1. Extend users table
ALTER TABLE users ALTER COLUMN id_number TYPE VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS duty VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_message TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_message_days INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_message_active BOOLEAN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Update role constraint to allow 'author'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_role;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'client', 'author'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Reserved Usernames table
CREATE TABLE IF NOT EXISTS reserved_usernames (
    username VARCHAR(100) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO reserved_usernames (username) VALUES
('admin'),
('administrator'),
('tanda'),
('support'),
('root'),
('system'),
('moderator'),
('help');

-- 3. Manager Permissions table
CREATE TABLE IF NOT EXISTS manager_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    UNIQUE (user_id, permission)
);
CREATE INDEX IF NOT EXISTS idx_manager_permissions_user_id ON manager_permissions(user_id);

-- 4. Authors and Author Books tables
CREATE TABLE IF NOT EXISTS authors (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    display_name VARCHAR(255) NOT NULL,
    bio TEXT,
    phone VARCHAR(50),
    id_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS author_books (
    id BIGSERIAL PRIMARY KEY,
    author_id VARCHAR(64) NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    book_id VARCHAR(64) NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    royalty_share NUMERIC(5,2) NOT NULL DEFAULT 100.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (author_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_author_books_author_id ON author_books(author_id);
CREATE INDEX IF NOT EXISTS idx_author_books_book_id ON author_books(book_id);
