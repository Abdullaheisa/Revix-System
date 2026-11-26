-- ==============================================================================
-- 038_customer_national_id_expiry.sql
-- Add national_id_expiry date column to customers table.
-- ==============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS national_id_expiry DATE;
