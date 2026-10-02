-- V36: Bonus and Gamification System
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_balance INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_bonus_at DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_listened_seconds BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS bonus_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    type VARCHAR(32) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonus_tx_user_created ON bonus_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bonus_tx_type_created ON bonus_transactions(type, created_at DESC);

-- Default system settings for bonus system
INSERT INTO system_settings (setting_key, setting_value, updated_at)
VALUES 
    ('bonus_system_enabled', 'true', NOW()),
    ('bonus_currency_name', 'Бонус', NOW()),
    ('bonus_signup_enabled', 'true', NOW()),
    ('bonus_signup_amount', '100', NOW()),
    ('bonus_daily_login_enabled', 'true', NOW()),
    ('bonus_daily_login_amount', '10', NOW()),
    ('bonus_listening_enabled', 'true', NOW()),
    ('bonus_listening_amount', '60', NOW()),
    ('bonus_listening_interval_hours', '1', NOW()),
    ('bonus_review_enabled', 'true', NOW()),
    ('bonus_review_amount', '5', NOW());
