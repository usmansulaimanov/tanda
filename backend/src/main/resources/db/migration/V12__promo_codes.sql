-- =============================================================================
-- Migration V12: Promo codes, batches, and usages
-- =============================================================================

CREATE TABLE IF NOT EXISTS promo_batches (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    reward_type VARCHAR(64) NOT NULL DEFAULT 'subscription_1m',
    reward_title VARCHAR(255) NOT NULL,
    duration_days INT NOT NULL DEFAULT 30,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    prefix VARCHAR(64) NOT NULL DEFAULT 'TANDA',
    total_codes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id VARCHAR(64) PRIMARY KEY,
    batch_id VARCHAR(64) REFERENCES promo_batches(id) ON DELETE CASCADE,
    batch_name VARCHAR(255),
    code VARCHAR(64) NOT NULL UNIQUE,
    reward_type VARCHAR(64) NOT NULL DEFAULT 'subscription_1m',
    reward_title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_days INT NOT NULL DEFAULT 30,
    discount_percent INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_uses INT NOT NULL DEFAULT 1,
    used_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_issued BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_uses (
    id VARCHAR(64) PRIMARY KEY,
    promo_code_id VARCHAR(64) NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_promo_code_user UNIQUE (promo_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_batch_id ON promo_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_promo_uses_user_id ON promo_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_uses_code_id ON promo_uses(promo_code_id);

-- Seed default batch and promo codes
INSERT INTO promo_batches (id, name, reward_type, reward_title, duration_days, expires_at, prefix, total_codes, created_at)
VALUES (
    'batch-default-001',
    '№1 Топтама: Стандартты промокодтар',
    'subscription_1m',
    '1 айлық тегін жазылым (Премиум)',
    30,
    NOW() + INTERVAL '365' DAY,
    'TANDA',
    2,
    NOW()
);

INSERT INTO promo_codes (id, batch_id, batch_name, code, reward_type, reward_title, duration_days, expires_at, max_uses, used_count, is_active, created_at, updated_at)
VALUES 
(
    'promo-001',
    'batch-default-001',
    '№1 Топтама: Стандартты промокодтар',
    'TANDA2026',
    'subscription_1m',
    '1 айлық тегін жазылым (Премиум)',
    30,
    NOW() + INTERVAL '365' DAY,
    100,
    0,
    TRUE,
    NOW(),
    NOW()
),
(
    'promo-002',
    'batch-default-001',
    '№1 Топтама: Стандартты промокодтар',
    'TANDA-VIP',
    'subscription_3m',
    '3 айлық тегін подписка',
    14,
    NOW() + INTERVAL '365' DAY,
    50,
    0,
    TRUE,
    NOW(),
    NOW()
);
