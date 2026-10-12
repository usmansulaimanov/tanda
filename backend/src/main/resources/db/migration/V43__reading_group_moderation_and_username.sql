-- V43__reading_group_moderation_and_username.sql
-- Add moderation status, username, verification badge, and admin note to reading_groups

ALTER TABLE reading_groups ADD COLUMN IF NOT EXISTS username VARCHAR(64);
ALTER TABLE reading_groups ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'APPROVED' NOT NULL;
ALTER TABLE reading_groups ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE reading_groups ADD COLUMN IF NOT EXISTS admin_note TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uk_reading_groups_username ON reading_groups(username);
CREATE INDEX IF NOT EXISTS idx_reading_groups_status ON reading_groups(status);
