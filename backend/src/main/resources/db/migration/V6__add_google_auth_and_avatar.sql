-- V6: Add auth_provider and avatar_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update auth_provider for existing google users if any
UPDATE users SET auth_provider = 'GOOGLE' WHERE google_id IS NOT NULL AND auth_provider = 'LOCAL';
