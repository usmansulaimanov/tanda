-- V5: Allow Google OAuth users (no password)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add google_id column for linking Google accounts
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
