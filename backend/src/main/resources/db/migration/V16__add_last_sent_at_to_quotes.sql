-- V16__add_last_sent_at_to_quotes.sql
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_quotes_last_sent_at ON quotes(last_sent_at DESC);
