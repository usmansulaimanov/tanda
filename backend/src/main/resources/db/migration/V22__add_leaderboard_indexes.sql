-- V22__add_leaderboard_indexes.sql
-- Add indexes to accelerate leaderboard and time-range aggregations on audio_sessions

CREATE INDEX IF NOT EXISTS idx_audio_sessions_leaderboard ON audio_sessions (started_at, user_id, valid_seconds);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_user_started ON audio_sessions (user_id, started_at);
