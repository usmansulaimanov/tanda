-- =============================================================================
-- Migration V13: Premium entitlements and birthday gifts
-- =============================================================================

CREATE TABLE IF NOT EXISTS premium_entitlements (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(64) NOT NULL, -- 'BIRTHDAY_GIFT', 'PROMO_CODE', 'MANUAL_ADMIN', 'SUBSCRIPTION'
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    granted_by VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS birthday_gifts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gift_year INT NOT NULL,
    gift_type VARCHAR(64) NOT NULL DEFAULT 'PREMIUM_30',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_birthday_gift UNIQUE (user_id, gift_year, gift_type)
);

CREATE INDEX IF NOT EXISTS idx_premium_entitlements_user_id ON premium_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_entitlements_expires_at ON premium_entitlements(expires_at);
CREATE INDEX IF NOT EXISTS idx_birthday_gifts_user_year ON birthday_gifts(user_id, gift_year);
