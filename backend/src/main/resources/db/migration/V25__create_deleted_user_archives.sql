-- V25__create_deleted_user_archives.sql

CREATE TABLE IF NOT EXISTS deleted_user_archives (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    id_number VARCHAR(50),
    original_name VARCHAR(255),
    original_email VARCHAR(255),
    original_phone VARCHAR(50),
    original_username VARCHAR(100),
    original_role VARCHAR(20) NOT NULL DEFAULT 'client',
    auth_provider VARCHAR(32) DEFAULT 'LOCAL',
    registered_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_listen_seconds BIGINT DEFAULT 0,
    books_listened_count INT DEFAULT 0,
    ip_address VARCHAR(100),
    user_agent TEXT,
    delete_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_deleted_user_archives_user_id ON deleted_user_archives(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_user_archives_deleted_at ON deleted_user_archives(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_user_archives_original_email ON deleted_user_archives(original_email);
