-- ==============================================================================
-- 046_contract_return_details.sql
-- Track receiving employee, actual rented days, and uploaded return contract scan.
-- ==============================================================================

ALTER TABLE rental_contracts
  ADD COLUMN IF NOT EXISTS received_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actual_days INTEGER,
  ADD COLUMN IF NOT EXISTS return_contract_image_url TEXT;
