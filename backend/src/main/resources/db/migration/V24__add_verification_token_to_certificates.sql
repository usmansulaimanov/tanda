-- V24__add_verification_token_to_certificates.sql

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64);

-- Backfill existing certificates with unique token based on id
UPDATE certificates 
SET verification_token = CONCAT('tok_', id)
WHERE verification_token IS NULL;

ALTER TABLE certificates ALTER COLUMN verification_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_token ON certificates(verification_token);
