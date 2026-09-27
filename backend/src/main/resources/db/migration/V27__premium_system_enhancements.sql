-- =============================================================================
-- Migration V27: Subscription payment requests and system settings
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscription_payment_requests (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(64) NOT NULL,
    plan_days INT NOT NULL DEFAULT 30,
    amount_kzt INT NOT NULL DEFAULT 0,
    receipt_url TEXT,
    phone_or_account VARCHAR(64),
    notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    reviewed_by VARCHAR(64),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (setting_key, setting_value, updated_at)
VALUES 
    ('open_access_mode', 'false', NOW()),
    ('audio_ad_enabled', 'false', NOW()),
    ('audio_ad_url', '', NOW()),
    ('audio_ad_title', 'Tanda Premium — Жарнамасыз тыңдаңыз', NOW()),
    ('kaspi_phone', '+7 (777) 000-00-00', NOW()),
    ('kaspi_recipient_name', 'Tanda', NOW()),
    ('price_1_month', '1490', NOW()),
    ('price_3_months', '3990', NOW()),
    ('price_1_year', '11990', NOW());

CREATE INDEX IF NOT EXISTS idx_sub_payment_requests_user_id ON subscription_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_payment_requests_status ON subscription_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_sub_payment_requests_created_at ON subscription_payment_requests(created_at);
