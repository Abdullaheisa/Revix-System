-- Phase 5 Extension: Global Enterprise Payment Terms for Vendors & Purchasing
ALTER TABLE vendors
    ADD COLUMN IF NOT EXISTS payment_terms_type VARCHAR(30) DEFAULT 'net_terms',
    ADD COLUMN IF NOT EXISTS payment_terms_config VARCHAR(100);
