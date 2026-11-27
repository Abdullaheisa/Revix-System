-- 040_signatures_and_contract_terms.sql
-- Adds per-user employee signatures, per-customer saved signatures, and per-company contract terms & conditions.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signature_data_url TEXT NULL;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS signature_data_url TEXT NULL;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS contract_terms_ar TEXT NULL,
  ADD COLUMN IF NOT EXISTS contract_terms_en TEXT NULL;
