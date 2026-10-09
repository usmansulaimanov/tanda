-- V41__reading_tracker_and_groups.sql
-- Reading tracker, groups, competitions, invitations, and monthly archive

-- 1. Alter Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_group_invites BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_reading_seconds BIGINT DEFAULT 0 NOT NULL;

-- 2. Reading Groups Table
CREATE TABLE IF NOT EXISTS reading_groups (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    creator_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_members INT DEFAULT 5 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reading_groups_creator ON reading_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_reading_groups_is_public ON reading_groups(is_public);

-- 3. Reading Group Members Table
CREATE TABLE IF NOT EXISTS reading_group_members (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64) NOT NULL REFERENCES reading_groups(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER' NOT NULL, -- 'CREATOR', 'ADMIN', 'MEMBER'
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL, -- 'ACTIVE', 'BANNED'
    monthly_reading_seconds BIGINT DEFAULT 0 NOT NULL,
    total_reading_seconds BIGINT DEFAULT 0 NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uk_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON reading_group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON reading_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_ranking ON reading_group_members(group_id, monthly_reading_seconds DESC);

-- 4. Reading Group Invitations Table
CREATE TABLE IF NOT EXISTS reading_group_invitations (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64) NOT NULL REFERENCES reading_groups(id) ON DELETE CASCADE,
    inviter_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    rejected_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON reading_group_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email_status ON reading_group_invitations(invitee_email, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee_id ON reading_group_invitations(invitee_id);

-- 5. Reading Sessions Table
CREATE TABLE IF NOT EXISTS reading_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id VARCHAR(64) REFERENCES reading_groups(id) ON DELETE SET NULL,
    book_id BIGINT REFERENCES books(id) ON DELETE SET NULL,
    book_title VARCHAR(255),
    session_type VARCHAR(20) DEFAULT 'STOPWATCH' NOT NULL, -- 'STOPWATCH', 'TIMER'
    duration_seconds BIGINT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user ON reading_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_group ON reading_sessions(group_id, created_at);

-- 6. Reading Group Monthly Archives Table
CREATE TABLE IF NOT EXISTS reading_group_monthly_archives (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64) NOT NULL REFERENCES reading_groups(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, -- e.g. '2026-09'
    winner_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    winner_name VARCHAR(255),
    winner_reading_seconds BIGINT DEFAULT 0 NOT NULL,
    total_group_reading_seconds BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uk_group_monthly_archive UNIQUE (group_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_group_monthly_archive_group ON reading_group_monthly_archives(group_id, year_month DESC);
