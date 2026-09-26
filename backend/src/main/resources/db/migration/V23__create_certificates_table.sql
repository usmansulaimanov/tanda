-- V23__create_certificates_table.sql

CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(64) PRIMARY KEY,
    certificate_number VARCHAR(64) NOT NULL UNIQUE,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    recipient_id_number VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64) DEFAULT 'READER_TOP_10',
    issued_at DATE NOT NULL,
    issuer_name VARCHAR(255) DEFAULT 'Tanda Platform',
    pdf_url TEXT,
    image_url TEXT,
    status VARCHAR(32) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_cert_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_recipient_user_id ON certificates(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON certificates(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
