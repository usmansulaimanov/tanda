-- =============================================================================
-- Migration V14: Royalty & Payouts
-- =============================================================================

-- 1. Ensure authors table has balance column
ALTER TABLE authors ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00;

-- 2. Royalty Periods table
CREATE TABLE IF NOT EXISTS royalty_periods (
    id VARCHAR(64) PRIMARY KEY,
    period_month VARCHAR(7) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    total_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    admin_expense NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_pool NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    company_share NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    royalty_pool NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_minutes BIGINT NOT NULL DEFAULT 0,
    rate_per_minute NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    admin_note TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE,
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Royalty Earnings table
CREATE TABLE IF NOT EXISTS royalty_earnings (
    id VARCHAR(64) PRIMARY KEY,
    period_id VARCHAR(64) NOT NULL REFERENCES royalty_periods(id) ON DELETE CASCADE,
    author_id VARCHAR(64) NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    book_id VARCHAR(64) REFERENCES books(id) ON DELETE SET NULL,
    minutes_listened BIGINT NOT NULL DEFAULT 0,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'CALCULATED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Payout Requests table
CREATE TABLE IF NOT EXISTS payout_requests (
    id VARCHAR(64) PRIMARY KEY,
    author_id VARCHAR(64) NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    method VARCHAR(100),
    card_or_account VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
    rejection_reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Payout Transactions table
CREATE TABLE IF NOT EXISTS payout_transactions (
    id VARCHAR(64) PRIMARY KEY,
    payout_request_id VARCHAR(64) NOT NULL REFERENCES payout_requests(id) ON DELETE CASCADE,
    reference VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_royalty_periods_month ON royalty_periods(period_month);
CREATE INDEX IF NOT EXISTS idx_royalty_earnings_period ON royalty_earnings(period_id);
CREATE INDEX IF NOT EXISTS idx_royalty_earnings_author ON royalty_earnings(author_id);
CREATE INDEX IF NOT EXISTS idx_royalty_earnings_book ON royalty_earnings(book_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_author ON payout_requests(author_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_request ON payout_transactions(payout_request_id);
