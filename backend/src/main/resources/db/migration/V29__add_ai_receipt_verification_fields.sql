-- =============================================================================
-- Migration V29: Add AI receipt verification and duplicate tracking fields
-- =============================================================================

ALTER TABLE subscription_payment_requests ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(128);
ALTER TABLE subscription_payment_requests ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE subscription_payment_requests ADD COLUMN IF NOT EXISTS ai_status VARCHAR(32);
ALTER TABLE subscription_payment_requests ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION;
ALTER TABLE subscription_payment_requests ADD COLUMN IF NOT EXISTS ai_extracted_data TEXT;
ALTER TABLE subscription_payment_requests ADD COLUMN IF NOT EXISTS ai_rejection_reason TEXT;
ALTER TABLE subscription_payment_requests ADD COLUMN IF NOT EXISTS receipt_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_sub_payment_requests_receipt_number ON subscription_payment_requests(receipt_number);
CREATE INDEX IF NOT EXISTS idx_sub_payment_requests_receipt_hash ON subscription_payment_requests(receipt_hash);
CREATE INDEX IF NOT EXISTS idx_sub_payment_requests_ai_status ON subscription_payment_requests(ai_status);
