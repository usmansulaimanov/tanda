-- V11__content_news_messages_quotes.sql

-- 1. News Articles
CREATE TABLE IF NOT EXISTS news (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    image_url TEXT,
    images TEXT,
    link_url TEXT,
    link_text VARCHAR(255),
    author_name VARCHAR(255) DEFAULT 'Tanda News',
    views_count INT DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published, published_at DESC);

-- 2. Messages
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    sender_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    sender_name VARCHAR(255) NOT NULL DEFAULT 'Tanda',
    sender_role VARCHAR(64) NOT NULL DEFAULT 'admin',
    recipient_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(32) NOT NULL DEFAULT 'all',
    target_user_ids TEXT,
    target_user_names TEXT,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(32) DEFAULT 'normal',
    book_id VARCHAR(64) REFERENCES books(id) ON DELETE SET NULL,
    book_title VARCHAR(255),
    news_id VARCHAR(64) REFERENCES news(id) ON DELETE SET NULL,
    news_title VARCHAR(255),
    can_reader_delete BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    read_by_user_ids TEXT,
    deleted_by_user_ids TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_target_type ON messages(target_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 3. Quotes
CREATE TABLE IF NOT EXISTS quotes (
    id VARCHAR(64) PRIMARY KEY,
    text TEXT NOT NULL,
    author VARCHAR(255) NOT NULL DEFAULT 'Халық даналығы',
    book_id VARCHAR(64) REFERENCES books(id) ON DELETE SET NULL,
    book_title VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sent_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_active ON quotes(is_active);
