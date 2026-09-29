-- V32__add_device_and_geo_to_refresh_tokens.sql
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_name VARCHAR(128);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_type VARCHAR(32);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS location VARCHAR(128);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revocation_reason VARCHAR(64);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked ON refresh_tokens(user_id, revoked);
