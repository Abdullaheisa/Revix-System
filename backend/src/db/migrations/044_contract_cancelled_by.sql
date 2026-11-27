-- ==============================================================================
-- 044_contract_cancelled_by.sql
-- Track which user cancelled a rental contract and when.
-- ==============================================================================

ALTER TABLE rental_contracts
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
