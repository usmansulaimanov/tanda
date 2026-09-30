-- Migration V33: Add subscription_days to promo_codes and promo_batches for explicit separation of activation expiration vs reward subscription duration
ALTER TABLE promo_batches ADD COLUMN IF NOT EXISTS subscription_days INT DEFAULT 30;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS subscription_days INT DEFAULT 30;

-- Backfill existing promo_codes and promo_batches based on reward_type and reward_title
UPDATE promo_codes
SET subscription_days = 365
WHERE reward_type = 'subscription_1y' OR reward_title ILIKE '%12 ай%' OR reward_title ILIKE '%1 жыл%' OR reward_title ILIKE '%жылдық%';

UPDATE promo_codes
SET subscription_days = 180
WHERE reward_type = 'subscription_6m' OR reward_title ILIKE '%6 ай%';

UPDATE promo_codes
SET subscription_days = 90
WHERE reward_type = 'subscription_3m' OR reward_title ILIKE '%3 ай%';

UPDATE promo_codes
SET subscription_days = 30
WHERE reward_type = 'subscription_1m' OR (subscription_days IS NULL AND reward_type NOT IN ('discount', 'premium_access'));

UPDATE promo_codes
SET subscription_days = 36500
WHERE reward_type = 'premium_access' OR reward_title ILIKE '%мәңгі%' OR reward_title ILIKE '%вечный%';

-- Same for batches
UPDATE promo_batches
SET subscription_days = 365
WHERE reward_type = 'subscription_1y' OR reward_title ILIKE '%12 ай%' OR reward_title ILIKE '%1 жыл%' OR reward_title ILIKE '%жылдық%';

UPDATE promo_batches
SET subscription_days = 180
WHERE reward_type = 'subscription_6m' OR reward_title ILIKE '%6 ай%';

UPDATE promo_batches
SET subscription_days = 90
WHERE reward_type = 'subscription_3m' OR reward_title ILIKE '%3 ай%';

UPDATE promo_batches
SET subscription_days = 30
WHERE reward_type = 'subscription_1m' OR (subscription_days IS NULL AND reward_type NOT IN ('discount', 'premium_access'));

UPDATE promo_batches
SET subscription_days = 36500
WHERE reward_type = 'premium_access' OR reward_title ILIKE '%мәңгі%' OR reward_title ILIKE '%вечный%';
