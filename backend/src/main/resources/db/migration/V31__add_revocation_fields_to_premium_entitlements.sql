-- Migration V31: Add revocation fields to premium_entitlements
ALTER TABLE premium_entitlements ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(64);
ALTER TABLE premium_entitlements ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE premium_entitlements ADD COLUMN IF NOT EXISTS revoke_reason TEXT;
